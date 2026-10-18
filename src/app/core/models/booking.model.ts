/**
 * @fileoverview Modelos de dominio para reservas, pagos y entradas (CU-05, CU-06, CU-14).
 * Responsabilidad: Definir estructuras de órdenes de compra, tickets y suscripciones SaaS.
 */

/**
 * Representa una reserva de cupos efectuada por un usuario para una experiencia.
 */
export interface Booking {
  /** Identificador único de la reserva */
  id: number;
  /** Identificador del usuario comprador */
  user_id: number;
  /** Identificador de la experiencia reservada */
  experience_id: number;
  /** Título de la experiencia asociada */
  experience_title?: string;
  /** Fecha programada de la experiencia */
  event_date?: string;
  /** Cantidad de cupos adquiridos */
  quantity: number;
  /** Monto total facturado en Bs */
  total_amount: number;
  /** Estado del pago o reserva (PENDING, PAID, CANCELLED) */
  status: string;
  /** Fecha y hora de creación de la reserva */
  created_at: string;
}

/**
 * Entrada digital con código QR para control de acceso (CU-06).
 */
export interface Ticket {
  /** Identificador único del ticket */
  id: number;
  /** Código legible o alfanumérico del ticket */
  ticket_code: string;
  /** Payload cifrado o contenido para renderizar el código QR */
  qr_payload: string;
  /** Flag indicador de si la entrada ya fue validada en puerta */
  is_used: boolean;
}

/**
 * Plan de suscripción SaaS para anfitriones y locales comerciales (CU-14).
 */
export interface SaaSPlan {
  /** Identificador del plan */
  id: number;
  /** Nombre comercial del plan (ej. Pro, Enterprise) */
  name: string;
  /** Precio mensual recurrente */
  monthly_price: number;
  /** Mapa de características y límites habilitados */
  features_included: Record<string, unknown>;
  /** Si el plan se encuentra actualmente activo para contratación */
  is_active: boolean;
}
