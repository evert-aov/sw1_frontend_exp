import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ButtonComponent, ButtonLinkDirective } from '../../../shared/ui/button';
import {
  AlertComponent,
  PageHeaderComponent,
  StatusBadgeComponent,
} from '../../../shared/ui/feedback';
import { I18nService } from '../../../core/services/i18n.service';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { BookingService } from '../../../core/services/booking.service';
import { Booking } from '../../../core/models/booking.model';

/**
 * Componente de Pasarela de Pagos y Checkout (CU-05).
 *
 * Responsabilidad: Confirmar reservas y procesar cobros de entradas
 * mediante pasarelas de pago seguras (Stripe o QR local).
 */
@Component({
  selector: 'app-checkout',
  imports: [
    TranslatePipe,
    IconComponent,
    ButtonComponent,
    ButtonLinkDirective,
    AlertComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
    DatePipe,
    DecimalPipe,
    RouterLink,
  ],
  templateUrl: './checkout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly api = inject(BookingService);
  private readonly route = inject(ActivatedRoute);
  readonly booking = signal<Booking | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set(this.i18n.translate('booking.notFound'));
      return;
    }
    this.busy.set(true);
    // El parámetro de retorno dispara una consulta al backend, nunca marca un pago.
    const returned = this.route.snapshot.queryParamMap.get('payment');
    const request = returned === 'returned' ? this.api.reconcile(id) : this.api.getBooking(id);
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: (value) => {
        this.booking.set(value);
        if (returned === 'cancelled') this.notice.set(this.i18n.translate('booking.resume'));
      },
      error: (err) => this.error.set(err.error?.detail ?? this.i18n.translate('booking.loadError')),
    });
  }

  canPay(): boolean {
    const booking = this.booking();
    return (
      !!booking &&
      booking.status === 'PENDING' &&
      !!booking.expires_at &&
      new Date(booking.expires_at).getTime() > Date.now()
    );
  }

  onConfirmPayment(): void {
    const booking = this.booking();
    if (!booking || !this.canPay() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .createCheckoutSession(booking.id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (value) => {
          const target = new URL(value.checkout_url);
          if (target.protocol === 'https:' && target.hostname === 'checkout.stripe.com')
            window.location.assign(target.href);
          else this.error.set(this.i18n.translate('booking.invalidUrl'));
        },
        error: (err) =>
          this.error.set(err.error?.detail ?? this.i18n.translate('booking.payError')),
      });
  }

  refresh(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .reconcile(id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (value) => this.booking.set(value),
        error: (err) =>
          this.error.set(err.error?.detail ?? this.i18n.translate('booking.refreshError')),
      });
  }

  cancel(): void {
    const booking = this.booking();
    if (!booking || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .cancelBooking(booking.id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (value) => this.booking.set(value),
        error: (err) =>
          this.error.set(err.error?.detail ?? this.i18n.translate('booking.cancelError')),
      });
  }
}
