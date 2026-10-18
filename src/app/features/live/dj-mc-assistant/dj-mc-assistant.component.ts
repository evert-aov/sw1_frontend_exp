import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-dj-mc-assistant',
  imports: [],
  templateUrl: './dj-mc-assistant.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DjMcAssistantComponent {
  applySuggestion(suggestionId: number): void {
    // Firma para aceptar dinámica o cambio de BPM propuesto
  }

  dismissSuggestion(suggestionId: number): void {
    // Firma para descartar sugerencia
  }
}
