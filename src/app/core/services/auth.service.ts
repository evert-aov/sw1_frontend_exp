import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, switchMap, tap } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { User, AuthResponse, RegisterRequest, ProfileUpdateRequest } from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = API_CONFIG.baseUrl;

  private readonly TOKEN_KEY = 'experiencia_token';
  private readonly USER_KEY = 'experiencia_user';

  private remember = typeof localStorage !== 'undefined' && localStorage.getItem(this.TOKEN_KEY) !== null;

  private readonly tokenSignal = signal<string | null>(this.readStorage(this.TOKEN_KEY));
  readonly currentUser = signal<User | null>(this.readUser());
  readonly isLoggedIn = computed(() => !!this.tokenSignal());

  get token(): string | null {
    return this.tokenSignal();
  }

  login(credentials: { email: string; password: string }, remember = true): Observable<User> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((res) => {
        this.remember = remember;
        this.setToken(res.access_token);
      }),
      switchMap(() => this.getProfile())
    );
  }

  register(userData: RegisterRequest): Observable<User> {
    return this.http
      .post<User>(`${this.apiUrl}/auth/register`, userData)
      .pipe(switchMap(() => this.login({ email: userData.email, password: userData.password })));
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/me`).pipe(tap((user) => this.setUser(user)));
  }

  updateProfile(profileData: ProfileUpdateRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/me`, profileData).pipe(tap((user) => this.setUser(user)));
  }

  logout(): void {
    this.tokenSignal.set(null);
    this.currentUser.set(null);
    this.removeStorage(this.TOKEN_KEY);
    this.removeStorage(this.USER_KEY);
    this.router.navigate(['/auth/login']);
  }

  hasRole(role: string): boolean {
    return this.currentUser()?.roles.includes(role) ?? false;
  }

  private setToken(token: string): void {
    this.tokenSignal.set(token);
    this.writeStorage(this.TOKEN_KEY, token);
  }

  private setUser(user: User): void {
    this.currentUser.set(user);
    this.writeStorage(this.USER_KEY, JSON.stringify(user));
  }

  private readUser(): User | null {
    const raw = this.readStorage(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }

  private readStorage(key: string): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  }

  private writeStorage(key: string, value: string): void {
    if (typeof localStorage === 'undefined') return;
    (this.remember ? localStorage : sessionStorage).setItem(key, value);
  }

  private removeStorage(key: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}
