import { Injectable, InjectionToken, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import {
  LiveTelemetrySnapshot,
  MonitorCode,
  TelemetryDenialReason,
  TelemetryStreamEvent,
} from '../models/live-telemetry.model';
import { AuthService } from './auth.service';

/** Fábrica de WebSocket inyectable para poder sustituirla en las pruebas. */
export const TELEMETRY_SOCKET_FACTORY = new InjectionToken<(url: string) => WebSocket>(
  'TELEMETRY_SOCKET_FACTORY',
  { providedIn: 'root', factory: () => (url: string) => new WebSocket(url) },
);

/** Códigos de cierre con los que el backend rechaza la conexión de forma definitiva. */
const DENIAL_CLOSE_CODES: Record<number, TelemetryDenialReason> = {
  4401: 'unauthorized',
  4403: 'forbidden',
  4404: 'not-found',
};

/** Espera inicial y máxima entre reintentos de conexión en milisegundos. */
export const TELEMETRY_RECONNECT_BASE_MS = 1000;
export const TELEMETRY_RECONNECT_MAX_MS = 15000;

/** Intervalo del latido que mantiene viva la conexión a través de proxies. */
export const TELEMETRY_HEARTBEAT_MS = 25000;

/** Error emitido cuando el servidor rechaza la conexión y no tiene sentido reintentar. */
export class TelemetryDeniedError extends Error {
  /**
   * @param {TelemetryDenialReason} reason - Motivo del rechazo según el código de cierre.
   */
  constructor(readonly reason: TelemetryDenialReason) {
    super(`Conexión de telemetría rechazada: ${reason}`);
    this.name = 'TelemetryDeniedError';
  }
}

/**
 * Servicio de la Consola de Telemetría en Vivo (HU-17).
 * Cumple con el principio de Responsabilidad Única (SRP) gestionando únicamente el canal de solo
 * lectura que emite el semáforo de energía cada 2.5 s; nunca envía ni recibe fotogramas.
 */
@Injectable({
  providedIn: 'root',
})
export class LiveTelemetryService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly createSocket = inject(TELEMETRY_SOCKET_FACTORY);
  private readonly apiUrl = API_CONFIG.baseUrl;

  /**
   * HU-17: Consulta una vez la instantánea vigente (carga inicial o respaldo sin WebSocket).
   *
   * @param {string} sessionId - Identificador de la sesión en vivo (UUID).
   * @returns {Observable<LiveTelemetrySnapshot>} Instantánea de telemetría actual.
   */
  getSnapshot(sessionId: string): Observable<LiveTelemetrySnapshot> {
    return this.http.get<LiveTelemetrySnapshot>(
      `${this.apiUrl}/live/telemetry/sessions/${encodeURIComponent(sessionId)}`,
    );
  }

  /**
   * HU-17: Genera un código de un solo uso para vincular una tablet o celular como monitor.
   * La app móvil solo admite cuentas de asistente, por eso el anfitrión no inicia sesión en ella.
   *
   * @param {string} sessionId - Identificador de la sesión en vivo (UUID).
   * @returns {Observable<MonitorCode>} Código y segundos de validez.
   */
  requestMonitorCode(sessionId: string): Observable<MonitorCode> {
    return this.http.post<MonitorCode>(
      `${this.apiUrl}/live/telemetry/sessions/${encodeURIComponent(sessionId)}/monitor-code`,
      {},
    );
  }

  /**
   * HU-17: Construye la URL del canal WebSocket con el token del anfitrión.
   * Los navegadores no permiten cabeceras en WebSocket, por eso el token viaja en la query.
   *
   * @param {string} sessionId - Identificador de la sesión en vivo (UUID).
   * @returns {string} URL `ws://` o `wss://` del canal de telemetría.
   */
  buildStreamUrl(sessionId: string): string {
    const wsBase = this.apiUrl.replace(/^http/, 'ws');
    const token = encodeURIComponent(this.auth.token ?? '');
    return `${wsBase}/live/telemetry/ws/${encodeURIComponent(sessionId)}?token=${token}`;
  }

  /**
   * HU-17: Abre el canal de telemetría y emite el estado de conexión y cada instantánea recibida.
   * Reintenta con espera exponencial si la conexión se corta; si el servidor la rechaza
   * (token, permiso o sesión inexistente) termina con `TelemetryDeniedError`.
   * Al cancelar la suscripción se cierra el WebSocket.
   *
   * @param {string} sessionId - Identificador de la sesión en vivo (UUID).
   * @returns {Observable<TelemetryStreamEvent>} Flujo de eventos de conexión e instantáneas.
   */
  watch(sessionId: string): Observable<TelemetryStreamEvent> {
    return new Observable<TelemetryStreamEvent>((subscriber) => {
      let socket: WebSocket | null = null;
      let attempt = 0;
      let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
      let stopped = false;

      const clearTimers = () => {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        reconnectTimer = null;
        heartbeatTimer = null;
      };

      const connect = () => {
        subscriber.next({ kind: 'connection', state: attempt === 0 ? 'connecting' : 'reconnecting' });
        socket = this.createSocket(this.buildStreamUrl(sessionId));

        socket.onopen = () => {
          attempt = 0;
          subscriber.next({ kind: 'connection', state: 'open' });
          heartbeatTimer = setInterval(() => {
            if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping' }));
          }, TELEMETRY_HEARTBEAT_MS);
        };

        socket.onmessage = (event: MessageEvent) => {
          const message = this.parseMessage(event.data);
          if (message) subscriber.next({ kind: 'snapshot', snapshot: message });
        };

        socket.onclose = (event: CloseEvent) => {
          clearTimers();
          if (stopped) return;
          const denial = DENIAL_CLOSE_CODES[event.code];
          if (denial) {
            subscriber.next({ kind: 'connection', state: 'closed' });
            subscriber.error(new TelemetryDeniedError(denial));
            return;
          }
          attempt += 1;
          subscriber.next({ kind: 'connection', state: 'reconnecting' });
          reconnectTimer = setTimeout(connect, this.reconnectDelay(attempt));
        };
      };

      connect();

      return () => {
        stopped = true;
        clearTimers();
        socket?.close(1000, 'Consola cerrada');
      };
    });
  }

  /**
   * Calcula la espera antes de un reintento con crecimiento exponencial y un máximo.
   *
   * @param {number} attempt - Número de reintento consecutivo (desde 1).
   * @returns {number} Milisegundos de espera.
   */
  reconnectDelay(attempt: number): number {
    return Math.min(TELEMETRY_RECONNECT_MAX_MS, TELEMETRY_RECONNECT_BASE_MS * 2 ** (attempt - 1));
  }

  /**
   * Interpreta un mensaje del canal y descarta los que no son instantáneas (por ejemplo `pong`).
   *
   * @param {unknown} data - Contenido recibido por el WebSocket.
   * @returns {LiveTelemetrySnapshot | null} Instantánea válida o null.
   */
  private parseMessage(data: unknown): LiveTelemetrySnapshot | null {
    if (typeof data !== 'string') return null;
    try {
      const parsed = JSON.parse(data) as { type?: string };
      return parsed?.type === 'telemetry' ? (parsed as LiveTelemetrySnapshot) : null;
    } catch {
      return null;
    }
  }
}
