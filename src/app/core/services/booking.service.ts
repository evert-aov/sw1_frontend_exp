import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { Booking, SaaSPlan, Ticket } from '../models/booking.model';

/**
 * Servicio del dominio de Reservas, Compras y Suscripciones SaaS (CU-05, CU-06, CU-14).
 * Cumple con el principio de Responsabilidad Única (SRP) centralizando la gestión de
 * órdenes de compra, emisión de tickets y suscripciones para anfitriones y locales.
 */
@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_CONFIG.baseUrl;

  /**
   * CU-05: Crea una nueva orden de reserva de cupos para una experiencia.
   *
   * @param {Object} bookingData - Datos requeridos para la reserva.
   * @param {number} bookingData.experience_id - Identificador de la experiencia a reservar.
   * @param {number} bookingData.quantity - Cantidad de cupos solicitados.
   * @returns {Observable<Booking>} Flujo observable con la orden de reserva generada.
   */
  createBooking(bookingData: { experience_id: number; quantity: number }): Observable<Booking> {
    return this.http.post<Booking>(`${this.apiUrl}/bookings`, bookingData);
  }

  /**
   * Inicia el flujo de checkout pasarela de pagos para abonar una reserva existente.
   *
   * @param {number} bookingId - Identificador numérico de la reserva a pagar.
   * @returns {Observable<{ checkout_url: string }>} Flujo observable con la URL segura de checkout o pasarela.
   */
  createCheckoutSession(bookingId: number): Observable<{ checkout_url: string }> {
    return this.http.post<{ checkout_url: string }>(`${this.apiUrl}/bookings/${bookingId}/checkout`, {});
  }

  /**
   * CU-06: Consulta las reservas y entradas adquiridas por el usuario autenticado actual.
   *
   * @returns {Observable<Booking[]>} Flujo observable con la lista de reservas históricas y activas.
   */
  getMyTickets(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.apiUrl}/bookings/me`);
  }

  /**
   * Obtiene la entrada digital individual con código QR para validación en puerta.
   *
   * @param {number} ticketId - Identificador de la entrada.
   * @returns {Observable<Ticket>} Flujo observable con la entidad del ticket y su payload QR.
   */
  getTicketById(ticketId: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.apiUrl}/tickets/${ticketId}`);
  }

  /**
   * CU-14: Consulta los planes de suscripción SaaS disponibles para anfitriones y sedes.
   *
   * @returns {Observable<SaaSPlan[]>} Flujo observable con el catálogo de planes comerciales activos.
   */
  getSaaSPlans(): Observable<SaaSPlan[]> {
    return this.http.get<SaaSPlan[]>(`${this.apiUrl}/saas/plans`);
  }
}
