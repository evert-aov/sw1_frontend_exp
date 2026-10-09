import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-6"><h2>Checkout & Payment Component (CU-05, CU-06)</h2></div>`,
})
export class CheckoutComponent {
  onConfirmPayment(): void {
    // Firma para procesar pago con Stripe Checkout
  }
}
