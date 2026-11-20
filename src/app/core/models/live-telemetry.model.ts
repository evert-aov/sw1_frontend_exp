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

/** Tipo de dinámica sugerida por el Asistente MC (HU-19). */
export type McDynamicType = 'AUDIENCE_QUESTION' | 'ACTIVE_BREAK' | 'SHORT_BREAK';

/** Estado de una alerta del Asistente MC (HU-18). */
export type McAlertStatus = 'ACTIVE' | 'APPLIED' | 'DISMISSED' | 'EXPIRED';

/** Dinámica del catálogo del Asistente MC con textos en español e inglés (HU-19). */
export interface McDynamic {
  id: string;
  code: string;
  dynamic_type: McDynamicType;
  modality: 'ANY' | 'IN_PERSON' | 'VIRTUAL';
  /** 1 suave, 2 media, 3 reactivación fuerte */
  intensity: number;
  duration_minutes: number;
  /** Categorías de experiencia a las que aplica; vacía = dinámica general */
  category_names?: string[];
  title_es: string;
  title_en: string;
  instructions_es: string;
  instructions_en: string;
}

/** Alerta de desatención sostenida con la dinámica propuesta (HU-18 / HU-19). */
export interface McAlert {
  id: string;
  session_id: string;
  trigger: 'SUSTAINED_INATTENTION' | 'MANUAL_REQUEST';
  status: McAlertStatus;
  /** Atención media de la caída, de 0 a 1 */
  average_attention: number | null;
  /** Segundos de atención baja sostenida */
  low_attention_seconds: number;
  created_at: string;
  resolved_at: string | null;
  /** Fin de la pausa si se aplicó un descanso */
  break_ends_at: string | null;
  suggestion_id: string | null;
  dynamic: McDynamic | null;
}

/** Evento del flujo de telemetría: conexión, nueva instantánea o alerta del Asistente MC. */
export type TelemetryStreamEvent =
  | { kind: 'connection'; state: TelemetryConnectionState }
  | { kind: 'snapshot'; snapshot: LiveTelemetrySnapshot }
  | { kind: 'mcAlert'; alert: McAlert };

/** Código de un solo uso para vincular una tablet o celular como monitor (HU-17). */
export interface MonitorCode {
  /** Código de 6 caracteres a ingresar en la app móvil */
  code: string;
  session_id: string;
  /** Segundos de validez del código */
  expires_in_seconds: number;
}

/** Motivo por el que el servidor rechazó definitivamente la conexión. */
export type TelemetryDenialReason = 'unauthorized' | 'forbidden' | 'not-found';

/** Proveedor de IA seleccionable en el chat del Asistente MC. */
export type McAiProvider = 'vertex' | 'ollama';

/** Modelo de IA configurado en el backend (Gemini 3.8 Flash o Qwen 3.8). */
export interface McAiModelInfo {
  provider: McAiProvider;
  id: string;
  label: string;
  available: boolean;
}

/** Catálogo de modelos de IA disponibles para el Asistente MC. */
export interface McAiCatalog {
  default_provider: McAiProvider;
  models: McAiModelInfo[];
}

/** Turno del historial enviado/mostrado en el chat del Asistente MC. */
export interface McAiChatTurn {
  id: string;
  role: 'user' | 'assistant' | 'alert';
  content: string;
  speechText?: string | null;
  createdAt: string;
  provider?: McAiProvider;
  model?: string;
  alert?: McAlert;
}

/** Contexto de telemetría en vivo enviado junto a la consulta del chat. */
export interface McAiTelemetryContext {
  signal_status?: string | null;
  traffic_light?: string | null;
  energy_score?: number | null;
  attention_score?: number | null;
  joy_score?: number | null;
  inattention_score?: number | null;
  detected_faces_count?: number | null;
  trend?: string | null;
  dominant_age_group?: string | null;
}

/** Solicitud POST al endpoint de chat IA del Asistente MC. */
export interface McAiChatRequest {
  message: string;
  provider?: McAiProvider;
  language: 'es' | 'en';
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  telemetry?: McAiTelemetryContext | null;
}

/** Respuesta del chat IA del Asistente MC. */
export interface McAiChatResponse {
  reply: string;
  speech_text?: string | null;
  provider: McAiProvider;
  model: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
}

/** Mensaje guardado en la memoria persistente del chat por evento. */
export interface McAiStoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: McAiProvider | null;
  model?: string | null;
  created_at: string;
}

/** Historial persistido de un evento y su título. */
export interface McAiChatHistory {
  event_key: string;
  event_title: string | null;
  event_status?: string | null;
  live_session_id?: string | null;
  messages: McAiStoredMessage[];
}

/** Una propuesta de discurso de bienvenida del Maestro de Ceremonias. */
export interface McWelcomeSpeechOption {
  id: string;
  style: string;
  title: string;
  speech_text: string;
}

/** Respuesta con 2 propuestas de discurso de bienvenida. */
export interface McWelcomeSpeechesResponse {
  options: McWelcomeSpeechOption[];
  provider: McAiProvider;
  model: string;
}

/** Intervención propuesta de forma autónoma cada minuto por el Maestro de Ceremonias. */
export interface McAutonomousSuggestion {
  title: string;
  reason: string;
  speech_text: string;
  provider: McAiProvider;
  model: string;
}

/** Identificador de playlist del DJ Virtual Autónomo. */
export type DjPlaylistId = 'chill_jazz' | 'groove_funk' | 'melodic_house' | 'upbeat_party';

/** Resultado musical embebible devuelto por YouTube Data API v3. */
export interface DjYoutubeTrack {
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string;
}

/** Transición musical y frase de micrófono generadas por el DJ Autónomo. */
export interface DjTransitionSuggestion {
  recommended_playlist_id: DjPlaylistId;
  recommended_genre: string;
  recommended_bpm: string;
  youtube_search_query?: string | null;
  youtube_tracks?: DjYoutubeTrack[];
  reason: string;
  dj_shoutout: string;
  provider: McAiProvider;
  model: string;
}
