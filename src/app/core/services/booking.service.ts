import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { Booking, SaaSPlan } from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_CONFIG.baseUrl;

  createBooking(bookingData: { experience_id: number; quantity: number }): Observable<Booking> {
    return this.http.post<Booking>(`${this.apiUrl}/bookings`, bookingData);
  }

  createCheckoutSession(bookingId: number): Observable<{ checkout_url: string }> {
    return this.http.post<{ checkout_url: string }>(`${this.apiUrl}/bookings/${bookingId}/checkout`, {});
  }

  getMyTickets(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.apiUrl}/bookings/me`);
  }

  getSaaSPlans(): Observable<SaaSPlan[]> {
    return this.http.get<SaaSPlan[]>(`${this.apiUrl}/saas/plans`);
  }
}
