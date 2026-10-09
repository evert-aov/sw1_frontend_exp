import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-saas-plans',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-6"><h2>SaaS Pro Plans Component (CU-14)</h2></div>`,
})
export class SaasPlansComponent {
  onSubscribe(planId: number): void {
    // Firma para contratar suscripción recurrente
  }
}
