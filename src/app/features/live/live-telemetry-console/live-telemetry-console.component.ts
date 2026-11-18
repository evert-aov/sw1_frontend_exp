import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
  LiveTelemetrySnapshot,
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
import { PulseChartComponent } from './pulse-chart/pulse-chart.component';

/** Clave de almacenamiento local de la preferencia de modo discreto. */
const FOCUS_MODE_STORAGE_KEY = 'experiencia_telemetry_focus';

/**
 * Consola en Vivo No Invasiva del anfitrión (CU-09 / HU-17).
 *
 * Responsabilidad:
 * - Suscribirse al canal de telemetría de la sesión y reflejar cada instantánea (cada 2.5 s).
 * - Mostrar el semáforo de energía, el pulso de los últimos 60 s y, opcionalmente, el detalle.
 * - Ofrecer un modo discreto que deja solo el semáforo y el pulso para no distraer al moderador/DJ.
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
    PulseChartComponent,
  ],
  templateUrl: './live-telemetry-console.component.html',
  styleUrl: './live-telemetry-console.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveTelemetryConsoleComponent {
  private readonly telemetry = inject(LiveTelemetryService);
  private readonly route = inject(ActivatedRoute);

  /** Identificador de la sesión en vivo tomado de la ruta (UUID). */
  readonly sessionId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('sessionId') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('sessionId') ?? '' },
  );

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

      const subscription = this.telemetry.watch(sessionId).subscribe({
        next: (event) => {
          if (event.kind === 'connection') this.connection.set(event.state);
          else this.snapshot.set(event.snapshot);
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
        this.monitorCode.set({ ...code, expiresAt: new Date(Date.now() + code.expires_in_seconds * 1000) });
        this.requestingCode.set(false);
      },
      error: () => {
        this.monitorCodeError.set(true);
        this.requestingCode.set(false);
      },
    });
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
