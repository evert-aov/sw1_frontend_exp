import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LiveService } from '../../../core/services/live.service';
import { LiveTelemetryService } from '../../../core/services/live-telemetry.service';
import { ExperienceService } from '../../../core/services/experience.service';
import { LiveMetrics } from '../../../core/models/live.model';
import { LiveEngagementWidgetComponent } from './components/live-engagement-widget.component';
import { GdprConsentDialogComponent } from './components/gdpr-consent-dialog.component';
import { LiveTelemetryConsoleComponent } from '../live-telemetry-console/live-telemetry-console.component';
import { McAiChatComponent } from '../live-telemetry-console/mc-ai-chat/mc-ai-chat.component';
import { DjMcAssistantComponent } from '../dj-mc-assistant/dj-mc-assistant.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

/**
 * Consola de Control en Vivo del Anfitrión / Moderador (CU-08, CU-09).
 *
 * Responsabilidad:
 * - Ingesta de video efímera desde cámara web con canvas a 320x240 muestreado cada 2.5 s (HU-13).
 * - Consentimiento informado y garantía de privacidad en memoria RAM (HU-14).
 * - Visualización reactiva del Engagement Score y semáforo de energía (HU-15, HU-17).
 */
@Component({
  selector: 'app-live-host-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslatePipe,
    LiveEngagementWidgetComponent,
    GdprConsentDialogComponent,
    LiveTelemetryConsoleComponent,
    McAiChatComponent,
    DjMcAssistantComponent,
    IconComponent,
  ],
  templateUrl: './live-host-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveHostDashboardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly liveService = inject(LiveService);
  private readonly telemetryService = inject(LiveTelemetryService);
  private readonly experienceService = inject(ExperienceService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('videoElement') videoElementRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElementRef?: ElementRef<HTMLCanvasElement>;

  readonly sessionId = signal<string>('');
  readonly eventId = signal<string>('');
  readonly eventTitle = signal<string | null>(null);
  readonly eventStatus = signal<string | null>(null);
  readonly checkingStatus = signal<boolean>(true);
  readonly actionBusy = signal<boolean>(false);
  readonly isCameraActive = signal<boolean>(false);
  readonly isSocketConnected = signal<boolean>(false);
  readonly hasConsented = signal<boolean>(false);
  readonly showConsentBanner = signal<boolean>(true);
  readonly currentMetrics = signal<LiveMetrics | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly isEventLive = computed(() => {
    const st = this.eventStatus();
    return st === 'LIVE' || st === null;
  });

  readonly isEventNotStarted = computed(() => {
    const st = this.eventStatus();
    return st === 'OPEN' || st === 'CONFIRMED' || st === 'DRAFT';
  });

  readonly isEventEnded = computed(() => {
    const st = this.eventStatus();
    return st === 'FINISHED' || st === 'CANCELLED';
  });

  private mediaStream: MediaStream | null = null;
  private samplingSubscription?: Subscription;
  private socketSubscription?: Subscription;

  readonly hasActiveSignal = computed(() => {
    return this.currentMetrics() !== null;
  });

  scrollToConsole(e?: Event): void {
    e?.preventDefault();
    document.getElementById('telemetry-console')?.scrollIntoView({ behavior: 'smooth' });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('sessionId') || 'session-demo';
    this.sessionId.set(id);
    this.eventId.set(id);
    this.loadEventState(id);

    this.destroyRef.onDestroy(() => {
      this.stopCamera();
      this.socketSubscription?.unsubscribe();
    });
  }

  private loadEventState(routeId: string): void {
    this.checkingStatus.set(true);
    this.telemetryService.getMcChatHistory(routeId).subscribe({
      next: (meta) => {
        this.eventId.set(meta.event_key || routeId);
        this.eventTitle.set(meta.event_title);
        this.eventStatus.set(meta.event_status ?? null);
        const activeSessionId = meta.live_session_id || routeId;
        this.sessionId.set(activeSessionId);
        this.checkingStatus.set(false);
        if (!meta.event_status || meta.event_status === 'LIVE') {
          this.connectWebSocket(activeSessionId);
        }
      },
      error: () => {
        this.checkingStatus.set(false);
        this.connectWebSocket(routeId);
      },
    });
  }

  startEventNow(): void {
    const targetId = this.eventId() || this.sessionId();
    if (!targetId || this.actionBusy()) return;
    this.actionBusy.set(true);
    this.errorMessage.set(null);
    this.experienceService.startExperience(targetId).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.loadEventState(targetId);
      },
      error: (err) => {
        this.actionBusy.set(false);
        this.errorMessage.set(err.error?.detail ?? 'No se pudo iniciar el evento.');
      },
    });
  }

  finishEventNow(): void {
    const targetId = this.eventId() || this.sessionId();
    if (!targetId || this.actionBusy()) return;
    this.actionBusy.set(true);
    this.errorMessage.set(null);
    this.stopCamera();
    this.socketSubscription?.unsubscribe();
    this.isSocketConnected.set(false);
    this.experienceService.finishExperience(targetId).subscribe({
      next: (updated) => {
        this.eventStatus.set(updated.status);
        this.actionBusy.set(false);
      },
      error: (err) => {
        this.actionBusy.set(false);
        this.errorMessage.set(err.error?.detail ?? 'No se pudo finalizar el evento.');
      },
    });
  }

  /**
   * Conecta el canal reactivo WebSocket para recepción de métricas de engagement.
   */
  connectWebSocket(id: string): void {
    this.socketSubscription?.unsubscribe();
    this.socketSubscription = this.liveService.connectStream(id).subscribe({
      next: (metrics) => {
        this.currentMetrics.set(metrics);
        this.isSocketConnected.set(true);
        this.errorMessage.set(null);
      },
      error: (err) => {
        console.warn('Conexión WebSocket cerrada o con reintento:', err);
        this.isSocketConnected.set(false);
      },
      complete: () => {
        this.isSocketConnected.set(false);
      },
    });
  }

  /**
   * Procesa la respuesta al aviso visual de consentimiento informado GDPR (HU-14).
   */
  handleConsent(accepted: boolean): void {
    this.hasConsented.set(accepted);
    this.showConsentBanner.set(false);

    if (accepted && this.sessionId()) {
      this.liveService
        .recordConsent(this.sessionId(), true)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => console.log('Consentimiento GDPR registrado en backend.'),
          error: (err) => console.warn('Error al registrar consentimiento:', err),
        });
    }
  }

  /**
   * Enciende o apaga la ingesta de video desde la cámara web (HU-13).
   */
  async toggleCamera(): Promise<void> {
    if (this.isCameraActive()) {
      this.stopCamera();
      return;
    }

    if (!this.hasConsented()) {
      this.showConsentBanner.set(true);
      return;
    }

    try {
      this.errorMessage.set(null);
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      if (this.videoElementRef?.nativeElement) {
        this.videoElementRef.nativeElement.srcObject = this.mediaStream;
        await this.videoElementRef.nativeElement.play();
      }

      this.isCameraActive.set(true);
      this.startSampling();
    } catch (err: any) {
      console.error('Error al acceder a la cámara:', err);
      this.errorMessage.set('No se pudo acceder a la cámara. Revisa los permisos de tu navegador.');
      this.isCameraActive.set(false);
    }
  }

  /**
   * Muestrea un fotograma del canvas cada 2.5 segundos y lo transmite por WebSocket (HU-13).
   */
  private startSampling(): void {
    this.samplingSubscription?.unsubscribe();
    this.samplingSubscription = interval(2500)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.captureAndSendFrame();
      });
  }

  /**
   * Extrae el fotograma efímero hacia Base64 a baja resolución para no saturar ancho de banda.
   */
  captureAndSendFrame(): void {
    if (!this.isCameraActive() || !this.videoElementRef || !this.canvasElementRef) {
      return;
    }

    const video = this.videoElementRef.nativeElement;
    const canvas = this.canvasElementRef.nativeElement;

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Data = canvas.toDataURL('image/jpeg', 0.6);

    this.liveService.sendFrame(this.sessionId(), base64Data);
  }

  /**
   * Detiene el feed de cámara y libera las pistas de hardware.
   */
  private stopCamera(): void {
    this.samplingSubscription?.unsubscribe();
    this.samplingSubscription = undefined;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.videoElementRef?.nativeElement) {
      this.videoElementRef.nativeElement.srcObject = null;
    }

    this.isCameraActive.set(false);
  }
}
