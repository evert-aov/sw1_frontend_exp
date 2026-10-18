import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-post-event-report',
  imports: [],
  templateUrl: './post-event-report.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostEventReportComponent {
  downloadPdf(): void {
    // Firma para descargar archivo PDF con el resumen gráfico
  }
}
