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
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, catchError, forkJoin, of, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatchingService } from '../../../core/services/matching.service';
import { SuggestedExperience, UnmetDemandInsight } from '../../../core/models/matching.model';

/**
 * Tablero Analítico de Prospección de Demanda y Recomendaciones de Creación de Eventos (HU-10, HU-11).
 * Exclusivo para anfitriones y locales comerciales (web).
 */
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
    PercentPipe,
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

  /** Zonas urbanas sugeridas para filtrado rápido con un solo clic */
  readonly quickZones: readonly string[] = [
    'Todas las zonas',
    'Equipetrol',
    'Centro',
    'Urbarí',
    'Las Palmas',
    'Plan 3000',
    'Pampa de la Isla',
  ];

  /** Total acumulado de búsquedas sin oferta en la ventana activa */
  readonly totalSearches = computed(() =>
    this.insights().reduce((acc, curr) => acc + curr.search_count, 0),
  );

  /** Cantidad de nichos temáticos con demanda insatisfecha */
  readonly uniqueCategoriesCount = computed(
    () => new Set(this.insights().map((i) => i.category_keyword.trim().toLowerCase())).size,
  );

  /** Zona geográfica de mayor concentración de demanda */
  readonly topZone = computed(() => {
    const list = this.insights();
    if (!list.length) {
      return this.zone.trim() || this.i18n.translate('demand.allZones');
    }
    const counts: Record<string, number> = {};
    for (const item of list) {
      const z = item.zone?.trim() || this.i18n.translate('demand.allZones');
      counts[z] = (counts[z] ?? 0) + item.search_count;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? this.i18n.translate('demand.allZones');
  });

  /** Volumen pico de búsquedas para escalar las barras de calor */
  readonly maxSearchCount = computed(() => {
    const counts = this.insights().map((i) => i.search_count);
    return counts.length ? Math.max(...counts, 1) : 1;
  });

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

  selectQuickZone(z: string): void {
    if (z === 'Todas las zonas') {
      this.zone = '';
      this.onSelectZone('');
    } else {
      this.zone = z;
      this.onSelectZone(z);
    }
  }

  refresh(): void {
    this.onSelectZone(this.zone);
  }

  /** Porcentaje de intensidad relativo respecto a la categoría de mayor demanda */
  getIntensityPercentage(count: number): number {
    const max = this.maxSearchCount();
    return Math.max(8, Math.min(100, Math.round((count / max) * 100)));
  }

  /** Etiqueta de nivel de oportunidad según volumen relativo */
  getIntensityBadge(count: number): { labelKey: string; badgeTone: 'error' | 'warning' | 'success' } {
    const ratio = count / this.maxSearchCount();
    if (ratio >= 0.7) {
      return { labelKey: 'demand.highIntensity', badgeTone: 'error' };
    }
    if (ratio >= 0.35) {
      return { labelKey: 'demand.moderateIntensity', badgeTone: 'warning' };
    }
    return { labelKey: 'demand.emergingIntensity', badgeTone: 'success' };
  }

  /** Prepara el borrador con los parámetros sugeridos por IA para abrir el formulario */
  draft(item: SuggestedExperience): Record<string, string | number> {
    return {
      title: (this.i18n.translate('demand.draft') + ' ' + item.category_keyword).slice(0, 200),
      ...(item.category_id ? { category_id: item.category_id } : {}),
      ...(item.suggested_price != null ? { price: item.suggested_price } : {}),
      zone: item.zone,
    };
  }
}
