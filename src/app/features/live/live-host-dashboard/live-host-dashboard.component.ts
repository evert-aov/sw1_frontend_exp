import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-live-host-dashboard',
  imports: [],
  templateUrl: './live-host-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveHostDashboardComponent {
  captureAndSendFrame(): void {
    // Firma para muestrear canvas HTML5 cada 2-3 segundos hacia WebSocket
  }

  toggleCamera(): void {
    // Firma para encender o apagar ingesta de video
  }
}
