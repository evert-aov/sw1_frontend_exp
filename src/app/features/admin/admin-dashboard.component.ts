import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';
import { AdminService, PlatformOverview } from '../../core/services/admin.service';
import { Experience } from '../../core/models/experience.model';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import {
  ButtonComponent,
  ButtonLinkDirective,
  AlertComponent,
  PageHeaderComponent,
  EmptyStateComponent,
  StatusBadgeComponent,
} from '../../shared/ui';

@Component({
  selector: 'app-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    TranslatePipe,
    ButtonComponent,
    ButtonLinkDirective,
    AlertComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
  ],
  template: `<section class="space-y-6">
    <app-page-header
      [eyebrow]="'workspace.platform' | translate"
      [title]="'admin.title' | translate"
      [description]="'admin.description' | translate"
      ><button appButton variant="secondary" [busy]="loading()" (click)="load()">
        {{ 'ui.refresh' | translate }}</button
      ><a appButton variant="primary" routerLink="/admin/users">{{
        'workspace.users' | translate
      }}</a></app-page-header
    >
    @if (error()) {
      <app-alert tone="error">{{ error() }}</app-alert>
    }
    @if (overview(); as stats) {
      <dl class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="ui-stat">
          <dt>{{ 'admin.users' | translate }}</dt>
          <dd>{{ stats.users }}</dd>
        </div>
        <div class="ui-stat">
          <dt>{{ 'admin.activeUsers' | translate }}</dt>
          <dd>{{ stats.active_users }}</dd>
        </div>
        <div class="ui-stat">
          <dt>{{ 'admin.hosts' | translate }}</dt>
          <dd>{{ stats.hosts }}</dd>
        </div>
        <div class="ui-stat">
          <dt>{{ 'admin.attendees' | translate }}</dt>
          <dd>{{ stats.attendees }}</dd>
        </div>
        <div class="ui-stat">
          <dt>{{ 'admin.venues' | translate }}</dt>
          <dd>{{ stats.venues }}</dd>
        </div>
        <div class="ui-stat">
          <dt>{{ 'admin.experiences' | translate }}</dt>
          <dd>{{ stats.experiences }}</dd>
        </div>
        <div class="ui-stat">
          <dt>{{ 'admin.paidBookings' | translate }}</dt>
          <dd>{{ stats.paid_bookings }}</dd>
        </div>
      </dl>
    }
    <section class="ui-surface ui-panel space-y-5">
      <h2 class="ui-section-title">{{ 'admin.experiences' | translate }}</h2>
      @for (item of items(); track item.id) {
        <article class="ui-divider pt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="font-semibold">{{ item.title }}</h3>
            <p class="ui-muted text-sm mt-1">
              {{ item.host_name }} ·
              {{ item.event_date | date: 'medium' : undefined : i18n.currentLang() }}
            </p>
          </div>
          <app-status-badge [value]="item.status" />
        </article>
      } @empty {
        <app-empty-state
          icon="calendar"
          [title]="(loading() ? 'ui.loading' : 'admin.noExperiences') | translate"
        />
      }
      <nav class="ui-actions justify-between">
        <button appButton variant="secondary" [disabled]="!offset || loading()" (click)="page(-1)">
          {{ 'ui.previous' | translate }}</button
        ><button
          appButton
          variant="secondary"
          [disabled]="items().length < 25 || loading()"
          (click)="page(1)"
        >
          {{ 'ui.next' | translate }}
        </button>
      </nav>
    </section>
  </section>`,
})
export class AdminDashboardComponent implements OnInit {
  private readonly api = inject(AdminService);
  readonly i18n = inject(I18nService);
  readonly overview = signal<PlatformOverview | null>(null);
  readonly items = signal<Experience[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  offset = 0;
  ngOnInit(): void {
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({ overview: this.api.overview(), experiences: this.api.experiences(this.offset) })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (value) => {
          this.overview.set(value.overview);
          this.items.set(value.experiences);
        },
        error: () => this.error.set(this.i18n.translate('admin.loadError')),
      });
  }
  page(direction: number): void {
    this.offset = Math.max(0, this.offset + 25 * direction);
    this.load();
  }
}
