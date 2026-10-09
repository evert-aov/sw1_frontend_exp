import { Injectable } from '@angular/core';
import { Observable, EMPTY } from 'rxjs';
import { User, AuthResponse } from '../models/models';

// Servicio de autenticación: únicamente firmas de métodos (CU-01, CU-02)
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api';

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    // Firma de método para inicio de sesión
    return EMPTY;
  }

  register(userData: { first_name: string; email: string; password: string }): Observable<User> {
    // Firma de método para registro de usuario
    return EMPTY;
  }

  getProfile(): Observable<User> {
    // Firma de método para consulta de perfil actual
    return EMPTY;
  }

  updateProfile(profileData: Partial<User>): Observable<User> {
    // Firma de método para actualización de perfil
    return EMPTY;
  }

  logout(): void {
    // Firma de método para cierre de sesión
  }
}
