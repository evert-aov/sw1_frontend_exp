import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_CONFIG } from '../config/api.config';
import {
  LiveTelemetrySnapshot,
  McAlert,
  TelemetryStreamEvent,
} from '../models/live-telemetry.model';
import { AuthService } from './auth.service';
import {
  LiveTelemetryService,
  TELEMETRY_SOCKET_FACTORY,
  TelemetryDeniedError,
} from './live-telemetry.service';

/** WebSocket falso controlado por la prueba. */
class FakeSocket {
  readyState = 0;
  sent: string[] = [];
  closedWith: number | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;

  constructor(readonly url: string) {}

  send(data: string): void {
    this.sent.push(data);
  }

  close(code: number): void {
    this.closedWith = code;
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  emit(data: unknown): void {
    this.onmessage?.({ data: typeof data === 'string' ? data : JSON.stringify(data) });
  }

  drop(code: number): void {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

describe('LiveTelemetryService (HU-17)', () => {
  const snapshot: LiveTelemetrySnapshot = {
    type: 'telemetry',
    session_id: 'session-1',
    emitted_at: '2026-11-17T20:00:00Z',
    interval_seconds: 2.5,
    signal_status: 'LIVE',
    energy_score: 0.72,
    traffic_light: 'GREEN',
    trend: 'STABLE',
    attention_score: 0.8,
    joy_score: 0.6,
    detected_faces_count: 14,
    dominant_age_group: 'YOUNG_ADULT',
    last_metric_at: '2026-11-17T20:00:00Z',
    pulse: [],
  };
  let sockets: FakeSocket[];
  let api: LiveTelemetryService;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    sockets = [];
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { token: 'jwt-token' } },
        {
          provide: TELEMETRY_SOCKET_FACTORY,
          useValue: (url: string) => {
            const socket = new FakeSocket(url);
            sockets.push(socket);
            return socket as unknown as WebSocket;
          },
        },
      ],
    });
    api = TestBed.inject(LiveTelemetryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('construye la URL del WebSocket con el token del anfitrión', () => {
    expect(api.buildStreamUrl('session-1')).toBe(
      `${API_CONFIG.baseUrl.replace(/^http/, 'ws')}/live/telemetry/ws/session-1?token=jwt-token`,
    );
  });

  it('emite conexión e instantáneas e ignora mensajes que no son telemetría', () => {
    const events: TelemetryStreamEvent[] = [];
    const subscription = api.watch('session-1').subscribe((event) => events.push(event));
    sockets[0].open();
    sockets[0].emit({ type: 'pong' });
    sockets[0].emit('no-es-json');
    sockets[0].emit(snapshot);

    expect(events).toEqual([
      { kind: 'connection', state: 'connecting' },
      { kind: 'connection', state: 'open' },
      { kind: 'snapshot', snapshot },
    ]);
    subscription.unsubscribe();
    expect(sockets[0].closedWith).toBe(1000);
  });

  it('reconecta con espera exponencial si la conexión se corta', () => {
    const events: TelemetryStreamEvent[] = [];
    const subscription = api.watch('session-1').subscribe((event) => events.push(event));
    sockets[0].open();
    sockets[0].drop(1006);

    expect(events.at(-1)).toEqual({ kind: 'connection', state: 'reconnecting' });
    expect(sockets.length).toBe(1);
    vi.advanceTimersByTime(api.reconnectDelay(1));
    expect(sockets.length).toBe(2);
    expect(api.reconnectDelay(10)).toBe(15000);
    subscription.unsubscribe();
  });

  it('termina con error sin reintentar si el servidor rechaza el permiso', () => {
    let error: unknown = null;
    api.watch('session-1').subscribe({ error: (err) => (error = err) });
    sockets[0].drop(4403);

    expect(error).toBeInstanceOf(TelemetryDeniedError);
    expect((error as TelemetryDeniedError).reason).toBe('forbidden');
    vi.advanceTimersByTime(60000);
    expect(sockets.length).toBe(1);
  });

  it('envía latidos mientras la conexión está abierta', () => {
    const subscription = api.watch('session-1').subscribe();
    sockets[0].open();
    vi.advanceTimersByTime(25000);
    expect(sockets[0].sent).toEqual([JSON.stringify({ type: 'ping' })]);
    subscription.unsubscribe();
  });

  it('solicita un código de vinculación de monitor', () => {
    let code = '';
    api.requestMonitorCode('session-1').subscribe((value) => (code = value.code));
    const request = http.expectOne(
      `${API_CONFIG.baseUrl}/live/telemetry/sessions/session-1/monitor-code`,
    );
    expect(request.request.method).toBe('POST');
    request.flush({ code: 'K7P2QX', session_id: 'session-1', expires_in_seconds: 900 });
    expect(code).toBe('K7P2QX');
  });

  it('emite las alertas del Asistente MC recibidas por el canal (HU-18)', () => {
    const alert = { id: 'alert-1', status: 'ACTIVE' } as McAlert;
    const events: TelemetryStreamEvent[] = [];
    const subscription = api.watch('session-1').subscribe((event) => events.push(event));
    sockets[0].open();
    sockets[0].emit({ type: 'mc_alert', alert });
    sockets[0].emit({ type: 'mc_alert' });

    expect(events.at(-1)).toEqual({ kind: 'mcAlert', alert });
    expect(events.filter((event) => event.kind === 'mcAlert').length).toBe(1);
    subscription.unsubscribe();
  });

  it('responde y pide dinámicas al Asistente MC (HU-19)', () => {
    api.respondMcAlert('alert-1', 'apply').subscribe();
    const apply = http.expectOne(`${API_CONFIG.baseUrl}/live/mc/alerts/alert-1/apply`);
    expect(apply.request.method).toBe('POST');
    apply.flush({});

    api.respondMcAlert('alert-1', 'next').subscribe();
    http.expectOne(`${API_CONFIG.baseUrl}/live/mc/alerts/alert-1/next`).flush({});

    api.requestMcDynamic('session-1').subscribe();
    const request = http.expectOne(`${API_CONFIG.baseUrl}/live/mc/sessions/session-1/request`);
    expect(request.request.method).toBe('POST');
    request.flush({});
  });

  it('consulta la instantánea vigente por REST', () => {
    let result: LiveTelemetrySnapshot | undefined;
    api.getSnapshot('session-1').subscribe((value) => (result = value));
    http.expectOne(`${API_CONFIG.baseUrl}/live/telemetry/sessions/session-1`).flush(snapshot);
    expect(result).toEqual(snapshot);
  });
});
