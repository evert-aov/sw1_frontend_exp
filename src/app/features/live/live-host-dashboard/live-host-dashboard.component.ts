import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-live-host-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-6"><h2>Live Host Dashboard Component (CU-09, CU-10)</h2></div>`,
})
export class LiveHostDashboardComponent {
  captureAndSendFrame(): void {
    // Firma para muestrear canvas HTML5 cada 2-3 segundos hacia WebSocket
  }

  toggleCamera(): void {
    // Firma para encender o apagar ingesta de video
  }
}
