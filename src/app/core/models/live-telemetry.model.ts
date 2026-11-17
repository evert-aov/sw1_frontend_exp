/**
 * @fileoverview Modelos de la consola de telemetría en vivo (CU-09 / HU-17).
 * Responsabilidad: Tipar las instantáneas agregadas que el backend emite cada 2.5 s por WebSocket.
 */

/** Color del semáforo discreto de energía de la audiencia. */
export type EnergyTrafficLight = 'GREEN' | 'YELLOW' | 'RED';

/** Dirección reciente del índice de energía suavizado. */
export type EnergyTrend = 'RISING' | 'STABLE' | 'FALLING';

/**
 * Estado de la señal de métricas de la sesión.
 * LIVE: métrica de los últimos 7.5 s. STALE: hasta 30 s. NO_SIGNAL: sin métricas recientes.
 */
export type TelemetrySignalStatus = 'LIVE' | 'STALE' | 'NO_SIGNAL';

/** Punto de la gráfica de pulso de energía. */
export interface PulsePoint {
  /** Fecha ISO de la métrica que originó el punto */
  recorded_at: string;
  /** Índice de energía suavizado de 0 a 1 */
  energy_score: number;
  /** Color del semáforo en ese instante */
  traffic_light: EnergyTrafficLight;
}

/** Instantánea de telemetría agregada emitida a la consola del anfitrión (solo valores numéricos, GDPR). */
export interface LiveTelemetrySnapshot {
  type: 'telemetry';
  /** Identificador de la sesión en vivo (UUID) */
  session_id: string;
  /** Fecha ISO de emisión */
  emitted_at: string;
  /** Intervalo de emisión en segundos (2.5) */
  interval_seconds: number;
  signal_status: TelemetrySignalStatus;
  /** Índice de energía suavizado de 0 a 1; null si la sesión nunca recibió métricas */
  energy_score: number | null;
  traffic_light: EnergyTrafficLight | null;
  trend: EnergyTrend;
  /** Última atención promedio de 0 a 1 */
  attention_score: number | null;
  /** Última alegría promedio de 0 a 1 */
  joy_score: number | null;
  detected_faces_count: number | null;
  dominant_age_group: string | null;
  /** Fecha ISO de la última métrica recibida */
  last_metric_at: string | null;
  /** Últimos 60 s de energía para la gráfica de pulso */
  pulse: PulsePoint[];
}

/** Estado de la conexión WebSocket de la consola. */
export type TelemetryConnectionState = 'connecting' | 'open' | 'reconnecting' | 'closed';

/** Evento del flujo de telemetría: cambio de conexión o nueva instantánea. */
export type TelemetryStreamEvent =
  | { kind: 'connection'; state: TelemetryConnectionState }
  | { kind: 'snapshot'; snapshot: LiveTelemetrySnapshot };

/** Motivo por el que el servidor rechazó definitivamente la conexión. */
export type TelemetryDenialReason = 'unauthorized' | 'forbidden' | 'not-found';
