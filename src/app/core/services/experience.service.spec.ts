import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ExperienceService } from './experience.service';
import { API_CONFIG } from '../config/api.config';

describe('Experience API contracts', () => {
  let service: ExperienceService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ExperienceService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('sends real pagination, availability and GPS filters including zero coordinates', () => {
    service.getCatalog({ page: 2, page_size: 12, only_available: false, latitude: 0, longitude: 0, radius_km: 10, max_price: 0 }).subscribe();
    const request = http.expectOne((r) => r.url === `${API_CONFIG.baseUrl}/experiences/catalog`);
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('only_available')).toBe('false');
    expect(request.request.params.get('latitude')).toBe('0');
    expect(request.request.params.get('max_price')).toBe('0');
    expect(request.request.params.has('only_open')).toBe(false);
    expect(request.request.headers.get('X-Search-Session')).toMatch(/^[a-f0-9-]{36}$/);
    request.flush({ experiences: [], page: 2, page_size: 12, total: 20, total_pages: 2 });
  });

  it('uses the rate quoted by the server rather than recalculating a local tier', () => {
    let rate = 0;
    service.getCommissionQuote(500).subscribe((result) => { rate = result.rate; });
    const request = http.expectOne((r) => r.url.endsWith('/commission-quote'));
    request.flush({ unit_price: 500, commission_rate: 0.075, fee_per_ticket: 37.5, net_per_ticket: 462.5, tier: 'HIGH' });
    expect(rate).toBe(0.075);
  });
});
