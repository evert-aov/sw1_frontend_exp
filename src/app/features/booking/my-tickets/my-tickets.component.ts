import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-my-tickets',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-6"><h2>My Tickets & QR Codes Component</h2></div>`,
})
export class MyTicketsComponent {
  onShowTicketQR(ticketId: number): void {
    // Firma para desplegar código QR de acceso
  }
}
