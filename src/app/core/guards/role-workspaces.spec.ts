import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import {
  provideRouter,
  Router,
  CanActivateFn,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { isObservable } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { NavigationService } from '../services/navigation.service';
import {
  adminGuard,
  hostGuard,
  attendeeGuard,
  publicCatalogGuard,
  homeRedirect,
} from './auth.guard';

describe('Espacios por roles asignados', () => {
  const user = {
    id: 'user',
    first_name: 'Ana',
    email: 'ana@example.test',
    roles: [] as string[],
    interests: [],
    created_at: '2026-01-01',
  };
  let auth: AuthService;
  let http: HttpTestingController;
  let router: Router;
  beforeEach(() => {
    const storage = () => {
      const values = new Map<string, string>();
      return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      };
    };
    vi.stubGlobal('localStorage', storage());
    vi.stubGlobal('sessionStorage', storage());
    localStorage.setItem('experiencia_token', 'synthetic-token');
    localStorage.setItem('experiencia_user', JSON.stringify(user));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });
  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
  });

  it.each([
    {
      roles: ['HOST'],
      home: '/host',
      visible: ['/host', '/host/venues', '/host/operations'],
      hidden: ['/catalog', '/my-tickets', '/admin'],
    },
    {
      roles: ['ADMIN'],
      home: '/admin',
      visible: ['/admin', '/admin/users'],
      hidden: ['/host', '/catalog', '/my-tickets'],
    },
    {
      roles: ['ATTENDEE'],
      home: '/catalog',
      visible: ['/catalog', '/my-tickets'],
      hidden: ['/host', '/admin', '/host/venues'],
    },
    {
      roles: ['HOST', 'ATTENDEE'],
      home: '/host',
      visible: ['/host', '/catalog', '/my-tickets'],
      hidden: ['/admin'],
    },
    {
      roles: ['VENUE'],
      home: '/host',
      visible: ['/host', '/host/venues'],
      hidden: ['/my-tickets', '/catalog'],
    },
    {
      roles: [],
      home: '/profile',
      visible: ['/notifications'],
      hidden: ['/host', '/my-tickets', '/catalog', '/admin'],
    },
  ])('muestra únicamente capacidades asignadas a $roles', ({ roles, home, visible, hidden }) => {
    auth.currentUser.set({ ...user, roles });
    expect(auth.homeRoute()).toBe(home);
    const paths = TestBed.inject(NavigationService)
      .items()
      .map((item) => item.path);
    for (const path of visible) expect(paths).toContain(path);
    for (const path of hidden) expect(paths).not.toContain(path);
    expect(auth.isAttendee()).toBe(roles.includes('ATTENDEE'));
  });

  it.each([
    { guard: adminGuard, cached: ['ADMIN'], actual: ['HOST'], url: '/admin', target: '/host' },
    { guard: hostGuard, cached: ['HOST'], actual: ['ATTENDEE'], url: '/host', target: '/catalog' },
    {
      guard: attendeeGuard,
      cached: ['ATTENDEE'],
      actual: ['HOST'],
      url: '/my-tickets',
      target: '/host',
    },
    {
      guard: publicCatalogGuard,
      cached: ['HOST'],
      actual: ['HOST'],
      url: '/catalog',
      target: '/host',
    },
  ])('consulta roles actuales al intentar $url', ({ guard, cached, actual, url, target }) => {
    auth.currentUser.set({ ...user, roles: cached });
    let value: unknown;
    const result = TestBed.runInInjectionContext(() =>
      (guard as CanActivateFn)({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
    if (!isObservable(result)) throw new Error('Debe consultar el perfil');
    result.subscribe((item) => (value = item));
    http
      .expectOne((request) => request.url.endsWith('/users/me'))
      .flush({ ...user, roles: actual });
    expect(router.serializeUrl(value as never)).toBe(target);
  });

  it('mantiene el catálogo público para visitantes sin sesión', () => {
    auth.clearAuth();
    expect(
      TestBed.runInInjectionContext(() =>
        publicCatalogGuard(
          {} as ActivatedRouteSnapshot,
          { url: '/catalog' } as RouterStateSnapshot,
        ),
      ),
    ).toBe(true);
    http.expectNone((request) => request.url.endsWith('/users/me'));
  });

  it('abre plataforma para ADMIN aunque solo exista el JWT y falte el perfil local', () => {
    auth.currentUser.set(null);
    const result = TestBed.runInInjectionContext(() => homeRedirect({} as never));
    if (!isObservable(result)) throw new Error('Debe recuperar el perfil');
    let target: unknown;
    result.subscribe((value) => (target = value));
    http
      .expectOne((request) => request.url.endsWith('/users/me'))
      .flush({ ...user, roles: ['ADMIN'] });
    expect(target).toBe('/admin');
  });
});
