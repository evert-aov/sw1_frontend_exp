import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
  LiveTelemetrySnapshot,
  McAlert,
  MonitorCode,
  TelemetryConnectionState,
  TelemetryDenialReason,
} from '../../../core/models/live-telemetry.model';
import {
  LiveTelemetryService,
  TelemetryDeniedError,
} from '../../../core/services/live-telemetry.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AlertComponent } from '../../../shared/ui/feedback';
import { EnergyTrafficLightComponent } from './energy-traffic-light/energy-traffic-light.component';
import { McAlertAction, McAlertCardComponent } from './mc-alert-card/mc-alert-card.component';
import { PulseChartComponent } from './pulse-chart/pulse-chart.component';

/** Tiempo que permanece visible el resultado de una alerta ya resuelta. */
const MC_RESOLVED_VISIBLE_MS = 4000;

/** Clave de almacenamiento local de la preferencia de modo discreto. */
const FOCUS_MODE_STORAGE_KEY = 'experiencia_telemetry_focus';

/**
 * Consola en Vivo No Invasiva del anfitrión (CU-09 / HU-17).
 *
 * Responsabilidad:
 * - Suscribirse al canal de telemetría de la sesión y reflejar cada instantánea (cada 2.5 s).
 * - Mostrar el semáforo de energía, el pulso de los últimos 60 s y, opcionalmente, el detalle.
 * - Ofrecer un modo discreto que deja solo el semáforo y el pulso para no distraer al moderador/DJ.
 * - Mostrar la tarjeta del Asistente MC (HU-18/HU-19) cuando la atención cae de forma sostenida.
 * - Ruta: `/live/:sessionId/console`.
 */
