import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ButtonComponent, ButtonLinkDirective } from '../../../shared/ui/button';
import { FormFieldComponent, InputDirective } from '../../../shared/ui/form-field';
import {
  AlertComponent,
  PageHeaderComponent,
  EmptyStateComponent,
} from '../../../shared/ui/feedback';
import { I18nService } from '../../../core/services/i18n.service';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, catchError, forkJoin, of, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatchingService } from '../../../core/services/matching.service';
import { SuggestedExperience, UnmetDemandInsight } from '../../../core/models/matching.model';

/** Demanda observada: solicitudes sin oferta en 30 días, sin pronósticos inventados. */
@Component({
  selector: 'app-demand-dashboard',
  imports: [
    TranslatePipe,
    IconComponent,
    ButtonComponent,
    ButtonLinkDirective,
    FormFieldComponent,
    InputDirective,
    AlertComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    DecimalPipe,
    FormsModule,
    RouterLink,
  ],
  templateUrl: './demand-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemandDashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  private readonly api = inject(MatchingService);
  private readonly requests = new Subject<string>();
  readonly insights = signal<UnmetDemandInsight[]>([]);
  readonly suggestions = signal<SuggestedExperience[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  zone = '';
  constructor() {
    this.requests
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set('');
        }),
        switchMap((zone) =>
          forkJoin({
            insights: this.api.getDemandInsights(zone),
            suggestions: this.api.suggestions(zone),
          }).pipe(
            catchError((err) => {
              this.error.set(err.error?.detail ?? this.i18n.translate('demand.loadError'));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((value) => {
        this.loading.set(false);
        if (value) {
          this.insights.set(value.insights);
          this.suggestions.set(value.suggestions);
        }
      });
  }
  ngOnInit(): void {
    this.onSelectZone('');
  }
  onSelectZone(zone: string): void {
    this.requests.next(zone);
  }
  draft(item: SuggestedExperience): Record<string, string | number> {
    return {
      title: (this.i18n.translate('demand.draft') + ' ' + item.category_keyword).slice(0, 200),
      ...(item.category_id ? { category_id: item.category_id } : {}),
      ...(item.suggested_price != null ? { price: item.suggested_price } : {}),
      zone: item.zone,
    };
  }
}
