import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-post-event-report',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-6"><h2>Post-Event Analytics Report Component (CU-13)</h2></div>`,
})
export class PostEventReportComponent {
  downloadPdf(): void {
    // Firma para descargar archivo PDF con el resumen gráfico
  }
}
