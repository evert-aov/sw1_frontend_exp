import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LiveMetrics } from '../../../../core/models/live.model';
import {
  DjTransitionSuggestion,
  LiveTelemetrySnapshot,
  McAiChatTurn,
  McAiModelInfo,
  McAiProvider,
  McAiTelemetryContext,
  McAlert,
  McAutonomousSuggestion,
  McWelcomeSpeechOption,
} from '../../../../core/models/live-telemetry.model';
import { BrowserNotificationService } from '../../../../core/services/browser-notification.service';
import { I18nService } from '../../../../core/services/i18n.service';
import { LiveTelemetryService } from '../../../../core/services/live-telemetry.service';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { McAlertAction } from '../mc-alert-card/mc-alert-card.component';
import { renderSafeMarkdown } from './mc-markdown.util';

const DEFAULT_MODELS: McAiModelInfo[] = [
  {
    provider: 'vertex',
    id: 'gemini-3.8-flash',
    label: 'Gemini 3.8 Flash',
    available: true,
  },
  {
    provider: 'ollama',
    id: 'qwen3.8:latest',
    label: 'Qwen 3.8',
    available: true,
  },
];

/** Intervalo de monitoreo autónomo del Maestro de Ceremonias (60 segundos). */
const AUTONOMOUS_INTERVAL_MS = 60_000;

