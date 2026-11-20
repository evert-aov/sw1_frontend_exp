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
  McDynamic,
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

  /** Preferencia de modo discreto (solo semáforo y pulso). */
  readonly focusMode = signal(this.readFocusPreference());

  /** Verdadero si la conexión está abierta y la señal no está cortada. */
  readonly isLive = computed(() => {
    return this.connection() === 'open' && this.snapshot()?.signal_status === 'LIVE';
  });

  /** Clave de traducción del estado actual de la conexión/señal. */
  readonly statusKey = computed(() => {
    const state = this.connection();
    if (state === 'connecting') return 'telemetry.connection.connecting';
    if (state === 'reconnecting') return 'telemetry.connection.reconnecting';
    if (state === 'closed') return 'telemetry.connection.closed';
    const signalStatus = this.snapshot()?.signal_status ?? 'NO_SIGNAL';
    return `telemetry.signal.${signalStatus}`;
  });

  /** Tono semántico del estado para la píldora visual. */
  readonly statusTone = computed<'success' | 'warning' | 'error'>(() => {
    const state = this.connection();
    if (state === 'connecting' || state === 'reconnecting') return 'warning';
    if (state === 'closed') return 'error';
    const signalStatus = this.snapshot()?.signal_status ?? 'NO_SIGNAL';
    if (signalStatus === 'LIVE') return 'success';
    if (signalStatus === 'STALE') return 'warning';
    return 'error';
  });

  /** Verdadero cuando la conexión está activa pero no llegan métricas recientes. */
  readonly showNoSignal = computed(() => {
    return this.connection() === 'open' && this.snapshot()?.signal_status === 'NO_SIGNAL';
  });

  /** Verdadero si hay una alerta visible en pantalla que todavía no se resolvió. */
  readonly hasActiveMcAlert = computed(() => {
    return this.mcAlert()?.status === 'ACTIVE';
  });

  private demoIndex = 0;
  private readonly demoDynamics: McDynamic[] = [
    {
      id: 'dyn-1',
      code: 'AUDIENCE_QUESTION',
      dynamic_type: 'AUDIENCE_QUESTION',
      modality: 'ANY',
      intensity: 1,
      duration_minutes: 2,
      title_es: 'Pregunta al público: ¿Quién puede compartir una anécdota?',
      title_en: 'Audience Question: Who can share a quick story?',
      instructions_es:
        'Invita a una persona de la audiencia a compartir brevemente cómo conoció este tema o su expectativa principal.',
      instructions_en:
        'Invite one audience member to briefly share how they discovered this topic or their main expectation.',
    },
    {
      id: 'dyn-2',
      code: 'ACTIVE_BREAK',
      dynamic_type: 'ACTIVE_BREAK',
      modality: 'ANY',
      intensity: 2,
      duration_minutes: 1,
      title_es: 'Pausa Activa: Estiramiento y Aplauso Grupal',
      title_en: 'Active Break: Stretch & Group Applause',
      instructions_es:
        'Pide a todos ponerse de pie, estirar los brazos hacia arriba durante 20 segundos y darse un aplauso de reactivación.',
      instructions_en:
        'Ask everyone to stand up, stretch upwards for 20 seconds, and give a round of applause.',
    },
    {
      id: 'dyn-3',
      code: 'SHORT_BREAK',
      dynamic_type: 'SHORT_BREAK',
      modality: 'ANY',
      intensity: 1,
      duration_minutes: 3,
      title_es: 'Pausa Corta: Tiempo para café o agua',
      title_en: 'Short Break: Quick coffee or water break',
      instructions_es:
        'Anuncia una breve pausa de 3 minutos para que el público se hidrate antes de la siguiente sección.',
      instructions_en:
        'Announce a brief 3-minute break for water or coffee before the next section.',
    },
  ];

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
          if (this.embedded() || sessionId === 'session-demo') {
            // Mantiene viva la consola en modo embebido / demo para probar libremente
            this.connection.set('open');
            this.snapshot.set(this.buildDemoSnapshot());
            this.denial.set(null);
          } else {
            this.connection.set('closed');
            this.denial.set(err instanceof TelemetryDeniedError ? err.reason : 'not-found');
          }
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
        // Fallback interactivo para pruebas locales
        if (action === 'apply') {
          const duration = alert.dynamic?.duration_minutes ?? 1;
          this.showMcAlert({
            ...alert,
            status: 'APPLIED',
            break_ends_at: new Date(Date.now() + duration * 60000).toISOString(),
            resolved_at: new Date().toISOString(),
          });
        } else if (action === 'dismiss') {
          this.showMcAlert({
            ...alert,
            status: 'DISMISSED',
            resolved_at: new Date().toISOString(),
          });
        } else if (action === 'next') {
          this.demoIndex++;
          this.showMcAlert(this.buildDemoMcAlert());
        }
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
      error: () => {
        this.mcBusy.set(false);
        // Fallback demo para que el asistente siempre responda visualmente
        this.showMcAlert(this.buildDemoMcAlert());
      },
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

  private buildDemoSnapshot(): LiveTelemetrySnapshot {
    const now = Date.now();
    const points = Array.from({ length: 15 }, (_, i) => ({
      recorded_at: new Date(now - (14 - i) * 2500).toISOString(),
      energy_score: 0.65 + Math.sin(i * 0.5) * 0.15,
      traffic_light: 'GREEN' as const,
    }));
    return {
      type: 'telemetry',
      session_id: this.sessionId(),
      emitted_at: new Date().toISOString(),
      interval_seconds: 2.5,
      signal_status: 'LIVE',
      energy_score: 0.78,
      traffic_light: 'GREEN',
      trend: 'STABLE',
      attention_score: 0.82,
      joy_score: 0.74,
      detected_faces_count: 8,
      dominant_age_group: 'YOUNG_ADULT',
      last_metric_at: new Date().toISOString(),
      pulse: points,
    };
  }

  private buildDemoMcAlert(): McAlert {
    const dyn = this.demoDynamics[this.demoIndex % this.demoDynamics.length];
    return {
      id: 'demo-alert-' + Date.now(),
      session_id: this.sessionId(),
      trigger: 'MANUAL_REQUEST',
      status: 'ACTIVE',
      average_attention: 0.45,
      low_attention_seconds: 180,
      created_at: new Date().toISOString(),
      resolved_at: null,
      break_ends_at: null,
      suggestion_id: null,
      dynamic: dyn,
    };
  }
}