@Component({
  selector: 'app-live-telemetry-console',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    IconComponent,
    TranslatePipe,
    AlertComponent,
    EnergyTrafficLightComponent,
    McAlertCardComponent,
    PulseChartComponent,
  ],
  templateUrl: './live-telemetry-console.component.html',
  styleUrl: './live-telemetry-console.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveTelemetryConsoleComponent {
  private readonly telemetry = inject(LiveTelemetryService);
  private readonly route = inject(ActivatedRoute);

  /** Identificador de la sesión recibido como Input o tomado de la ruta (UUID). */
  readonly sessionIdInput = input<string>('', { alias: 'sessionId' });
  private readonly routeSessionId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('sessionId') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('sessionId') ?? '' },
  );
  readonly sessionId = computed(() => this.sessionIdInput() || this.routeSessionId());
  readonly embedded = computed(() => !!this.sessionIdInput());

  /** Última instantánea recibida del backend. */
  readonly snapshot = signal<LiveTelemetrySnapshot | null>(null);

  /** Estado de la conexión WebSocket. */
  readonly connection = signal<TelemetryConnectionState>('connecting');

  /** Motivo del rechazo definitivo del servidor, si lo hubo. */
  readonly denial = signal<TelemetryDenialReason | null>(null);

  /** Código de vinculación vigente y su hora de vencimiento. */
  readonly monitorCode = signal<(MonitorCode & { expiresAt: Date }) | null>(null);

  /** Verdadero mientras se solicita un código de vinculación. */
  readonly requestingCode = signal(false);

  /** Verdadero si falló la última solicitud de código. */
  readonly monitorCodeError = signal(false);

  /** Alerta del Asistente MC visible en la consola (HU-18). */
  readonly mcAlert = signal<McAlert | null>(null);

  /** Verdadero mientras se envía una respuesta o un pedido al Asistente MC. */
  readonly mcBusy = signal(false);

  /** Verdadero si falló la última respuesta al Asistente MC. */
  readonly mcError = signal(false);

  /** Verdadero si hay una alerta esperando respuesta (oculta el botón de pedir dinámica). */
  readonly hasActiveMcAlert = computed(() => this.mcAlert()?.status === 'ACTIVE');

  /** Modo discreto: solo semáforo y pulso. */
  readonly focusMode = signal<boolean>(this.readFocusPreference());

  /** Verdadero si la última métrica es reciente. */
  readonly isLive = computed(() => this.snapshot()?.signal_status === 'LIVE');

  /** Verdadero si se debe avisar que no llegan métricas. */
  readonly showNoSignal = computed(() => {
    const status = this.snapshot()?.signal_status;
    return this.connection() === 'open' && status === 'NO_SIGNAL';
  });

  /** Texto del indicador de estado: conexión si no está abierta, si no, estado de la señal. */
  readonly statusKey = computed(() => {
    const connection = this.connection();
    if (connection !== 'open') return `telemetry.connection.${connection}`;
    return `telemetry.signal.${this.snapshot()?.signal_status ?? 'NO_SIGNAL'}`;
  });

  /** Tono visual del indicador de estado. */
  readonly statusTone = computed(() => {
    if (this.connection() !== 'open') return 'warning';
    const status = this.snapshot()?.signal_status;
    if (status === 'LIVE') return 'success';
    return status === 'STALE' ? 'warning' : 'error';
  });

  /**
   * Abre el canal de telemetría y lo reinicia si cambia la sesión de la ruta.
   * La conexión se cierra al cambiar de sesión o al destruir el componente.
   */
  constructor() {
    effect((onCleanup) => {
      const sessionId = this.sessionId();
      this.snapshot.set(null);
      this.denial.set(null);
      this.connection.set('connecting');
      this.mcAlert.set(null);

      const subscription = this.telemetry.watch(sessionId).subscribe({
        next: (event) => {
          if (event.kind === 'connection') this.connection.set(event.state);
          else if (event.kind === 'snapshot') this.snapshot.set(event.snapshot);
          else this.showMcAlert(event.alert);
        },
        error: (err: unknown) => {
          this.connection.set('closed');
          this.denial.set(err instanceof TelemetryDeniedError ? err.reason : 'not-found');
        },
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  /**
   * Solicita un código de un solo uso para ver esta consola en una tablet o celular.
   */
  requestMonitorCode(): void {
    this.requestingCode.set(true);
    this.monitorCodeError.set(false);
    this.telemetry.requestMonitorCode(this.sessionId()).subscribe({
      next: (code) => {
        this.monitorCode.set({
          ...code,
          expiresAt: new Date(Date.now() + code.expires_in_seconds * 1000),
        });
        this.requestingCode.set(false);
      },
      error: () => {
        this.monitorCodeError.set(true);
        this.requestingCode.set(false);
      },
    });
  }

  /**
   * HU-18: Muestra una alerta del Asistente MC. Las alertas activas y las pausas en curso
   * permanecen visibles; las resueltas muestran su resultado unos segundos y se ocultan.
   *
   * @param {McAlert} alert - Estado vigente de la alerta.
   */
  showMcAlert(alert: McAlert): void {
    const current = this.mcAlert();
    if (
      current &&
      current.id !== alert.id &&
      current.status === 'ACTIVE' &&
      alert.status !== 'ACTIVE'
    ) {
      return; // Una resolución antigua no reemplaza a una alerta nueva sin responder
    }
    this.mcAlert.set(alert);
    this.mcError.set(false);
    const breakRunning =
      alert.break_ends_at !== null && Date.parse(alert.break_ends_at) > Date.now();
    if (alert.status !== 'ACTIVE' && !breakRunning) {
      setTimeout(() => {
        if (this.mcAlert()?.id === alert.id && this.mcAlert()?.status === alert.status) {
          this.mcAlert.set(null);
        }
      }, MC_RESOLVED_VISIBLE_MS);
    }
  }

  /**
   * HU-19: Envía la respuesta del moderador (aplicar, otra idea o descartar).
   *
   * @param {McAlertAction} action - Respuesta elegida en la tarjeta.
   */
  respondMcAlert(action: McAlertAction): void {
    const alert = this.mcAlert();
    if (!alert) return;
    this.mcBusy.set(true);
    this.mcError.set(false);
    this.telemetry.respondMcAlert(alert.id, action).subscribe({
      next: (updated) => {
        this.mcBusy.set(false);
        this.showMcAlert(updated);
      },
      error: () => {
        this.mcBusy.set(false);
        this.mcError.set(true);
      },
    });
  }

  /**
   * HU-19: Pide una dinámica al Asistente MC sin esperar la alerta automática.
   */
  requestMcDynamic(): void {
    this.mcBusy.set(true);
    this.telemetry.requestMcDynamic(this.sessionId()).subscribe({
      next: (alert) => {
        this.mcBusy.set(false);
        this.showMcAlert(alert);
      },
      error: () => this.mcBusy.set(false),
    });
  }

  /**
   * Oculta la tarjeta cuando termina la cuenta regresiva de la pausa.
   */
  onMcBreakFinished(): void {
    this.mcAlert.set(null);
  }

  /**
   * Alterna el modo discreto y recuerda la preferencia en este navegador.
   */
  toggleFocusMode(): void {
    const next = !this.focusMode();
    this.focusMode.set(next);
    try {
      localStorage.setItem(FOCUS_MODE_STORAGE_KEY, String(next));
    } catch {
      // Sin almacenamiento disponible la preferencia solo dura mientras la vista esté abierta
    }
  }

  /**
   * Lee la preferencia de modo discreto guardada en el navegador.
   *
   * @returns {boolean} Verdadero si el anfitrión dejó activado el modo discreto.
   */
  private readFocusPreference(): boolean {
    try {
      return localStorage.getItem(FOCUS_MODE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }
}
