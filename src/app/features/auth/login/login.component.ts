import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-6"><h2>Login Component (CU-01)</h2></div>`,
})
export class LoginComponent {
  onSubmit(): void {
    // Firma para enviar credenciales de login
  }
}
