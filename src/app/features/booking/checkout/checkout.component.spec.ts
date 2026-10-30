import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckoutComponent } from './checkout.component';
import { BookingService } from '../../../core/services/booking.service';
import { Booking } from '../../../core/models/booking.model';

describe('Checkout confirmation', () => {
  const pending: Booking = { id: 'booking', user_id: 'buyer', experience_id: 'event', quantity: 1,
    total_amount: 100, platform_fee: 8, host_payout: 92, currency: 'BOB', status: 'PENDING',
    created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 60000).toISOString(), tickets: [] };
  let api: { getBooking: ReturnType<typeof vi.fn>; reconcile: ReturnType<typeof vi.fn>; createCheckoutSession: ReturnType<typeof vi.fn> };
  const route = { snapshot: { paramMap: convertToParamMap({ id: 'booking' }), queryParamMap: convertToParamMap({}) } };
  beforeEach(() => {
    api = { getBooking: vi.fn(() => of(pending)), reconcile: vi.fn(() => of(pending)), createCheckoutSession: vi.fn() };
    route.snapshot.queryParamMap = convertToParamMap({});
    TestBed.configureTestingModule({ providers: [
      { provide: BookingService, useValue: api }, { provide: ActivatedRoute, useValue: route },
    ] });
  });
  const component = () => TestBed.runInInjectionContext(() => new CheckoutComponent());

  it('does not trust the successful browser return as proof of payment', () => {
    route.snapshot.queryParamMap = convertToParamMap({ payment: 'returned', status: 'PAID' });
    const page = component(); page.ngOnInit();
    expect(api.reconcile).toHaveBeenCalledWith('booking'); expect(page.booking()?.status).toBe('PENDING');
  });

  it('cannot pay an expired hold and cannot start two simultaneous checkouts', () => {
    const page = component(); page.ngOnInit();
    page.booking.set({ ...pending, expires_at: new Date(Date.now() - 1000).toISOString() });
    page.onConfirmPayment(); expect(api.createCheckoutSession).not.toHaveBeenCalled();
    page.booking.set(pending); api.createCheckoutSession.mockReturnValue(new Subject());
    page.onConfirmPayment(); page.onConfirmPayment(); expect(api.createCheckoutSession).toHaveBeenCalledTimes(1);
  });

  it('shows provider failure without marking the booking paid', () => {
    const page = component(); page.ngOnInit();
    api.createCheckoutSession.mockReturnValue(throwError(() => ({ error: { detail: 'Stripe no configurado' } })));
    page.onConfirmPayment(); expect(page.booking()?.status).toBe('PENDING');
    expect(page.error()).toBe('Stripe no configurado'); expect(page.busy()).toBe(false);
  });
});
