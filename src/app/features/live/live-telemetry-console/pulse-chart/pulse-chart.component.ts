import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PulsePoint } from '../../../../core/models/live-telemetry.model';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import {
  PULSE_CHART_HEIGHT,
  PULSE_CHART_WIDTH,
  buildPulseGeometry,
} from './pulse-chart.geometry';

/**
 * Gráfica de Pulso de Energía de la audiencia (HU-17).
 *
 * Responsabilidad:
 * - Dibujar en SVG los últimos 60 s del índice de energía suavizado sobre franjas de color.
 * - Resaltar el valor actual con un punto pulsante del color del semáforo.
 * - Incrustarse con `<app-pulse-chart [points]="pulse" [windowEnd]="emittedAt" />`.
 */
@Component({
  selector: 'app-pulse-chart',
  imports: [TranslatePipe],
  templateUrl: './pulse-chart.component.html',
  styleUrl: './pulse-chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PulseChartComponent {
  /** Puntos de energía en orden cronológico. */
  readonly points = input.required<PulsePoint[]>();

  /** Fecha ISO del borde derecho de la ventana (instante de emisión). */
  readonly windowEnd = input.required<string>();

  /** Altura de la gráfica en píxeles. */
  readonly heightPx = input<number>(140);

  readonly width = PULSE_CHART_WIDTH;
  readonly height = PULSE_CHART_HEIGHT;

  /** Trazos SVG recalculados en cada instantánea. */
  readonly geometry = computed(() => buildPulseGeometry(this.points(), this.windowEnd()));

  /** Descripción accesible del valor actual para lectores de pantalla. */
  readonly ariaValue = computed(() => {
    const last = this.points().at(-1);
    return last ? `${Math.round(last.energy_score * 100)}%` : '';
  });
}
