import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ExperienceService, HostedExperience } from '../../core/services/experience.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { IconComponent } from '../../shared/components/icon/icon.component';
import {
  ButtonComponent,
  ButtonLinkDirective,
  AlertComponent,
  PageHeaderComponent,
  EmptyStateComponent,
  StatusBadgeComponent,
  DialogComponent,
} from '../../shared/ui';

@Component({
  selector: 'app-host-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    TranslatePipe,
    IconComponent,
    ButtonComponent,
    ButtonLinkDirective,
    AlertComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    DialogComponent,
  ],
  templateUrl: './host-dashboard.component.html',
})
export class HostDashboardComponent implements OnInit {
  private readonly api = inject(ExperienceService);
  readonly i18n = inject(I18nService);
  readonly items = signal<HostedExperience[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly deleting = signal<HostedExperience | null>(null);
  readonly activeCount = computed(
    () => this.items().filter((item) => ['OPEN', 'CONFIRMED', 'LIVE'].includes(item.status)).length,
  );
  readonly seats = computed(() => this.items().reduce((sum, item) => sum + item.reserved_slots, 0));
  deleteTrigger: HTMLElement | null = null;
  ngOnInit(): void {
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .getMyExperiences()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.items.set(items),
        error: () => this.error.set(this.i18n.translate('host.loadError')),
      });
  }
  requestDelete(item: HostedExperience, event: Event): void {
    this.deleteTrigger = event.currentTarget as HTMLElement;
    this.deleting.set(item);
  }
  confirmDelete(): void {
    const item = this.deleting();
    if (!item || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .deleteExperience(item.id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.items.update((items) => items.filter((row) => row.id !== item.id));
          this.deleting.set(null);
        },
        error: (err) => {
          this.deleting.set(null);
          this.error.set(err.error?.detail ?? this.i18n.translate('host.deleteError'));
        },
      });
  }
}
