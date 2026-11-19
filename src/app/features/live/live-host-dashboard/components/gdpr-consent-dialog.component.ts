import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
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
  imports: [TranslatePipe, IconComponent],
  template: `
    <div
      class="p-6 rounded-2xl bg-[var(--ui-surface)] border border-[var(--ui-border)] shadow-xs transition-all"
    >
      <div class="flex items-start gap-4">
        <div class="p-2.5 rounded-xl bg-[var(--ui-accent-soft)] text-[var(--ui-accent)] shrink-0">
          <app-icon name="shield-check" sizeClass="w-6 h-6" />
        </div>

        <div class="flex-1 space-y-2">
          <h4 class="font-editorial text-base font-bold text-[var(--ui-text)]">
            {{ 'live.gdpr.title' | translate }}
          </h4>
          <p class="text-xs text-[var(--ui-muted)] leading-relaxed">
            {{ 'live.gdpr.description' | translate }}
          </p>
          <p class="text-xs text-[var(--ui-text)] font-medium leading-relaxed bg-[var(--ui-surface-soft)] p-2.5 rounded-lg border border-[var(--ui-border)]">
            {{ 'live.gdpr.guarantee' | translate }}
          </p>

          <div class="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              (click)="onAccept()"
              class="px-4 py-2 rounded-xl bg-[var(--ui-accent)] hover:bg-[var(--ui-accent-hover)] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              {{ 'live.gdpr.accept' | translate }}
            </button>
            <button
              type="button"
              (click)="onDecline()"
              class="px-4 py-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-soft)] hover:bg-[var(--ui-surface)] text-[var(--ui-text)] text-xs font-semibold transition-all cursor-pointer"
            >
              {{ 'live.gdpr.decline' | translate }}
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
