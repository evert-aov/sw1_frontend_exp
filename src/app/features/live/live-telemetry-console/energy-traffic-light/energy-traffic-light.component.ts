import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EnergyTrafficLight, EnergyTrend } from '../../../../core/models/live-telemetry.model';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

/** Orden de las luces del semáforo de arriba hacia abajo. */
const LAMPS: readonly EnergyTrafficLight[] = ['RED', 'YELLOW', 'GREEN'];

/** Rotación de la flecha de tendencia en grados. */
const TREND_ROTATION: Record<EnergyTrend, number> = { RISING: -45, STABLE: 0, FALLING: 45 };

/**
 * Semáforo Discreto de Energía de la audiencia (HU-17).
 *
 * Responsabilidad:
 * - Encender una sola luz (rojo, amarillo o verde) según el semáforo calculado por el backend.
 * - Mostrar el porcentaje de energía, la tendencia y una indicación breve de qué hacer.
 * - Atenuarse cuando la señal no es en vivo para no inducir decisiones con datos viejos.
 */
@Component({
  selector: 'app-energy-traffic-light',
  imports: [IconComponent, TranslatePipe],
  templateUrl: './energy-traffic-light.component.html',
  styleUrl: './energy-traffic-light.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnergyTrafficLightComponent {
  /** Color activo; null si aún no hay métricas. */
  readonly light = input<EnergyTrafficLight | null>(null);

  /** Índice de energía suavizado de 0 a 1; null si aún no hay métricas. */
  readonly energyScore = input<number | null>(null);

  /** Tendencia reciente de la energía. */
  readonly trend = input<EnergyTrend>('STABLE');

  /** Indica si la señal es en vivo; si no, el semáforo se muestra atenuado. */
  readonly live = input<boolean>(true);

  /** Muestra la versión compacta (sin textos de ayuda). */
  readonly compact = input<boolean>(false);

  readonly lamps = LAMPS;

  /** Energía en porcentaje entero, o null sin datos. */
  readonly energyPercent = computed(() => {
    const score = this.energyScore();
    return score === null ? null : Math.round(score * 100);
  });

  /** Sufijo de las claves de traducción del estado actual. */
  readonly stateKey = computed(() => this.light() ?? 'none');

  /** Rotación de la flecha de tendencia. */
  readonly trendRotation = computed(() => TREND_ROTATION[this.trend()]);
}
