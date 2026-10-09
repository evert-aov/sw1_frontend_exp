import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-experience-detail',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-6"><h2>Experience Detail Component</h2></div>`,
})
export class ExperienceDetailComponent {
  onReserveClick(): void {
    // Firma para redirigir a checkout
  }

  onJoinMatchingClick(): void {
    // Firma para unirse al matching si faltan cupos
  }
}
