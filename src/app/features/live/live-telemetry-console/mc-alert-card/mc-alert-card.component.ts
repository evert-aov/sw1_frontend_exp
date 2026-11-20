import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { McAlert } from '../../../../core/models/live-telemetry.model';
import { I18nService } from '../../../../core/services/i18n.service';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

/** Respuesta del moderador a una alerta del Asistente MC. */
export type McAlertAction = 'apply' | 'dismiss' | 'next';

/**
 * Tarjeta flotante y discreta del Asistente de Maestro de Ceremonias (CU-11 / HU-18, HU-19).
 *
 * Responsabilidad:
 * - Avisar que la atención del público lleva varios minutos baja y proponer una dinámica.
 * - Ofrecer acciones rápidas: aplicar ("Lanzar pregunta", "Iniciar pausa"), otra idea o descartar.
 * - Mostrar la cuenta regresiva de la pausa aplicada y avisar al terminar con `breakFinished`.
 */
@Component({
  selector: 'app-mc-alert-card',
  imports: [IconComponent, TranslatePipe],
  templateUrl: './mc-alert-card.component.html',
  styleUrl: './mc-alert-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class McAlertCardComponent {
  private readonly i18n = inject(I18nService);

  /** Alerta vigente recibida por el canal de telemetría. */
  readonly alert = input.required<McAlert>();

  /** Verdadero mientras se envía una respuesta al servidor. */
  readonly busy = input<boolean>(false);

  /** Mensaje de error de la última respuesta, si falló. */
  readonly error = input<boolean>(false);

  /** Respuesta elegida por el moderador. */
  readonly respond = output<McAlertAction>();

  /** Se emite cuando termina la cuenta regresiva de una pausa aplicada. */
  readonly breakFinished = output<void>();

  /** Reloj que avanza cada segundo durante una pausa. */
  readonly now = signal(Date.now());

  /** Verdadero si la alerta espera respuesta del moderador. */
  readonly isActive = computed(() => this.alert().status === 'ACTIVE');

  /** Clave del texto del resultado según cómo terminó la alerta. */
  readonly resolvedKey = computed(() => {
    const status = this.alert().status;
    if (status === 'DISMISSED') return 'mc.dismissed';
    if (status === 'EXPIRED') return 'mc.expired';
    return 'mc.applied';
  });

  /** Milisegundos restantes de la pausa aplicada, o 0 si no hay pausa en curso. */
  readonly breakRemainingMs = computed(() => {
    const ends = this.alert().break_ends_at;
    if (this.alert().status !== 'APPLIED' || !ends) return 0;
    return Math.max(0, Date.parse(ends) - this.now());
  });

  /** Cuenta regresiva de la pausa en formato m:ss. */
  readonly breakCountdown = computed(() => {
    const totalSeconds = Math.ceil(this.breakRemainingMs() / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  });

  /** Título de la dinámica en el idioma activo. */
  readonly dynamicTitle = computed(() => {
    const dynamic = this.alert().dynamic;
    if (!dynamic) return '';
    return this.i18n.currentLang() === 'en' ? dynamic.title_en : dynamic.title_es;
  });

  /** Instrucciones de la dinámica en el idioma activo. */
  readonly dynamicInstructions = computed(() => {
    const dynamic = this.alert().dynamic;
    if (!dynamic) return '';
    return this.i18n.currentLang() === 'en' ? dynamic.instructions_en : dynamic.instructions_es;
  });

  /** Minutos de atención baja, redondeados. */
  readonly lowMinutes = computed(() => Math.round(this.alert().low_attention_seconds / 60));

  /** Atención media de la caída en porcentaje, o null si no se conoce. */
  readonly averagePercent = computed(() => {
    const value = this.alert().average_attention;
    return value === null ? null : Math.round(value * 100);
  });

  /**
   * Avanza el reloj cada segundo mientras haya una pausa en curso y avisa al terminar.
   */
  constructor() {
    effect((onCleanup) => {
      const alert = this.alert();
      if (alert.status !== 'APPLIED' || !alert.break_ends_at) return;
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
  }

  /**
   * Envía la respuesta del moderador si no hay otra en curso.
   *
   * @param {McAlertAction} action - Acción elegida.
   * @returns {void}
   */
  choose(action: McAlertAction): void {
    if (!this.busy()) this.respond.emit(action);
  }
}
