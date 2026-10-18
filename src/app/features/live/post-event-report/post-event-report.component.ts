import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Reporte Analítico Post-Evento para Anfitriones y Sedes (CU-13).
 *
 * Responsabilidad:
 * - Despliegue de métricas de retención de audiencia y atención media.
 * - Exportación de reportes ejecutivos en formato PDF.
 */
@Component({
  selector: 'app-post-event-report',
  imports: [],
  templateUrl: './post-event-report.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostEventReportComponent {
  /**
   * Genera y descarga el archivo PDF con el reporte gráfico del evento.
   *
   * @returns {void}
   */
  downloadPdf(): void {
    // Descarga informe analítico en PDF
  }
}
