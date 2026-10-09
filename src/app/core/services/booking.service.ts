import { Injectable } from '@angular/core';
import { Observable, EMPTY } from 'rxjs';
import { Booking, SaaSPlan } from '../models/models';

// Servicio de reservas, tickets y pagos: únicamente firmas de métodos (CU-05, CU-06, CU-14)
@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private apiUrl = 'http://localhost:8000/api';

  createBooking(bookingData: { experience_id: number; quantity: number }): Observable<Booking> {
    // Firma para crear reserva
    return EMPTY;
  }

  createCheckoutSession(bookingId: number): Observable<{ checkout_url: string }> {
    // Firma para iniciar checkout Stripe
    return EMPTY;
  }

  getMyTickets(): Observable<Booking[]> {
    // Firma para obtener historial y entradas con QR
    return EMPTY;
  }

  getSaaSPlans(): Observable<SaaSPlan[]> {
    // Firma para listar planes de suscripción
    return EMPTY;
  }
}
