import { AuthService } from '../../core/services/auth.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { I18nService } from '../../core/services/i18n.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ButtonComponent, ButtonLinkDirective } from '../../shared/ui/button';
import { AlertComponent, EmptyStateComponent, PageHeaderComponent } from '../../shared/ui/feedback';
import { Component, ChangeDetectionStrategy, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { API_CONFIG } from '../../core/config/api.config';

interface Notice {
  id: string;
  experience_id: string;
  kind: string;
  message: string;
  created_at: string;
  read_at?: string;
}

/** La bandeja consulta cada 30 segundos y recupera avisos persistidos tras reconectar. */
@Component({
  selector: 'app-notifications',
  imports: [
    DatePipe,
    RouterLink,
    TranslatePipe,
    IconComponent,
    ButtonComponent,
    ButtonLinkDirective,
    AlertComponent,
    EmptyStateComponent,
    PageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notifications.component.html',
})
export class NotificationsComponent {
  private readonly auth = inject(AuthService);
  experienceLink(item: Notice): string[] {
    if (this.auth.isAttendee()) return ['/experiences', item.experience_id];
    return [this.auth.isHost() ? '/host' : this.auth.isAdmin() ? '/admin' : '/profile'];
  }

  readonly i18n = inject(I18nService);
  readonly loading = signal(false);
  readonly readBusy = signal('');
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  readonly items = signal<Notice[]>([]);
  readonly error = signal('');
  offset = 0;
  private sequence = 0;
  constructor() {
    timer(0, 30000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.load());
  }
  load(): void {
    const request = ++this.sequence;
    this.loading.set(true);
    this.http
      .get<Notice[]>(`${API_CONFIG.baseUrl}/notifications`, {
        params: { limit: 50, offset: this.offset },
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          if (request === this.sequence) {
            this.loading.set(false);
            this.items.set(items);
            this.error.set('');
          }
        },
        error: () => {
          if (request === this.sequence) {
            this.loading.set(false);
            this.error.set(this.i18n.translate('notices.connectionError'));
          }
        },
      });
  }
  page(direction: number): void {
    this.offset = Math.max(0, this.offset + 50 * direction);
    this.load();
  }
  read(item: Notice): void {
    if (this.readBusy()) return;
    this.readBusy.set(item.id);
    this.http.patch<Notice>(`${API_CONFIG.baseUrl}/notifications/${item.id}/read`, {}).subscribe({
      next: (value) => {
        this.readBusy.set('');
        this.items.update((items) =>
          items.map((current) => (current.id === value.id ? value : current)),
        );
      },
      error: () => {
        this.readBusy.set('');
        this.error.set(this.i18n.translate('notices.readError'));
      },
    });
  }
}
