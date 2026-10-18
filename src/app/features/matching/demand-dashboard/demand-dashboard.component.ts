import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatchingService } from '../../../core/services/matching.service';
import { AuthService } from '../../../core/services/auth.service';
import { UnmetDemandInsight } from '../../../core/models/matching.model';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { EventSkeletonComponent } from '../../../shared/components/event-skeleton/event-skeleton.component';

/**
 * Componente del Panel de Demanda Insatisfecha para Anfitriones y Sedes (CU-08).
 *
 * Expone inteligencia de mercado por zona geográfica:
 * - Identificación de categorías más buscadas por asistentes sin oferta disponible.
 * - Sugerencias de franjas horarias y precios de entrada recomendados.
 * - Skeleton loaders reactivos durante la consulta a los servicios de análisis.
 * - Inyección directa de AuthService para validación de roles en plantilla.
 */
@Component({
  selector: 'app-demand-dashboard',
  imports: [DecimalPipe, TranslatePipe, IconComponent, EventSkeletonComponent],
  templateUrl: './demand-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemandDashboardComponent implements OnInit {
  private readonly matchingService = inject(MatchingService);
  readonly auth = inject(AuthService);

  /** Colección de insights analíticos de demanda insatisfecha */
  readonly insights = signal<UnmetDemandInsight[]>([]);

  /** Estado de carga mientras se obtienen los datos de FastAPI */
  readonly loading = signal<boolean>(true);

  /**
   * Ciclo de vida inicial: realiza la prospección inicial para todas las zonas.
   *
   * @returns {void}
   */
  ngOnInit(): void {
    this.onSelectZone('');
  }

  /**
   * Filtra los reportes de demanda insatisfecha por una zona urbana específica.
   *
   * @param {string} zone - Nombre del barrio o zona urbana (ej. 'Equipetrol').
   * @returns {void}
   */
  onSelectZone(zone: string): void {
    this.loading.set(true);
    this.matchingService.getDemandInsights(zone).subscribe({
      next: (items) => {
        this.insights.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.insights.set([]);
        this.loading.set(false);
      },
    });
  }
}
