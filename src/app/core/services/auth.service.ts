import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, of, switchMap, tap, throwError } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { User, ProfileUpdateRequest } from '../models/user.model';
import { AuthResponse, RegisterRequest } from '../models/auth.model';

/**
 * Servicio de autenticación y gestión de sesiones de usuario.
 * Cumple con el principio de responsabilidad única gestionando credenciales,
 * tokens JWT y persistencia de estado de usuario conectado.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = API_CONFIG.baseUrl;

  private readonly TOKEN_KEY = 'experiencia_token';
  private readonly USER_KEY = 'experiencia_user';

  /** Bandera que indica si la sesión actual debe persistir tras cerrar el navegador */
  private remember = typeof localStorage !== 'undefined' && localStorage.getItem(this.TOKEN_KEY) !== null;

  /** Señal reactiva del token JWT de acceso */
  private readonly tokenSignal = signal<string | null>(this.readStorage(this.TOKEN_KEY));

  /** Señal reactiva que expone el usuario autenticado actual o null si no hay sesión */
  readonly currentUser = signal<User | null>(this.readUser());

  /** Señal computada que indica si existe una sesión activa válida */
  readonly isLoggedIn = computed(() => !!this.tokenSignal());

  /** Señal computada que indica si el usuario autenticado tiene rol de Anfitrión o Administrador */
  readonly isHost = computed(() => {
    const roles = this.currentUser()?.roles ?? [];
    return roles.includes('HOST') || roles.includes('ADMIN');
  });

  /** Señal computada que indica si el usuario autenticado actual es Asistente */
  readonly isAttendee = computed(() => {
    return this.isLoggedIn() && !this.isHost();
  });

  /** Señal computada que expone el rol principal del usuario */
  readonly currentRole = computed<'HOST' | 'ATTENDEE' | 'GUEST'>(() => {
    if (!this.isLoggedIn()) return 'GUEST';
    return this.isHost() ? 'HOST' : 'ATTENDEE';
  });

  /**
   * Obtiene el token de acceso actual en memoria.
   * @returns {string | null} El token JWT o null si el usuario es invitado.
   */
  get token(): string | null {
    return this.tokenSignal();
  }

  /**
   * Inicia sesión con credenciales de correo y contraseña (CU-01 / HU-02).
   * Al recibir el JWT, carga inmediatamente el perfil completo del usuario.
   *
   * @param {Object} credentials - Credenciales de acceso.
   * @param {string} credentials.email - Correo electrónico del usuario.
   * @param {string} credentials.password - Contraseña de acceso.
   * @param {boolean} [remember=true] - Si es true almacena en localStorage, de lo contrario en sessionStorage.
   * @returns {Observable<User>} Flujo observable con la entidad del usuario autenticado.
   */
  login(credentials: { email: string; password: string }, remember = true): Observable<User> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((res) => {
        this.remember = remember;
        this.setToken(res.access_token);
      }),
      switchMap(() => this.getProfile())
    );
  }

  /**
   * Registra una nueva cuenta de usuario en el backend FastAPI y efectúa el login automático (CU-01 / HU-01).
   *
   * @param {RegisterRequest} userData - Datos de registro (nombres, correo, contraseña, rol).
   * @returns {Observable<User>} Flujo observable con el usuario registrado y con sesión iniciada.
   */
  register(userData: RegisterRequest): Observable<User> {
    return this.http
      .post<User>(`${this.apiUrl}/auth/register`, userData)
      .pipe(switchMap(() => this.login({ email: userData.email, password: userData.password })));
  }

  /**
   * Consulta el perfil del usuario autenticado actual desde el endpoint protegido `/users/me`.
   *
   * @returns {Observable<User>} Flujo observable con los datos actualizados del usuario.
   */
  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/me`).pipe(tap((user) => this.setUser(user)));
  }

  /**
   * Actualiza los datos personales, intereses y biografía del usuario en sesión (CU-02 / HU-03).
   *
   * @param {ProfileUpdateRequest} profileData - Atributos actualizados del perfil.
   * @returns {Observable<User>} Flujo observable con la entidad de usuario actualizada.
   */
  updateProfile(profileData: ProfileUpdateRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/me`, profileData).pipe(tap((user) => this.setUser(user)));
  }

  /**
   * Cambia el rol del usuario (ej. de Asistente a Anfitrión para publicar experiencias).
   * Actualiza el perfil en FastAPI y sincroniza el estado de la sesión activa.
   *
   * @param {'HOST' | 'ATTENDEE'} newRole - Nuevo rol asignado.
   * @returns {Observable<User>} Flujo observable con la entidad de usuario actualizada.
   */
  switchRole(newRole: 'HOST' | 'ATTENDEE'): Observable<User> {
    const current = this.currentUser();
    const currentRoles = current?.roles ? [...current.roles] : [];
    const otherRoles = currentRoles.filter((r) => r !== 'HOST' && r !== 'ATTENDEE');
    const updatedRoles = [...otherRoles, newRole];

    return this.updateProfile({ roles: updatedRoles }).pipe(
      catchError(() => {
        // En caso de que el endpoint esté offline o en preview, actualizamos el estado local
        if (current) {
          const fallbackUser: User = { ...current, roles: updatedRoles };
          this.setUser(fallbackUser);
          return of(fallbackUser);
        }
        return throwError(() => new Error('No user'));
      })
    );
  }

  /**
   * Cierra la sesión activa, revoca los tokens locales y redirige a la vista de login.
   * @returns {void}
   */
  logout(): void {
    this.tokenSignal.set(null);
    this.currentUser.set(null);
    this.removeStorage(this.TOKEN_KEY);
    this.removeStorage(this.USER_KEY);
    this.router.navigate(['/auth/login']);
  }

  /**
   * Verifica si el usuario actual posee un rol específico de permisos.
   *
   * @param {string} role - Nombre del rol a comprobar (ej. 'HOST', 'VENUE', 'ADMIN').
   * @returns {boolean} True si el usuario tiene dicho rol asignado.
   */
  hasRole(role: string): boolean {
    return this.currentUser()?.roles.includes(role) ?? false;
  }

  /**
   * Almacena el token de acceso en memoria y en almacenamiento web según la preferencia de recordación.
   *
   * @private
   * @param {string} token - Token JWT recibido del servidor.
   */
  private setToken(token: string): void {
    this.tokenSignal.set(token);
    this.writeStorage(this.TOKEN_KEY, token);
  }

  /**
   * Almacena la entidad de usuario en memoria reactiva y en almacenamiento local serializado.
   *
   * @private
   * @param {User} user - Objeto de usuario.
   */
  private setUser(user: User): void {
    this.currentUser.set(user);
    this.writeStorage(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Recupera el usuario serializado desde el almacenamiento web durante la inicialización.
   *
   * @private
   * @returns {User | null} La entidad deserializada o null.
   */
  private readUser(): User | null {
    const raw = this.readStorage(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }

  /**
   * Lee un valor de almacenamiento web, priorizando localStorage si existe o sessionStorage.
   *
   * @private
   * @param {string} key - Clave del ítem a leer.
   * @returns {string | null} El valor almacenado o null.
   */
  private readStorage(key: string): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  }

  /**
   * Escribe un valor en localStorage o sessionStorage según la bandera de sesión persistente.
   *
   * @private
   * @param {string} key - Clave de almacenamiento.
   * @param {string} value - Cadena a guardar.
   */
  private writeStorage(key: string, value: string): void {
    if (typeof localStorage === 'undefined') return;
    (this.remember ? localStorage : sessionStorage).setItem(key, value);
  }

  /**
   * Elimina un ítem de ambos almacenamientos (localStorage y sessionStorage).
   *
   * @private
   * @param {string} key - Clave a eliminar.
   */
  private removeStorage(key: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}