@Component({
  selector: 'app-mc-ai-chat',
  imports: [DatePipe, FormsModule, IconComponent, TranslatePipe],
  templateUrl: './mc-ai-chat.component.html',
  styleUrl: './mc-ai-chat.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class McAiChatComponent implements OnInit {
  private readonly telemetry = inject(LiveTelemetryService);
  private readonly i18n = inject(I18nService);
  private readonly browserNotify = inject(BrowserNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

  /** Identificador de sesión o experiencia en vivo. */
  readonly sessionId = input.required<string>();

  /** Última instantánea de telemetría de la consola. */
  readonly snapshot = input<LiveTelemetrySnapshot | null>(null);

  /** Métricas directas de la cámara (fallback cuando la sesión aún no está en BD). */
  readonly liveMetrics = input<LiveMetrics | null>(null);

  /** Alerta automática del Asistente MC (si existe). */
  readonly activeAlert = input<McAlert | null>(null);

  /** Estado ocupado al responder una alerta del motor MC. */
  readonly alertBusy = input<boolean>(false);

  /** Error al responder una alerta del motor MC. */
  readonly alertError = input<boolean>(false);

  /** Respuesta del moderador a una alerta automática MC dentro del chat. */
  readonly respondAlert = output<McAlertAction>();

  /** Se emite cuando finaliza el temporizador de pausa de una alerta MC. */
  readonly breakFinished = output<void>();

  /** Se emite con el nombre del evento resuelto por el backend. */
  readonly eventTitleResolved = output<string | null>();

  /** Transición musical pendiente generada por el DJ Virtual Autónomo. */
  readonly djSuggestion = input<DjTransitionSuggestion | null>(null);

  /** Verdadero mientras el DJ está hablando por micrófono. */
  readonly djSpeaking = input<boolean>(false);

  /** Verdadero mientras el DJ está consultando a la IA para una transición. */
  readonly djLoading = input<boolean>(false);

  /** Aplica la transición del DJ (`true` = cambiar música y hablar, `false` = solo música). */
  readonly applyDjTransition = output<boolean>();

  /** Descarta la transición sugerida por el DJ. */
  readonly dismissDjTransition = output<void>();

  readonly models = signal<McAiModelInfo[]>(DEFAULT_MODELS);
  readonly selectedProvider = signal<McAiProvider>('vertex');
  readonly messages = signal<McAiChatTurn[]>([]);
  readonly draft = signal<string>('');
  readonly sending = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly now = signal<number>(Date.now());

  // Estado de Maestro de Ceremonias con Voz (Edge TTS) y autonomía cada 60 s
  readonly welcomeOptions = signal<McWelcomeSpeechOption[]>([]);
  readonly welcomeModel = signal<string>('');
  readonly loadingWelcome = signal<boolean>(false);
  readonly autonomousMode = signal<boolean>(true);
  readonly loadingAutonomous = signal<boolean>(false);
  readonly pendingSuggestion = signal<McAutonomousSuggestion | null>(null);
  readonly synthesizingVoice = signal<boolean>(false);
  readonly isSpeaking = signal<boolean>(false);

  private activeAudio: HTMLAudioElement | null = null;
  private activeAudioUrl: string | null = null;
  private autonomousTimer: ReturnType<typeof setInterval> | null = null;

  readonly quickPromptKeys = [
    'mc.chat.quick1',
    'mc.chat.quick2',
    'mc.chat.quick3',
    'mc.chat.quick4',
  ] as const;

  readonly liveSummary = computed(() => {
    const cam = this.liveMetrics();
    const snap = this.snapshot();
    if (cam) {
      return {
        attention: Math.round(
          cam.attention_score > 1 ? cam.attention_score : cam.attention_score * 100,
        ),
        joy: Math.round(cam.joy_score > 1 ? cam.joy_score : cam.joy_score * 100),
        faces: cam.detected_faces_count,
        light: cam.energy_traffic_light ?? 'RED',
      };
    }
    if (snap && snap.energy_score !== null) {
      return {
        attention: snap.attention_score !== null ? Math.round(snap.attention_score * 100) : null,
        joy: snap.joy_score !== null ? Math.round(snap.joy_score * 100) : null,
        faces: snap.detected_faces_count,
        light: snap.traffic_light ?? 'GREEN',
      };
    }
    return null;
  });

  readonly breakRemainingMs = computed(() => {
    const alert = this.activeAlert();
    if (!alert || alert.status !== 'APPLIED' || !alert.break_ends_at) return 0;
    return Math.max(0, Date.parse(alert.break_ends_at) - this.now());
  });

  readonly breakCountdown = computed(() => {
    const totalSeconds = Math.ceil(this.breakRemainingMs() / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  });

  readonly alertDynamicTitle = computed(() => {
    const dynamic = this.activeAlert()?.dynamic;
    if (!dynamic) return '';
    return this.i18n.currentLang() === 'en' ? dynamic.title_en : dynamic.title_es;
  });

  readonly alertDynamicInstructions = computed(() => {
    const dynamic = this.activeAlert()?.dynamic;
    if (!dynamic) return '';
    return this.i18n.currentLang() === 'en' ? dynamic.instructions_en : dynamic.instructions_es;
  });

  constructor() {
    effect(() => {
      const id = this.sessionId();
      if (id) {
        this.loadHistory(id);
      }
    });

    effect(() => {
      const dj = this.djSuggestion();
      if (dj) {
        this.scrollToBottom();
        this.browserNotify.notify(
          `DJ Autónomo · ${dj.recommended_genre}`,
          dj.dj_shoutout,
        );
      }
      if (this.djLoading()) {
        this.scrollToBottom();
      }
    });

    effect((onCleanup) => {
      const alert = this.activeAlert();
      if (!alert || alert.status !== 'APPLIED' || !alert.break_ends_at) return;
      this.now.set(Date.now());
      const timer = setInterval(() => {
        this.now.set(Date.now());
        if (this.breakRemainingMs() === 0) {
          clearInterval(timer);
          this.breakFinished.emit();
        }
      }, 1000);
      onCleanup(() => clearInterval(timer));
    });

    this.destroyRef.onDestroy(() => {
      this.stopSpeaking();
      if (this.autonomousTimer) {
        clearInterval(this.autonomousTimer);
        this.autonomousTimer = null;
      }
    });
  }

  ngOnInit(): void {
    this.seedWelcomeMessage();
    this.loadModels();
    this.startAutonomousLoop();
    void this.browserNotify.requestPermission();
  }

  selectProvider(provider: McAiProvider): void {
    this.selectedProvider.set(provider);
    this.errorMessage.set(null);
  }

  toggleAutonomousMode(): void {
    this.autonomousMode.update((v) => !v);
  }

  clearChat(): void {
    this.errorMessage.set(null);
    this.welcomeOptions.set([]);
    this.pendingSuggestion.set(null);
    this.stopSpeaking();
    this.seedWelcomeMessage();
    const id = this.sessionId();
    if (id) {
      this.telemetry.clearMcChatHistory(id).subscribe({
        error: () => {
          // Ya quedó limpio visualmente
        },
      });
    }
  }

  /** Genera 2 propuestas de discurso de bienvenida personalizadas al evento. */
  requestWelcomeSpeeches(): void {
    const id = this.sessionId();
    if (!id || this.loadingWelcome()) return;
    this.loadingWelcome.set(true);
    this.errorMessage.set(null);
    const lang = this.i18n.currentLang() === 'en' ? 'en' : 'es';

    this.telemetry.generateWelcomeSpeeches(id, this.selectedProvider(), lang).subscribe({
      next: (res) => {
        this.welcomeOptions.set(res.options);
        this.welcomeModel.set(res.model);
        this.loadingWelcome.set(false);
        this.scrollToBottom();
      },
      error: (err) => {
        this.loadingWelcome.set(false);
        this.errorMessage.set(err?.error?.detail ?? this.i18n.translate('mc.chat.error'));
      },
    });
  }

  /** El anfitrión aprueba uno de los 2 discursos y la IA empieza a hablarlo por Edge TTS. */
  acceptWelcomeSpeech(option: McWelcomeSpeechOption): void {
    this.welcomeOptions.set([]);
    const spokenTurn: McAiChatTurn = {
      id: `welcome-speech-${Date.now()}`,
      role: 'assistant',
      content: `**${option.title}**`,
      speechText: option.speech_text,
      createdAt: new Date().toISOString(),
      provider: this.selectedProvider(),
      model: this.welcomeModel() || 'edge-tts',
    };
    this.messages.update((list) => [...list, spokenTurn]);
    this.scrollToBottom();
    this.speakText(option.speech_text, true, this.welcomeModel() || undefined);
  }

  /** Pide una intervención autónoma basada en las métricas actuales (automática cada 60 s o manual). */
  requestAutonomousSuggestion(): void {
    const id = this.sessionId();
    if (!id || this.loadingAutonomous() || this.sending()) return;
    this.loadingAutonomous.set(true);
    const lang = this.i18n.currentLang() === 'en' ? 'en' : 'es';

    this.telemetry
      .generateAutonomousSuggestion(id, this.selectedProvider(), lang, this.buildTelemetryContext())
      .subscribe({
        next: (suggestion) => {
          this.pendingSuggestion.set(suggestion);
          this.loadingAutonomous.set(false);
          this.scrollToBottom();
          this.browserNotify.notify(`Maestro de Ceremonias · ${suggestion.title}`, suggestion.speech_text);
        },
        error: () => {
          this.loadingAutonomous.set(false);
        },
      });
  }

  /** Aprueba la sugerencia autónoma: la IA la dice en voz alta por Edge TTS y la guarda en memoria. */
  approveAutonomousSuggestion(): void {
    const suggestion = this.pendingSuggestion();
    if (!suggestion) return;
    this.pendingSuggestion.set(null);
    const spokenTurn: McAiChatTurn = {
      id: `auto-speech-${Date.now()}`,
      role: 'assistant',
      content: `**${suggestion.title}**`,
      speechText: suggestion.speech_text,
      createdAt: new Date().toISOString(),
      provider: suggestion.provider,
      model: suggestion.model,
    };
    this.messages.update((list) => [...list, spokenTurn]);
    this.scrollToBottom();
    this.speakText(suggestion.speech_text, true, suggestion.model);
  }

  dismissAutonomousSuggestion(): void {
    this.pendingSuggestion.set(null);
  }

  onApplyDjTransition(speak: boolean): void {
    const sug = this.djSuggestion();
    if (sug && speak) {
      const djTurn: McAiChatTurn = {
        id: `dj-speech-${Date.now()}`,
        role: 'assistant',
        content: `**DJ · ${sug.recommended_genre} (${sug.recommended_bpm})**`,
        speechText: sug.dj_shoutout,
        createdAt: new Date().toISOString(),
        provider: sug.provider,
        model: sug.model,
      };
      this.messages.update((list) => [...list, djTurn]);
      this.scrollToBottom();
    }
    this.applyDjTransition.emit(speak);
  }

  onDismissDjTransition(): void {
    this.dismissDjTransition.emit();
  }

  /** Sintetiza y reproduce texto en voz alta usando Edge TTS (`es-BO-MarceloNeural` / `en-US-AndrewNeural`). */
  speakText(text: string, recordInSession = false, modelName?: string): void {
    this.stopSpeaking();
    const lang = this.i18n.currentLang() === 'en' ? 'en' : 'es';
    const voice = lang === 'en' ? 'andrew' : 'marcelo';
    this.synthesizingVoice.set(true);
    this.errorMessage.set(null);

    this.telemetry
      .synthesizeMcSpeech({
        text,
        voice,
        language: lang,
        record_in_session_id: recordInSession ? this.sessionId() : null,
        provider: this.selectedProvider(),
        model: modelName,
      })
      .subscribe({
        next: (blob) => {
          this.synthesizingVoice.set(false);
          const url = URL.createObjectURL(blob);
          this.activeAudioUrl = url;
          const audio = new Audio(url);
          this.activeAudio = audio;
          audio.onplay = () => this.isSpeaking.set(true);
          audio.onended = () => this.stopSpeaking();
          audio.onerror = () => this.stopSpeaking();
          void audio.play().catch(() => {
            this.stopSpeaking();
          });
        },
        error: (err) => {
          this.synthesizingVoice.set(false);
          this.errorMessage.set(
            err?.error?.detail ?? 'No se pudo reproducir la voz del Maestro de Ceremonias.',
          );
        },
      });
  }

  stopSpeaking(): void {
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.src = '';
      this.activeAudio = null;
    }
    if (this.activeAudioUrl) {
      URL.revokeObjectURL(this.activeAudioUrl);
      this.activeAudioUrl = null;
    }
    this.isSpeaking.set(false);
  }

  sendQuickPrompt(translationKey: string): void {
    const text = this.i18n.translate(translationKey);
    this.sendMessage(text);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage(overrideText?: string): void {
    const text = (overrideText ?? this.draft()).trim();
    if (!text || this.sending()) return;

    const history = this.messages()
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.id !== 'welcome')
      .slice(-10)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const userTurn: McAiChatTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    this.messages.update((list) => [...list, userTurn]);
    if (!overrideText) {
      this.draft.set('');
    }
    this.sending.set(true);
    this.errorMessage.set(null);
    this.scrollToBottom();

    const lang = this.i18n.currentLang() === 'en' ? 'en' : 'es';

    this.telemetry
      .sendMcChatMessage(this.sessionId(), {
        message: text,
        provider: this.selectedProvider(),
        language: lang,
        history,
        telemetry: this.buildTelemetryContext(),
      })
      .subscribe({
        next: (response) => {
          const replyTurn: McAiChatTurn = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: response.reply,
            speechText: response.speech_text ?? null,
            createdAt: new Date().toISOString(),
            provider: response.provider,
            model: response.model,
          };
          this.messages.update((list) => [...list, replyTurn]);
          this.sending.set(false);
          this.scrollToBottom();
        },
        error: (err) => {
          this.sending.set(false);
          const detail = err?.error?.detail;
          this.errorMessage.set(
            typeof detail === 'string' && detail.trim()
              ? detail
              : this.i18n.translate('mc.chat.error'),
          );
          this.scrollToBottom();
        },
      });
  }

  chooseAlertAction(action: McAlertAction): void {
    if (!this.alertBusy()) {
      this.respondAlert.emit(action);
    }
  }

  formatMarkdown(content: string): string {
    return renderSafeMarkdown(content);
  }

  private startAutonomousLoop(): void {
    if (this.autonomousTimer) clearInterval(this.autonomousTimer);
    this.autonomousTimer = setInterval(() => {
      if (
        this.autonomousMode() &&
        !this.isSpeaking() &&
        !this.synthesizingVoice() &&
        !this.loadingWelcome() &&
        !this.loadingAutonomous() &&
        !this.sending() &&
        this.welcomeOptions().length === 0 &&
        this.pendingSuggestion() === null
      ) {
        this.requestAutonomousSuggestion();
      }
    }, AUTONOMOUS_INTERVAL_MS);
  }

  private loadHistory(sessionId: string): void {
    this.telemetry.getMcChatHistory(sessionId).subscribe({
      next: (history) => {
        this.eventTitleResolved.emit(history.event_title);
        const welcome: McAiChatTurn = {
          id: 'welcome',
          role: 'assistant',
          content: this.i18n.translate('mc.chat.welcome'),
          createdAt: new Date().toISOString(),
        };
        const restored: McAiChatTurn[] = history.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.created_at,
          provider: m.provider ?? undefined,
          model: m.model ?? undefined,
        }));
        this.messages.set(restored.length > 0 ? [welcome, ...restored] : [welcome]);
        this.scrollToBottom();

        // Si el evento acaba de iniciar y aún no tiene discursos/mensajes, generar las 2 propuestas de bienvenida
        if (restored.length === 0 && (!history.event_status || history.event_status === 'LIVE')) {
          this.requestWelcomeSpeeches();
        }
      },
      error: () => {
        this.eventTitleResolved.emit(null);
      },
    });
  }

  private loadModels(): void {
    this.telemetry.getAiModels().subscribe({
      next: (catalog) => {
        if (catalog.models.length > 0) {
          this.models.set(catalog.models);
        }
        this.selectedProvider.set(catalog.default_provider);
      },
      error: () => {
        // Mantiene los modelos por defecto (Gemini 3.8 Flash y Qwen 3.8)
      },
    });
  }

  private seedWelcomeMessage(): void {
    this.messages.set([
      {
        id: 'welcome',
        role: 'assistant',
        content: this.i18n.translate('mc.chat.welcome'),
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  private buildTelemetryContext(): McAiTelemetryContext | null {
    const cam = this.liveMetrics();
    if (cam) {
      return {
        signal_status: 'LIVE',
        traffic_light: cam.energy_traffic_light ?? null,
        attention_score: cam.attention_score,
        joy_score: cam.joy_score,
        inattention_score: cam.inattention_score,
        detected_faces_count: cam.detected_faces_count,
        dominant_age_group: cam.dominant_age_group ?? null,
      };
    }
    const snap = this.snapshot();
    if (snap) {
      return {
        signal_status: snap.signal_status,
        traffic_light: snap.traffic_light,
        energy_score: snap.energy_score,
        attention_score: snap.attention_score,
        joy_score: snap.joy_score,
        detected_faces_count: snap.detected_faces_count,
        trend: snap.trend,
        dominant_age_group: snap.dominant_age_group,
      };
    }
    return null;
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.messagesContainer?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }, 30);
  }
}
