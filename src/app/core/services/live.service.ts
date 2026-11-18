import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { ActionSuggestion, LiveMetrics, PostEventReport } from '../models/live.model';

/**
 * Servicio del dominio de Streaming en Vivo, Visión Artificial Efímera y Smart Host (CU-08..CU-13).
 * Cumple con el principio de Responsabilidad Única (SRP) gestionando la conexión WebSocket
 * de telemetría en vivo, registro de consentimiento GDPR y reportes post-evento.
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
   * CU-08 / CU-09: Establece una conexión WebSocket reactiva para recibir telemetría en tiempo real.
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
   * CU-08 / HU-13: Envía un fotograma codificado en Base64 al backend para su procesamiento efímero en memoria.
   * No se almacena ninguna imagen en disco para garantizar estricto cumplimiento GDPR/privacidad (HU-14).
   *
   * @param {string} sessionId - Identificador de la sesión activa (UUID).
   * @param {string} frameBase64 - Contenido JPEG codificado en Base64.
   * @returns {void}
   */
  sendFrame(sessionId: string, frameBase64: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          session_id: sessionId,
          image_base64: frameBase64,
          frame: frameBase64,
          timestamp_ms: Date.now(),
        }),
      );
    }
  }

  /**
   * CU-08 / HU-14: Registra el consentimiento informado del usuario bajo normativa GDPR
   * para el procesamiento efímero y anónimo en memoria RAM sin almacenamiento de video.
   *
   * @param {string} sessionId - ID de la sesión en vivo.
   * @param {boolean} accepted - Confirmación de consentimiento.
   * @param {string} [userId] - Identificador opcional del usuario asistente.
   * @returns {Observable<{ status: string; gdpr_compliant: boolean }>} Confirmación del servidor.
   */
  recordConsent(
    sessionId: string,
    accepted: boolean = true,
    userId?: string,
  ): Observable<{ status: string; gdpr_compliant: boolean }> {
    return this.http.post<{ status: string; gdpr_compliant: boolean }>(`${this.apiUrl}/live/consent`, {
      session_id: sessionId,
      user_id: userId,
      accepted,
      consent_type: 'GDPR_EPHEMERAL_VIDEO_ANALYSIS',
    });
  }

  /**
   * CU-08: Inicia o recupera una sesión de streaming en vivo vinculada a una experiencia.
   *
   * @param {string} experienceId - ID de la experiencia.
   * @param {string} [hostId] - ID opcional del anfitrión.
   * @returns {Observable<{ id: string; experience_id: string; host_id: string; status: string }>}
   */
  startLiveSession(
    experienceId: string,
    hostId?: string,
  ): Observable<{ id: string; experience_id: string; host_id: string; status: string }> {
    return this.http.post<{ id: string; experience_id: string; host_id: string; status: string }>(
      `${this.apiUrl}/live/session`,
      {
        experience_id: experienceId,
        host_id: hostId,
      },
    );
  }

  /**
   * CU-10 / CU-11: Consulta la lista de dinámicas y sugerencias recomendadas para MC o DJ.
   *
   * @param {string} sessionId - Identificador de la sesión en vivo (UUID).
   * @returns {Observable<ActionSuggestion[]>} Flujo observable con las sugerencias contextuales.
   */
  getSuggestions(sessionId: string): Observable<ActionSuggestion[]> {
    return this.http.get<ActionSuggestion[]>(`${this.apiUrl}/live/sessions/${sessionId}/suggestions`);
  }

  /**
   * CU-12: Consulta el reporte analítico consolidado tras la finalización del evento.
   * Proporciona curvas de engagement minuto a minuto y medias de atención.
   *
   * @param {string} sessionId - Identificador de la sesión culminada (UUID).
   * @returns {Observable<PostEventReport>} Flujo observable con el reporte integral.
   */
  getPostEventReport(sessionId: string): Observable<PostEventReport> {
    return this.http.get<PostEventReport>(`${this.apiUrl}/reports/${sessionId}`);
  }
}
