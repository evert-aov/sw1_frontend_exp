import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../services/auth.service';
import { API_CONFIG } from '../config/api.config';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor diagnostics', () => {
  let http: HttpTestingController;
  const auth = { token: 'existing-token', expireSession: vi.fn() };

  beforeEach(() => {
    auth.expireSession.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('preserves a valid supplied UUID v4 request ID and auth header on API calls', () => {
    const id = '123e4567-e89b-42d3-a456-426614174000';
    TestBed.inject(HttpClient)
      .get(`${API_CONFIG.baseUrl}/items`, { headers: { 'X-Request-ID': id } })
      .subscribe();
    const request = http.expectOne(`${API_CONFIG.baseUrl}/items`);
    expect(request.request.headers.get('X-Request-ID')).toBe(id);
    expect(request.request.headers.get('Authorization')).toBe('Bearer existing-token');
    request.flush({});
  });

  it('generates a UUID v4 when an API request has no valid request ID', () => {
    TestBed.inject(HttpClient).get(`${API_CONFIG.baseUrl}/items`).subscribe();
    const request = http.expectOne(`${API_CONFIG.baseUrl}/items`);
    expect(request.request.headers.get('X-Request-ID')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    request.flush({});
  });

  it('does not attach auth or request ID headers to third-party URLs', () => {
    TestBed.inject(HttpClient).get('https://example.com/items').subscribe();
    const request = http.expectOne('https://example.com/items');
    expect(request.request.headers.has('X-Request-ID')).toBe(false);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('does not treat relative application URLs as API-origin requests', () => {
    TestBed.inject(HttpClient).get('/assets/config.json').subscribe();
    const request = http.expectOne('/assets/config.json');
    expect(request.request.headers.has('X-Request-ID')).toBe(false);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('replaces an invalid supplied ID with a UUID v4', () => {
    TestBed.inject(HttpClient)
      .get(`${API_CONFIG.baseUrl}/items`, { headers: { 'X-Request-ID': 'not-a-uuid' } })
      .subscribe();
    const request = http.expectOne(`${API_CONFIG.baseUrl}/items`);
    expect(request.request.headers.get('X-Request-ID')).not.toBe('not-a-uuid');
    expect(request.request.headers.get('X-Request-ID')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    request.flush({});
  });
});
