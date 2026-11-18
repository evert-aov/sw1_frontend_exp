import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiveMetrics } from '../../../../core/models/live.model';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

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
  imports: [CommonModule, IconComponent],
  template: `
    <div
      class="p-6 rounded-3xl bg-white dark:bg-[#13121d] border border-slate-200 dark:border-white/10 shadow-lg transition-all"
    >
      <!-- Cabecera -->
      <div class="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 mb-5">
        <div class="flex items-center gap-3">
          <span class="relative flex h-2.5 w-2.5">
            @if (isConnected()) {
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            } @else {
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            }
          </span>
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Conexión de la Audiencia
            </h3>
            <p class="text-[11px] text-slate-400 dark:text-slate-500">Métricas en tiempo real</p>
          </div>
        </div>

        <!-- Badge de Personas Detectadas -->
        <div
          class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-medium"
        >
          <app-icon name="users" sizeClass="w-3.5 h-3.5 text-violet-500" />
          <span>{{ facesCount() }} {{ facesCount() === 1 ? 'persona' : 'asistentes' }}</span>
        </div>
      </div>

      <!-- Dial Principal: Nivel de Conexión & Semáforo -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center my-4">
        <!-- Indicador Radial / Porcentaje -->
        <div class="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
          <div class="relative flex items-center justify-center w-36 h-36">
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                class="stroke-slate-200 dark:stroke-white/10"
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
              <span class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {{ engagementPercent() }}%
              </span>
              <span class="text-[10px] font-semibold tracking-wider uppercase text-slate-400">Nivel de Conexión</span>
            </div>
          </div>
        </div>

        <!-- Semáforo Discreto de Energía -->
        <div class="flex flex-col justify-center space-y-3">
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Estado del Público
          </div>

          <div class="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
            <!-- Foco Verde -->
            <div
              class="flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200"
              [class]="
                trafficLight() === 'GREEN'
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600 border-transparent'
              "
              title="Energía Alta"
            >
              <app-icon name="check" sizeClass="w-4 h-4" />
            </div>

            <!-- Foco Amarillo -->
            <div
              class="flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200"
              [class]="
                trafficLight() === 'YELLOW'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600 border-transparent'
              "
              title="Atención Media"
            >
              <app-icon name="clock" sizeClass="w-4 h-4" />
            </div>

            <!-- Foco Rojo -->
            <div
              class="flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200"
              [class]="
                trafficLight() === 'RED'
                  ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600 border-transparent'
              "
              title="Desatención Detectada"
            >
              <app-icon name="exclamation-triangle" sizeClass="w-4 h-4" />
            </div>
          </div>

          <!-- Mensaje Descriptivo -->
          <p class="text-xs font-medium text-slate-600 dark:text-slate-300">
            {{ statusLabel() }}
          </p>
        </div>
      </div>

      <!-- Desglose de Expresiones -->
      <div class="mt-6 space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
        <div class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Distribución de Expresiones
        </div>

        <!-- 1. Alegría / Entusiasmo -->
        <div>
          <div class="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            <span class="inline-flex items-center gap-1.5">
              <app-icon name="sparkles" sizeClass="w-3.5 h-3.5 text-violet-500" />
              <span>Alegría y Entusiasmo</span>
            </span>
            <span class="font-bold text-violet-600 dark:text-violet-400">{{ joyPercent() }}%</span>
          </div>
          <div class="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
            <div
              class="h-full bg-violet-600 dark:bg-violet-500 rounded-full transition-all duration-300"
              [style.width.%]="joyPercent()"
            ></div>
          </div>
        </div>

        <!-- 2. Interés / Atención Activa -->
        <div>
          <div class="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            <span class="inline-flex items-center gap-1.5">
              <app-icon name="eye" sizeClass="w-3.5 h-3.5 text-emerald-500" />
              <span>Interés y Atención</span>
            </span>
            <span class="font-bold text-emerald-600 dark:text-emerald-400">{{ attentionPercent() }}%</span>
          </div>
          <div class="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
            <div
              class="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-300"
              [style.width.%]="attentionPercent()"
            ></div>
          </div>
        </div>

        <!-- 3. Desatención / Distracción -->
        <div>
          <div class="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            <span class="inline-flex items-center gap-1.5">
              <app-icon name="exclamation-triangle" sizeClass="w-3.5 h-3.5 text-rose-500" />
              <span>Desatención</span>
            </span>
            <span class="font-bold text-rose-600 dark:text-rose-400">{{ inattentionPercent() }}%</span>
          </div>
          <div class="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
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

  statusLabel = computed(() => {
    switch (this.trafficLight()) {
      case 'GREEN':
        return 'Público conectado y receptivo (Energía óptima)';
      case 'YELLOW':
        return 'Atención moderada con fluctuaciones';
      default:
        return 'Señal de desatención detectada en la sala';
    }
  });
}
