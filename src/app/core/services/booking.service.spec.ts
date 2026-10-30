import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API_CONFIG } from '../config/api.config';
import { BookingService } from './booking.service';

describe('Booking HTTP contracts', () => {
  let api: BookingService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(BookingService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('preserves the caller key across a failed reservation retry and sends no client price', () => {
    const data = { experience_id: 'event', quantity: 2 };
    for (let attempt = 0; attempt < 2; attempt++) {
      api.createBooking(data, 'same-operation-key').subscribe({ error: () => {} });
      const request = http.expectOne(`${API_CONFIG.baseUrl}/bookings`);
      expect(request.request.headers.get('Idempotency-Key')).toBe('same-operation-key');
      expect(request.request.body).toEqual(data);
      request.flush({}, { status: 503, statusText: 'Unavailable' });
    }
  });

  it('uses the authenticated QR route as a blob', () => {
    api.getTicketQR('ticket').subscribe();
    const request = http.expectOne(`${API_CONFIG.baseUrl}/bookings/tickets/ticket/qr`);
    expect(request.request.responseType).toBe('blob'); request.flush(new Blob(['<svg/>']));
  });

  it('requests provider reconciliation without sending an asserted payment status', () => {
    api.reconcile('booking').subscribe();
    const request = http.expectOne(`${API_CONFIG.baseUrl}/payments/status/booking`);
    expect(request.request.method).toBe('POST'); expect(request.request.body).toEqual({}); request.flush({});
  });
});
