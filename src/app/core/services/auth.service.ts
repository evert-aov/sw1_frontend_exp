import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, of, switchMap, tap, throwError } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { User, ProfileUpdateRequest, UserRole } from '../models/user.model';
import { AuthResponse, RegisterRequest } from '../models/auth.model';

/**
 * Roles estandarizados y normalizados en la plataforma.
 */
export type RoleMode = 'HOST' | 'ATTENDEE' | 'GUEST';

/**
 * Servicio Reutilizable de Autenticación y Gestión Centralizada de Roles (CU-01, CU-02).
 *
 * Cumple con los principios de:
 * - **Alta Cohesión**: Centraliza exclusivamente el estado de sesión del usuario (JWT, almacenamiento local),
 *   la resolución de roles ('host' vs 'attendee') y los métodos de mutación de identidad.
 * - **Bajo Acoplamiento**: Expone señales reactivas (`Signal<T>`) y observables (`Observable<T>`)
 *   sin atarse a ninguna vista o componente específico.
 * - **Inyección Directa en Plantillas**: Diseñado para ser inyectado como propiedad pública (`readonly auth = inject(AuthService)`)
 *   en cualquier componente de Angular, permitiendo evaluar directamente en los templates directivas como
 *   `@if (auth.isHost())`, `@if (auth.isAttendee())`, `@if (auth.isLoggedIn())`, `{{ auth.userFullName() }}`, etc.
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

  /** Bandera que indica si la sesión actual debe persistir en localStorage o sessionStorage */
  private remember = typeof localStorage !== 'undefined' && localStorage.getItem(this.TOKEN_KEY) !== null;

  /** Señal reactiva interna del token JWT de acceso */
  private readonly tokenSignal = signal<string | null>(this.readStorage(this.TOKEN_KEY));

  /**
   * Señal reactiva pública con la entidad del usuario actualmente autenticado o `null`.
   */
  readonly currentUser = signal<User | null>(this.readUser());

  /**
   * Señal computada que indica si existe una sesión activa válida con token.
   */
  readonly isLoggedIn = computed<boolean>(() => !!this.tokenSignal());

  /**
   * Señal computada que indica si el visitante actual es un invitado no autenticado.
   */
  readonly isGuest = computed<boolean>(() => !this.isLoggedIn());

  /**
   * Señal computada que indica si el usuario posee rol de Anfitrión ('HOST' / 'host') o Administrador ('ADMIN' / 'admin').
   * Permite publicar experiencias, supervisar consolas en vivo y acceder a analíticas de demanda insatisfecha.
   */
  readonly isHost = computed<boolean>(() => {
    if (!this.isLoggedIn()) return false;
    const roles = (this.currentUser()?.roles ?? []).map((r) => String(r).toUpperCase());
    return roles.includes('HOST') || roles.includes('ADMIN');
  });

  /**
   * Señal computada que indica si el usuario posee rol de Asistente ('ATTENDEE' / 'attendee').
   * En caso de estar autenticado y no ser Anfitrión, el sistema lo trata con privilegio de Asistente.
   * Los asistentes disfrutan de catálogo, compra de entradas, gestión de tickets y la App Móvil.
   */
  readonly isAttendee = computed<boolean>(() => {
    return this.isLoggedIn() && !this.isHost();
  });

  /**
   * Señal computada que expone el rol actual normalizado ('HOST' | 'ATTENDEE' | 'GUEST').
   */
  readonly currentRole = computed<RoleMode>(() => {
    if (!this.isLoggedIn()) return 'GUEST';
    return this.isHost() ? 'HOST' : 'ATTENDEE';
  });

  /**
   * Señal computada con el nombre legible en español del rol activo para visualización en plantillas.
   */
  readonly roleLabel = computed<string>(() => {
    switch (this.currentRole()) {
      case 'HOST':
        return 'Anfitrión';
      case 'ATTENDEE':
        return 'Asistente';
      default:
        return 'Invitado';
    }
  });

  /**
   * Señal computada con el nombre completo del usuario para badges de avatar o perfiles.
   */
  readonly userFullName = computed<string>(() => {
    const user = this.currentUser();
    if (!user) return '';
    return `${user.first_name} ${user.last_name ?? ''}`.trim();
  });

  /**
   * Señal computada con las iniciales (1 o 2 letras) del usuario para avatares circulares sin foto.
   */
  readonly userInitials = computed<string>(() => {
    const user = this.currentUser();
    if (!user || !user.first_name) return '';
    const first = user.first_name.charAt(0);
    const last = user.last_name?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase();
  });

  /**
   * Señal computada con el correo del usuario actual.
   */
  readonly userEmail = computed<string>(() => {
    return this.currentUser()?.email ?? '';
  });

  /**
   * Señal computada que verifica si el usuario actual cuenta con permisos para crear y publicar experiencias.
   * Es estrictamente verdadero solo para Anfitriones y Administradores.
   */
  readonly canPublishExperiences = computed<boolean>(() => {
    return this.isHost();
  });

  /**
   * Señal computada que verifica si el usuario debe ser canalizado hacia la App Móvil para sus entradas y QR.
   */
  readonly isMobileAppTarget = computed<boolean>(() => {
    return this.isAttendee();
  });

  /**
   * Getter para consultar de forma síncrona el token JWT en memoria.
   *
   * @returns {string | null} El token de autenticación o null si no hay sesión.
   */
  get token(): string | null {
    return this.tokenSignal();
  }

  /**
   * Inicia sesión en la plataforma con correo electrónico y contraseña (CU-01 / HU-02).
   * Al completarse la respuesta del backend FastAPI, almacena el token JWT y recupera el perfil completo del usuario.
   *
   * @param {Object} credentials - Objeto con credenciales.
   * @param {string} credentials.email - Correo del usuario.
   * @param {string} credentials.password - Contraseña del usuario.
   * @param {boolean} [remember=true] - Si es verdadero, persiste en localStorage; si es falso, en sessionStorage.
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
   * Registra una nueva cuenta de usuario en el backend FastAPI y efectúa inicio de sesión automático (CU-01 / HU-01).
   *
   * @param {RegisterRequest} userData - Datos de registro (nombres, correo, contraseña, rol sugerido).
   * @returns {Observable<User>} Flujo observable con el usuario registrado y con sesión iniciada.
   */
  register(userData: RegisterRequest): Observable<User> {
    return this.http
      .post<User>(`${this.apiUrl}/auth/register`, userData)
      .pipe(switchMap(() => this.login({ email: userData.email, password: userData.password })));
  }

  /**
   * Consulta los datos actualizados del usuario en sesión desde el endpoint protegido `/users/me`.
   *
   * @returns {Observable<User>} Flujo observable con el perfil sincronizado.
   */
  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/me`).pipe(tap((user) => this.setUser(user)));
  }

  /**
   * Actualiza los datos de perfil, preferencias e intereses del usuario autenticado (CU-02 / HU-03).
   *
   * @param {ProfileUpdateRequest} profileData - Atributos a modificar.
   * @returns {Observable<User>} Flujo observable con el usuario modificado.
   */
  updateProfile(profileData: ProfileUpdateRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/me`, profileData).pipe(tap((user) => this.setUser(user)));
  }

  /**
   * Conmuta dinámicamente el rol del usuario entre Asistente ('ATTENDEE') y Anfitrión ('HOST').
   * Soporta tanto cadenas mayúsculas como minúsculas ('host', 'attendee').
   * Permite que un asistente se convierta en anfitrión para publicar eventos web o viceversa.
   *
   * @param {'HOST' | 'ATTENDEE' | 'host' | 'attendee' | string} targetRole - Nuevo rol asignado.
   * @returns {Observable<User>} Flujo observable con el perfil y roles actualizados.
   */
  switchRole(targetRole: 'HOST' | 'ATTENDEE' | 'host' | 'attendee' | string): Observable<User> {
    const normalized = String(targetRole).toUpperCase() as UserRole;
    const current = this.currentUser();
    const currentRoles = current?.roles ? [...current.roles] : [];
    const otherRoles = currentRoles.filter(
      (r) => r.toUpperCase() !== 'HOST' && r.toUpperCase() !== 'ATTENDEE'
    );
    const updatedRoles = [...otherRoles, normalized];

    return this.updateProfile({ roles: updatedRoles }).pipe(
      catchError(() => {
        // En caso de que el backend esté en modo simulado o fallback local
        if (current) {
          const fallbackUser: User = { ...current, roles: updatedRoles };
          this.setUser(fallbackUser);
          return of(fallbackUser);
        }
        return throwError(() => new Error('No active user session to switch role'));
      })
    );
  }

  /**
   * Comprueba de manera insensible a mayúsculas si el usuario posee un rol determinado.
   *
   * @param {string} role - Nombre del rol a comprobar (ej. 'host', 'HOST', 'attendee', 'ATTENDEE').
   * @returns {boolean} True si el usuario tiene dicho rol concedido.
   */
  hasRole(role: string): boolean {
    if (!this.isLoggedIn()) return false;
    const target = role.toUpperCase();
    const roles = (this.currentUser()?.roles ?? []).map((r) => String(r).toUpperCase());
    return roles.includes(target);
  }

  /**
   * Comprueba si el usuario posee al menos uno de los roles solicitados en la lista.
   *
   * @param {string[]} roles - Lista de nombres de rol.
   * @returns {boolean} True si coincide con cualquiera de los roles.
   */
  hasAnyRole(roles: string[]): boolean {
    return roles.some((r) => this.hasRole(r));
  }

  /**
   * Cierra la sesión activa del usuario, limpia tokens del almacenamiento y redirige a `/auth/login`.
   *
   * @returns {void}
   */
  logout(): void {
    this.clearAuth();
    this.router.navigate(['/auth/login']);
  }

  /**
   * Limpia inmediatamente el estado reactivo en memoria y purga los tokens de localStorage y sessionStorage.
   *
   * @returns {void}
   */
  clearAuth(): void {
    this.tokenSignal.set(null);
    this.currentUser.set(null);
    this.removeStorage(this.TOKEN_KEY);
    this.removeStorage(this.USER_KEY);
  }

  /**
   * Almacena el token de acceso en memoria y persiste según la configuración de recordación.
   *
   * @private
   * @param {string} token - Token JWT.
   */
  private setToken(token: string): void {
    this.tokenSignal.set(token);
    this.writeStorage(this.TOKEN_KEY, token);
  }

  /**
   * Sincroniza la entidad de usuario en memoria reactiva y en almacenamiento local serializado.
   *
   * @private
   * @param {User} user - Objeto de usuario.
   */
  private setUser(user: User): void {
    this.currentUser.set(user);
    this.writeStorage(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Deserializa la entidad de usuario desde el almacenamiento web durante el arranque.
   *
   * @private
   * @returns {User | null} La entidad deserializada o null si no existe o es inválida.
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
   * Lee un valor de almacenamiento web priorizando localStorage sobre sessionStorage.
   *
   * @private
   * @param {string} key - Clave del ítem.
   * @returns {string | null} El valor encontrado o null.
   */
  private readStorage(key: string): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  }

  /**
   * Escribe una clave/valor en el almacenamiento web correspondiente (local o sesión).
   *
   * @private
   * @param {string} key - Clave del ítem.
   * @param {string} value - Valor textual a almacenar.
   */
  private writeStorage(key: string, value: string): void {
    if (typeof localStorage === 'undefined') return;
    (this.remember ? localStorage : sessionStorage).setItem(key, value);
  }

  /**
   * Elimina un ítem tanto de localStorage como de sessionStorage para garantizar cierre de sesión limpio.
   *
   * @private
   * @param {string} key - Clave del ítem a remover.
   */
  private removeStorage(key: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}
