import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

/**
 * Componente de Consentimiento Informado GDPR (HU-14).
 *
 * Requisito estricto:
 * El usuario moderador o participante debe ser notificado explícitamente de que
 * el análisis de video se procesa de forma efímera en memoria RAM y se destruye
 * inmediatamente sin persistencia biométrica en disco.
 */
@Component({
  selector: 'app-gdpr-consent-dialog',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div
      class="p-5 rounded-2xl bg-violet-50/70 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/40"
    >
      <div class="flex items-start gap-4">
        <div class="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
          <app-icon name="shield-check" sizeClass="w-6 h-6" />
        </div>

        <div class="flex-1">
          <h4 class="text-sm font-bold text-slate-900 dark:text-white">
            Aviso de Privacidad y Monitoreo en Vivo
          </h4>
          <p class="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
            Esta experiencia analiza de forma anónima la receptividad de la audiencia para que el organizador pueda optimizar la dinámica del evento.
            <strong>Garantía de Privacidad:</strong> El análisis se procesa en tiempo real sin almacenar fotos, videos ni registros biométricos en disco o base de datos.
          </p>

          <div class="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              (click)="onAccept()"
              class="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              Aceptar y Continuar
            </button>
            <button
              type="button"
              (click)="onDecline()"
              class="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Solo Monitorear sin Cámara
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GdprConsentDialogComponent {
  accepted = output<boolean>();

  onAccept(): void {
    this.accepted.emit(true);
  }

  onDecline(): void {
    this.accepted.emit(false);
  }
}
