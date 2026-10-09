import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-matching-groups',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-6"><h2>Matching Groups Component (CU-07)</h2></div>`,
})
export class MatchingGroupsComponent {
  onJoinQuorum(): void {
    // Firma para postular al quórum de una experiencia
  }
}
