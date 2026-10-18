import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Variantes visuales para los skeleton loaders.
 */
export type SkeletonVariant = 'card' | 'list';

/**
 * Componente de Placeholder de Carga (Skeleton Loader) para eventos.
 *
 * Mejora el rendimiento percibido (Perceived Performance) simulando la estructura
 * de las tarjetas de eventos mientras la API FastAPI responde.
 * Cumple con Alta Cohesión aislando la animación de pulsación y la estructura geométrica.
 */
@Component({
  selector: 'app-event-skeleton',
  imports: [],
  templateUrl: './event-skeleton.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventSkeletonComponent {
  /** Cantidad de esqueletos a renderizar */
  readonly count = input<number>(6);

  /** Variante estructural ('card' para cuadrícula de catálogo o 'list' para filas compactas) */
  readonly variant = input<SkeletonVariant>('card');

  /** Arreglo iterable para la repetición mediante directiva @for */
  readonly items = computed<number[]>(() =>
    Array.from({ length: Math.max(1, this.count()) }, (_, idx) => idx)
  );
}
