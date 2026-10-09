import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-6"><h2>Register Component (CU-01)</h2></div>`,
})
export class RegisterComponent {
  onSubmit(): void {
    // Firma para registrar cuenta
  }
}
