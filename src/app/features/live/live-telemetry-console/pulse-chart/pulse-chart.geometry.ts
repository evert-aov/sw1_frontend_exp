import { EnergyTrafficLight, PulsePoint } from '../../../../core/models/live-telemetry.model';

/** Dimensiones lógicas del lienzo SVG (el SVG se escala al ancho disponible). */
export const PULSE_CHART_WIDTH = 300;
export const PULSE_CHART_HEIGHT = 100;

/** Ventana temporal visible de la gráfica en milisegundos (60 s, igual que el backend). */
export const PULSE_WINDOW_MS = 60_000;

/** Umbrales del semáforo en el índice de energía (deben coincidir con el backend). */
export const GREEN_THRESHOLD = 0.65;
export const YELLOW_THRESHOLD = 0.4;

/** Punto ya proyectado en coordenadas del SVG. */
export interface PulseChartPoint {
  x: number;
  y: number;
  light: EnergyTrafficLight;
}

/** Trazos listos para dibujar la gráfica de pulso. */
export interface PulseChartGeometry {
  /** Atributo `d` de la línea de energía; vacío si no hay puntos visibles */
  linePath: string;
  /** Atributo `d` del área bajo la línea */
  areaPath: string;
  /** Último punto visible para resaltar el valor actual */
  lastPoint: PulseChartPoint | null;
  /** Altura Y de cada umbral para dibujar las franjas de color */
  greenY: number;
  yellowY: number;
}

/**
 * Proyecta un índice de energía (0 a 1) a la coordenada Y del SVG (0 arriba).
 *
 * @param {number} score - Índice de energía.
 * @returns {number} Coordenada Y redondeada a 2 decimales.
 */
export function energyToY(score: number): number {
  const clamped = Math.max(0, Math.min(1, score));
  return round((1 - clamped) * PULSE_CHART_HEIGHT);
}

/**
 * HU-17: Calcula los trazos de la gráfica de pulso para los últimos 60 s.
 * El borde derecho es el instante de emisión, así el pulso avanza aunque la cámara se detenga.
 *
 * @param {PulsePoint[]} points - Puntos de energía en orden cronológico.
 * @param {string} windowEndIso - Fecha ISO del borde derecho (emisión de la instantánea).
 * @returns {PulseChartGeometry} Trazos y referencias de la gráfica.
 */
export function buildPulseGeometry(points: PulsePoint[], windowEndIso: string): PulseChartGeometry {
  const end = Date.parse(windowEndIso);
  const start = end - PULSE_WINDOW_MS;
  const projected: PulseChartPoint[] = points
    .map((point) => ({ time: Date.parse(point.recorded_at), point }))
    .filter(({ time }) => Number.isFinite(time) && time >= start && time <= end)
    .map(({ time, point }) => ({
      x: round(((time - start) / PULSE_WINDOW_MS) * PULSE_CHART_WIDTH),
      y: energyToY(point.energy_score),
      light: point.traffic_light,
    }));

  const linePath = projected.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  const areaPath = projected.length
    ? `${linePath} L${projected[projected.length - 1].x} ${PULSE_CHART_HEIGHT} L${projected[0].x} ${PULSE_CHART_HEIGHT} Z`
    : '';

  return {
    linePath,
    areaPath,
    lastPoint: projected.length ? projected[projected.length - 1] : null,
    greenY: energyToY(GREEN_THRESHOLD),
    yellowY: energyToY(YELLOW_THRESHOLD),
  };
}

/**
 * Redondea a 2 decimales para mantener compactos los atributos SVG.
 *
 * @param {number} value - Valor a redondear.
 * @returns {number} Valor redondeado.
 */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
