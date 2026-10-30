import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ButtonComponent, ButtonLinkDirective } from '../../../shared/ui/button';
import { FormFieldComponent, InputDirective } from '../../../shared/ui/form-field';
import {
  AlertComponent,
  PageHeaderComponent,
  StatusBadgeComponent,
} from '../../../shared/ui/feedback';
import { I18nService } from '../../../core/services/i18n.service';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatchingService } from '../../../core/services/matching.service';
import { MatchingGroup } from '../../../core/models/matching.model';

@Component({
  selector: 'app-matching-groups',
  imports: [
    TranslatePipe,
    IconComponent,
    ButtonComponent,
    ButtonLinkDirective,
    FormFieldComponent,
    InputDirective,
    AlertComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
    DatePipe,
    PercentPipe,
    FormsModule,
    RouterLink,
  ],
  templateUrl: './matching-groups.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchingGroupsComponent {
  readonly i18n = inject(I18nService);
  private readonly api = inject(MatchingService);
  private readonly destroyRef = inject(DestroyRef);
  readonly experienceId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  readonly group = signal<MatchingGroup | null>(null);
  readonly error = signal('');
  readonly busy = signal(false);
  availableFrom = '';
  availableTo = '';
  zone = '';
  private sequence = 0;
  constructor() {
    timer(0, 15000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (!this.busy()) this.load();
      });
  }
  load(): void {
    const request = ++this.sequence;
    this.api
      .getGroupStatus(this.experienceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (value) => {
          if (request === this.sequence) {
            this.group.set(value);
            this.error.set('');
          }
        },
        error: (err) => {
          if (request === this.sequence && err.status !== 404)
            this.error.set(err.error?.detail ?? this.i18n.translate('matching.loadError'));
        },
      });
  }
  onJoinQuorum(): void {
    if (this.busy()) return;
    if (!!this.availableFrom !== !!this.availableTo) {
      this.error.set(this.i18n.translate('matching.availabilityError'));
      return;
    }
    this.busy.set(true);
    this.error.set('');
    ++this.sequence;
    this.api
      .applyForMatching(this.experienceId, {
        ...(this.availableFrom
          ? {
              available_from: new Date(this.availableFrom + ':00-04:00').toISOString(),
              available_to: new Date(this.availableTo + ':00-04:00').toISOString(),
            }
          : {}),
        ...(this.zone.trim() ? { preferred_zone: this.zone.trim() } : {}),
      })
      .subscribe({
        next: (value) => {
          this.group.set(value);
          this.busy.set(false);
        },
        error: (err) => {
          this.error.set(err.error?.detail ?? this.i18n.translate('matching.joinError'));
          this.busy.set(false);
        },
      });
  }
  leave(): void {
    if (this.busy()) return;
    this.busy.set(true);
    ++this.sequence;
    this.api.leave(this.experienceId).subscribe({
      next: () => {
        this.group.set(null);
        this.busy.set(false);
        this.load();
      },
      error: (err) => {
        this.error.set(err.error?.detail ?? this.i18n.translate('matching.leaveError'));
        this.busy.set(false);
      },
    });
  }
}
