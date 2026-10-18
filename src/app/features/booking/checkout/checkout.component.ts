import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Componente de Pasarela de Pagos y Checkout (CU-05).
 *
 * Responsabilidad: Confirmar reservas y procesar cobros de entradas
 * mediante pasarelas de pago seguras (Stripe o QR local).
 */
@Component({
  selector: 'app-checkout',
  imports: [],
  templateUrl: './checkout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent {
  /**
   * Procesa la confirmación del pago de la reserva.
   *
   * @returns {void}
   */
  onConfirmPayment(): void {
    // Procesa el pago seguro
  }
}
