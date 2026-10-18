/**
 * @fileoverview Modelos de dominio para transmisión en vivo, visión artificial efímera y Smart Host (CU-09..CU-13).
 * Responsabilidad: Definir métricas de audiencia, sugerencias de DJ/MC y reportes analíticos.
 */

/**
 * Métricas de audiencia calculadas en memoria efímera sin persistencia biométrica (GDPR).
 */
export interface LiveMetrics {
  /** Identificador de la sesión en vivo (UUID) */
  session_id: string;
  /** Marca temporal del fotograma muestreado */
  recorded_at: string;
  /** Cantidad de rostros detectados en la escena */
  detected_faces_count: number;
  /** Puntuación estimada de atención (0 a 100) */
  attention_score: number;
  /** Puntuación estimada de entusiasmo/alegría (0 a 100) */
  joy_score: number;
  /** Puntuación de neutralidad (0 a 100) */
  neutral_score: number;
  /** Puntuación de desatención (0 a 100) */
  inattention_score: number;
  /** Rango etario predominante estimado */
  dominant_age_group?: string;
  /** Semáforo visual de energía para la consola del anfitrión */
  energy_traffic_light: 'GREEN' | 'YELLOW' | 'RED';
}

/**
 * Sugerencia generada por el asistente inteligente para el anfitrión (MC o DJ).
 */
export interface ActionSuggestion {
  /** Identificador de la sugerencia (UUID) */
  id: string;
  /** Identificador de la sesión activa (UUID) */
  session_id: string;
  /** Tipo de sugerencia contextual */
  suggestion_type: 'MC_DYNAMIC' | 'DJ_MUSIC_CHANGE' | 'BREAK';
  /** Texto explicativo de la dinámica o cambio recomendado */
  suggestion_text: string;
  /** BPM sugerido para la música (en caso de DJ) */
  recommended_bpm?: string;
  /** Género musical recomendado */
  recommended_genre?: string;
  /** Si la sugerencia ya fue aceptada por el moderador */
  applied: boolean;
  /** Fecha y hora de generación */
  created_at: string;
}

/**
 * Reporte analítico final generado tras la culminación del evento (CU-13).
 */
export interface PostEventReport {
  /** Identificador de la sesión (UUID) */
  session_id: string;
  /** Identificador de la experiencia (UUID) */
  experience_id: string;
  /** Título de la experiencia analizada */
  experience_title: string;
  /** Duración total real en minutos */
  total_duration_minutes: number;
  /** Promedio general de atención registrado */
  average_attention_score: number;
  /** Promedio general de entusiasmo registrado */
  average_joy_score: number;
  /** Minuto en que se registró el pico de mayor engagement */
  peak_engagement_minute: number;
  /** Curva temporal minuto a minuto */
  timeline: {
    minute: number;
    average_attention: number;
    average_joy: number;
  }[];
}
