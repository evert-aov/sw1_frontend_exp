import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiveMetrics } from '../../../../core/models/live.model';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

/**
 * Widget de Conexión de Audiencia y Estado del Público en Tiempo Real.
 *
 * Responsabilidad:
 * - Representación visual del nivel de conexión (0% a 100%).
 * - Desglose de tres estados: Alegría/Entusiasmo, Atención Activa y Desatención.
 * - Indicador visual discreto de energía.
 * - Estilo limpio, accesible y sin tecnicismos para el anfitrión.
 */
@Component({
  selector: 'app-live-engagement-widget',
  standalone: true,
  imports: [CommonModule, IconComponent, TranslatePipe],
  template: `
    <div
      class="p-6 sm:p-7 rounded-2xl bg-[var(--ui-surface)] border border-[var(--ui-border)] shadow-xs transition-all"
    >
      <!-- Cabecera -->
      <div class="flex items-center justify-between border-b border-[var(--ui-border)] pb-4 mb-5">
        <div class="flex items-center gap-3">
          <span class="relative flex h-2.5 w-2.5">
            @if (isConnected()) {
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            } @else {
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            }
          </span>
          <div>
            <h3 class="font-editorial text-sm font-bold text-[var(--ui-text)]">
              {{ 'live.widget.title' | translate }}
            </h3>
            <p class="text-[11px] text-[var(--ui-muted)]">{{ 'live.widget.subtitle' | translate }}</p>
          </div>
        </div>

        <!-- Badge de Personas Detectadas -->
        <div
          class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--ui-surface-soft)] border border-[var(--ui-border)] text-[var(--ui-text)] text-xs font-medium"
        >
          <app-icon name="users" sizeClass="w-3.5 h-3.5 text-[var(--ui-accent)]" />
          <span>{{ facesCount() }} {{ (facesCount() === 1 ? 'live.widget.person' : 'live.widget.attendees') | translate }}</span>
        </div>
      </div>

      <!-- Dial Principal: Nivel de Conexión & Semáforo -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center my-4">
        <!-- Indicador Radial / Porcentaje -->
        <div class="flex flex-col items-center justify-center p-4 rounded-xl bg-[var(--ui-surface-soft)] border border-[var(--ui-border)]">
          <div class="relative flex items-center justify-center w-36 h-36">
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                class="stroke-black/10 dark:stroke-white/10"
                stroke-width="7"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                [attr.stroke]="scoreColor()"
                stroke-width="7"
                stroke-dasharray="251.2"
                [attr.stroke-dashoffset]="251.2 - (251.2 * engagementPercent()) / 100"
                stroke-linecap="round"
                fill="none"
                class="transition-all duration-500"
              />
            </svg>

            <div class="absolute flex flex-col items-center">
              <span class="font-editorial text-3xl font-bold text-[var(--ui-text)] tracking-tight">
                {{ engagementPercent() }}%
              </span>
              <span class="text-[10px] font-semibold tracking-wider uppercase text-[var(--ui-muted)]">
                {{ 'live.widget.connectionLevel' | translate }}
              </span>
            </div>
          </div>
        </div>

        <!-- Semáforo Discreto de Energía -->
        <div class="flex flex-col justify-center space-y-3">
          <div class="text-xs font-semibold text-[var(--ui-muted)] uppercase tracking-wider">
            {{ 'live.widget.audienceStatus' | translate }}
          </div>

          <div class="flex items-center gap-3 p-3 rounded-xl bg-[var(--ui-surface-soft)] border border-[var(--ui-border)]">
            <!-- Foco Verde -->
            <div
              class="flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200"
              [class]="
                trafficLight() === 'GREEN'
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                  : 'bg-black/5 dark:bg-white/5 text-[var(--ui-muted)] border-transparent'
              "
              [title]="'live.widget.energyHigh' | translate"
            >
              <app-icon name="check" sizeClass="w-4 h-4" />
            </div>

            <!-- Foco Amarillo -->
            <div
              class="flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200"
              [class]="
                trafficLight() === 'YELLOW'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-black/5 dark:bg-white/5 text-[var(--ui-muted)] border-transparent'
              "
              [title]="'live.widget.energyMedium' | translate"
            >
              <app-icon name="clock" sizeClass="w-4 h-4" />
            </div>

            <!-- Foco Rojo -->
            <div
              class="flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200"
              [class]="
                trafficLight() === 'RED'
                  ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                  : 'bg-black/5 dark:bg-white/5 text-[var(--ui-muted)] border-transparent'
              "
              [title]="'live.widget.energyLow' | translate"
            >
              <app-icon name="exclamation-triangle" sizeClass="w-4 h-4" />
            </div>
          </div>

          <!-- Mensaje Descriptivo -->
          <p class="text-xs font-medium text-[var(--ui-text)]">
            {{ statusKey() | translate }}
          </p>
        </div>
      </div>

      <!-- Desglose de Expresiones -->
      <div class="mt-6 space-y-4 pt-4 border-t border-[var(--ui-border)]">
        <div class="text-xs font-semibold uppercase tracking-wider text-[var(--ui-muted)]">
          {{ 'live.widget.expressions' | translate }}
        </div>

        <!-- 1. Alegría / Entusiasmo -->
        <div>
          <div class="flex justify-between text-xs font-medium text-[var(--ui-text)] mb-1.5">
            <span class="inline-flex items-center gap-1.5">
              <app-icon name="sparkles" sizeClass="w-3.5 h-3.5 text-[var(--ui-accent)]" />
              <span>{{ 'live.widget.joy' | translate }}</span>
            </span>
            <span class="font-bold text-[var(--ui-accent)]">{{ joyPercent() }}%</span>
          </div>
          <div class="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
            <div
              class="h-full bg-[var(--ui-accent)] rounded-full transition-all duration-300"
              [style.width.%]="joyPercent()"
            ></div>
          </div>
        </div>

        <!-- 2. Interés / Atención Activa -->
        <div>
          <div class="flex justify-between text-xs font-medium text-[var(--ui-text)] mb-1.5">
            <span class="inline-flex items-center gap-1.5">
              <app-icon name="eye" sizeClass="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{{ 'live.widget.attention' | translate }}</span>
            </span>
            <span class="font-bold text-emerald-600 dark:text-emerald-400">{{ attentionPercent() }}%</span>
          </div>
          <div class="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
            <div
              class="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-300"
              [style.width.%]="attentionPercent()"
            ></div>
          </div>
        </div>

        <!-- 3. Desatención / Distracción -->
        <div>
          <div class="flex justify-between text-xs font-medium text-[var(--ui-text)] mb-1.5">
            <span class="inline-flex items-center gap-1.5">
              <app-icon name="exclamation-triangle" sizeClass="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>{{ 'live.widget.inattention' | translate }}</span>
            </span>
            <span class="font-bold text-rose-600 dark:text-rose-400">{{ inattentionPercent() }}%</span>
          </div>
          <div class="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
            <div
              class="h-full bg-rose-600 dark:bg-rose-500 rounded-full transition-all duration-300"
              [style.width.%]="inattentionPercent()"
            ></div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveEngagementWidgetComponent {
  /** Métricas en tiempo real recibidas por el canal WebSocket */
  metrics = input<LiveMetrics | null>(null);

  /** Estado de conectividad del socket */
  isConnected = input<boolean>(true);

  /** Nivel de conexión consolidado (0-100) */
  engagementPercent = computed(() => {
    const m = this.metrics();
    if (!m) return 0;
    const score = m.attention_score > 1 ? m.attention_score : m.attention_score * 100;
    return Math.min(100, Math.max(0, Math.round(score)));
  });

  joyPercent = computed(() => {
    const raw = this.metrics()?.joy_score ?? 0;
    return Math.min(100, Math.max(0, Math.round(raw > 1 ? raw : raw * 100)));
  });

  attentionPercent = computed(() => {
    const raw = this.metrics()?.attention_score ?? 0;
    return Math.min(100, Math.max(0, Math.round(raw > 1 ? raw : raw * 100)));
  });

  inattentionPercent = computed(() => {
    const raw = this.metrics()?.inattention_score ?? 0;
    return Math.min(100, Math.max(0, Math.round(raw > 1 ? raw : raw * 100)));
  });

  facesCount = computed(() => this.metrics()?.detected_faces_count ?? 0);

  trafficLight = computed<'GREEN' | 'YELLOW' | 'RED'>(() => {
    return this.metrics()?.energy_traffic_light ?? 'RED';
  });

  scoreColor = computed(() => {
    switch (this.trafficLight()) {
      case 'GREEN':
        return '#059669'; // emerald-600
      case 'YELLOW':
        return '#d97706'; // amber-600
      default:
        return '#e11d48'; // rose-600
    }
  });

  statusKey = computed(() => {
    switch (this.trafficLight()) {
      case 'GREEN':
        return 'live.widget.statusGreen';
      case 'YELLOW':
        return 'live.widget.statusYellow';
      default:
        return 'live.widget.statusRed';
    }
  });
}
