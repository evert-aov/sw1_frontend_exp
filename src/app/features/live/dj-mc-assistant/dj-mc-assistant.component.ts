import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dj-mc-assistant',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-6"><h2>Smart Host (MC & DJ) Assistant Component (CU-11, CU-12)</h2></div>`,
})
export class DjMcAssistantComponent {
  applySuggestion(suggestionId: number): void {
    // Firma para aceptar dinámica o cambio de BPM propuesto
  }

  dismissSuggestion(suggestionId: number): void {
    // Firma para descartar sugerencia
  }
}
