import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { API_CONFIG } from '../config/api.config';

const user = { id: 'user-id', first_name: 'Test', email: 'test@example.com', roles: ['ATTENDEE'], interests: [] };

describe('AuthService contracts', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  const router = { navigate: vi.fn() };

  beforeEach(() => {
    const storage = () => {
      const values = new Map<string, string>();
      return { getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key), clear: () => values.clear() };
    };
    vi.stubGlobal('localStorage', storage()); vi.stubGlobal('sessionStorage', storage());
    router.navigate.mockReset();
    localStorage.setItem('experiencia_token', 'test-token');
    localStorage.setItem('experiencia_user', JSON.stringify(user));
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      { provide: Router, useValue: router },
    ] });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });
  afterEach(() => { http?.verify(); vi.unstubAllGlobals(); });

  it('allows VENUE to publish', () => {
    auth.currentUser.set({ ...auth.currentUser()!, roles: ['VENUE'] });
    expect(auth.canPublishExperiences()).toBe(true);
    expect(auth.isAttendee()).toBe(false);
  });

  it('revokes the exact JWT while removing local session', () => {
    auth.logout();
    const request = http.expectOne(`${API_CONFIG.baseUrl}/auth/logout`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(auth.token).toBeNull();
    request.flush({ status: 'success' });
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('does not fabricate a role on API rejection', () => {
    let rejected = false;
    auth.switchRole('HOST').subscribe({ error: () => { rejected = true; } });
    const request = http.expectOne(`${API_CONFIG.baseUrl}/users/me/role`);
    expect(request.request.body).toEqual({ role: 'HOST' });
    request.flush({ detail: 'forbidden' }, { status: 403, statusText: 'Forbidden' });
    expect(rejected).toBe(true);
    expect(auth.currentUser()?.roles).toEqual(['ATTENDEE']);
  });

  it('uses the profile returned by authorized role change', () => {
    auth.switchRole('HOST').subscribe();
    http.expectOne(`${API_CONFIG.baseUrl}/users/me/role`).flush({ ...user, roles: ['HOST'] });
    expect(auth.isHost()).toBe(true);
  });

  it('never attaches the JWT to a third party', () => {
    TestBed.inject(HttpClient).get('https://example.com/public').subscribe();
    const request = http.expectOne('https://example.com/public');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('does not recursively call logout after a 401', () => {
    auth.getProfile().subscribe({ error: () => {} });
    http.expectOne(`${API_CONFIG.baseUrl}/users/me`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.token).toBeNull();
    http.expectNone(`${API_CONFIG.baseUrl}/auth/logout`);
  });
});
