import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-6"><h2>Profile Component (CU-02)</h2></div>`,
})
export class ProfileComponent {
  onSaveProfile(): void {
    // Firma para actualizar preferencias
  }
}
