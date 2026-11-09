import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { retry, tap, throwError, timer } from 'rxjs';
import {
  AGE_DISTRIBUTION_REFRESH_MS,
  AgeDistribution,
  AgeDistributionService,
  AgeGroup,
} from '../../../core/services/age-distribution.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { AlertComponent } from '../../../shared/ui/feedback';

/** Barra lista para la vista: rango etario, textos fijos en español, porcentaje y color. */
export interface AgeBar {
  group: AgeGroup;
  label: string;
  range: string;
  percentage: number;
  count: number;
  colorClass: string;
}

/** Orden fijo de los rangos, igual al que devuelve el backend. */
const AGE_GROUP_ORDER: readonly AgeGroup[] = ['YOUTH', 'YOUNG_ADULT', 'ADULT', 'SENIOR'];

/** Textos y colores de cada rango etario. */
const AGE_GROUP_DISPLAY: Record<AgeGroup, { label: string; range: string; colorClass: string }> = {
  YOUTH: { label: 'Menores', range: 'Menos de 18 años', colorClass: 'bg-sky-500' },
  YOUNG_ADULT: { label: 'Jóvenes adultos', range: '18 a 30 años', colorClass: 'bg-violet-500' },
  ADULT: { label: 'Adultos', range: '31 a 50 años', colorClass: 'bg-emerald-500' },
  SENIOR: { label: 'Mayores', range: 'Más de 50 años', colorClass: 'bg-amber-500' },
};

/** Respuestas que no se corrigen reintentando: se informa y se detiene la consulta. */
const PERMANENT_ERROR_STATUSES = new Set([401, 403, 404, 422]);

/**
 * Gráfico de Estimación Etaria del Público en Vivo (HU-16).
 *
 * Responsabilidad:
 * - Consultar periódicamente la distribución porcentual por rango etario de una sesión.
 * - Mostrar barras por rango, rango predominante y estados de carga, vacío y error.
 * - Incrustarse en la consola del anfitrión con `<app-age-distribution-chart [sessionId]="id" />`.
 */
@Component({
  selector: 'app-age-distribution-chart',
  imports: [DatePipe, DecimalPipe, IconComponent, AlertComponent],
  templateUrl: './age-distribution-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgeDistributionChartComponent {
  private readonly api = inject(AgeDistributionService);

  /** Identificador de la sesión en vivo a monitorear (UUID). */
  readonly sessionId = input.required<string>();

  /** Intervalo de actualización en milisegundos. */
  readonly refreshMs = input<number>(AGE_DISTRIBUTION_REFRESH_MS);

  /** Última distribución recibida del backend. */
  readonly distribution = signal<AgeDistribution | null>(null);

  /** Verdadero hasta recibir la primera respuesta o el primer error. */
  readonly loading = signal(true);

  /** Mensaje de error en español; vacío si la última consulta fue correcta. */
  readonly error = signal('');

  /** Barras de los cuatro rangos en orden fijo, con cero si aún no hay datos. */
  readonly bars = computed<AgeBar[]>(() => {
    const shares = new Map(
      (this.distribution()?.distribution ?? []).map((item) => [item.age_group, item] as const),
    );
    return AGE_GROUP_ORDER.map((group) => ({
      group,
      ...AGE_GROUP_DISPLAY[group],
      percentage: shares.get(group)?.percentage ?? 0,
      count: shares.get(group)?.count ?? 0,
    }));
  });

  /** Indica si el servidor aún no tiene un modelo de edad registrado. */
  readonly estimatorMissing = computed(
    () => this.distribution()?.estimator_configured === false,
  );

  /** Indica si la ventana actual contiene rostros clasificados. */
  readonly hasData = computed(() => (this.distribution()?.detections_count ?? 0) > 0);

  /** Nombre del rango predominante, o vacío si no hay rostros. */
  readonly dominantLabel = computed(() => {
    const group = this.distribution()?.dominant_age_group;
    return group ? AGE_GROUP_DISPLAY[group].label : '';
  });

  /** Fecha ISO del último fotograma considerado, o null si la ventana está vacía. */
  readonly updatedAt = computed(() => this.distribution()?.updated_at ?? null);

  /** Descripción accesible de la barra apilada para lectores de pantalla. */
  readonly chartLabel = computed(() =>
    'Distribución etaria: ' +
    this.bars()
      .map((bar) => `${bar.label} ${bar.percentage}%`)
      .join(', '),
  );

  /**
   * Inicia la consulta periódica y la reinicia cada vez que cambia la sesión o el intervalo.
   * La suscripción anterior se cancela al cambiar de sesión o al destruir el componente.
   */
  constructor() {
    effect((onCleanup) => {
      const sessionId = this.sessionId();
      const periodMs = this.refreshMs();
      this.distribution.set(null);
      this.loading.set(true);
      this.error.set('');

      const subscription = this.api
        .watch(sessionId, periodMs)
        .pipe(
          tap({
            error: (err: unknown) => {
              this.error.set(this.describeError(err));
              this.loading.set(false);
            },
          }),
          retry({
            delay: (err: unknown) =>
              this.isPermanentError(err) ? throwError(() => err) : timer(periodMs),
          }),
        )
        .subscribe({
          next: (value) => {
            this.distribution.set(value);
            this.error.set('');
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  /**
   * Determina si un error HTTP no se resuelve reintentando (sesión, permisos o ID inválidos).
   *
   * @param {unknown} err - Error emitido por la consulta.
   * @returns {boolean} Verdadero si se debe detener la consulta periódica.
   */
  private isPermanentError(err: unknown): boolean {
    return err instanceof HttpErrorResponse && PERMANENT_ERROR_STATUSES.has(err.status);
  }

  /**
   * Traduce un error de la consulta a un mensaje claro en español para el anfitrión.
   *
   * @param {unknown} err - Error emitido por la consulta.
   * @returns {string} Mensaje a mostrar en la alerta.
   */
  private describeError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) return 'No se pudo conectar con el servidor. Reintentando.';
      if (err.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
      if (err.status === 403) return 'No tienes permiso para ver esta sesión en vivo.';
      if (err.status === 404) return 'La sesión en vivo no existe o ya no está disponible.';
      if (err.status >= 500) return 'No se pudo actualizar la distribución etaria. Reintentando.';
      if (typeof err.error?.detail === 'string' && err.error.detail) return err.error.detail;
    }
    return 'No se pudo actualizar la distribución etaria. Reintentando.';
  }
}
