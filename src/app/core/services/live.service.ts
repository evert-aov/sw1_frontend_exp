import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { ActionSuggestion, LiveMetrics, PostEventReport } from '../models/live.model';

/**
 * Servicio del dominio de Streaming en Vivo, Visión Artificial Efímera y Smart Host (CU-09..CU-13).
 * Cumple con el principio de Responsabilidad Única (SRP) abstrayendo la conexión WebSocket
 * de telemetría de eventos y la obtención de reportes analíticos post-evento.
 */
@Injectable({
  providedIn: 'root',
})
export class LiveService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_CONFIG.baseUrl;
  private readonly wsUrl = API_CONFIG.wsUrl;
  private socket: WebSocket | null = null;

  /**
   * CU-09 / CU-10: Establece una conexión WebSocket reactiva para recibir telemetría en tiempo real.
   * Emite métricas efímeras de atención, energía y entusiasmo calculadas sobre fotogramas.
   *
   * @param {string} sessionId - Identificador único de la sesión del evento en vivo (UUID).
   * @returns {Observable<LiveMetrics>} Flujo reactivo continuo con las métricas muestreadas.
   */
  connectStream(sessionId: string): Observable<LiveMetrics> {
    return new Observable<LiveMetrics>((observer) => {
      this.socket = new WebSocket(`${this.wsUrl}/${sessionId}`);

      this.socket.onmessage = (event) => {
        try {
          const metrics = JSON.parse(event.data) as LiveMetrics;
          observer.next(metrics);
        } catch (err) {
          observer.error(err);
        }
      };

      this.socket.onerror = (err) => observer.error(err);
      this.socket.onclose = () => observer.complete();

      return () => {
        this.socket?.close();
        this.socket = null;
      };
    });
  }

  /**
   * CU-09: Envía un fotograma codificado en Base64 al backend para su procesamiento efímero en memoria.
   * No se almacena ninguna imagen en disco para garantizar estricto cumplimiento GDPR/privacidad.
   *
   * @param {string} sessionId - Identificador de la sesión activa (UUID).
   * @param {string} frameBase64 - Contenido JPEG/PNG codificado en Base64.
   * @returns {void}
   */
  sendFrame(sessionId: string, frameBase64: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ session_id: sessionId, frame: frameBase64 }));
    }
  }

  /**
   * CU-11 / CU-12: Consulta la lista de dinámicas y sugerencias recomendadas para MC o DJ.
   *
   * @param {string} sessionId - Identificador de la sesión en vivo (UUID).
   * @returns {Observable<ActionSuggestion[]>} Flujo observable con las sugerencias contextuales.
   */
  getSuggestions(sessionId: string): Observable<ActionSuggestion[]> {
    return this.http.get<ActionSuggestion[]>(`${this.apiUrl}/live/sessions/${sessionId}/suggestions`);
  }

  /**
   * CU-13: Consulta el reporte analítico consolidado tras la finalización del evento.
   * Proporciona curvas de engagement minuto a minuto y medias de atención.
   *
   * @param {string} sessionId - Identificador de la sesión culminada (UUID).
   * @returns {Observable<PostEventReport>} Flujo observable con el reporte integral.
   */
  getPostEventReport(sessionId: string): Observable<PostEventReport> {
    return this.http.get<PostEventReport>(`${this.apiUrl}/reports/${sessionId}`);
  }
}
