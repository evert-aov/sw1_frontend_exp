import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-experience',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-6"><h2>Create Experience Component (CU-03)</h2></div>`,
})
export class CreateExperienceComponent {
  onSubmitExperience(): void {
    // Firma para publicar experiencia definiendo aforo, modalidad y precio
  }
}
