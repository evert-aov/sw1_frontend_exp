import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MatchingService } from './matching.service';
import { API_CONFIG } from '../config/api.config';

describe('Matching and demand contracts', () => {
  let api: MatchingService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(MatchingService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('keeps reading and applying as distinct requests', () => {
    api.getGroupStatus('event').subscribe();
    const read = http.expectOne(`${API_CONFIG.baseUrl}/matching/group/event`);
    expect(read.request.method).toBe('GET'); read.flush({});
    api.applyForMatching('event', { preferred_zone: 'Centro' }).subscribe();
    const apply = http.expectOne(`${API_CONFIG.baseUrl}/matching/apply`);
    expect(apply.request.method).toBe('POST');
    expect(apply.request.body).toEqual({ experience_id: 'event', preferred_zone: 'Centro' }); apply.flush({});
  });
  it('uses the demand routes and preserves a zone filter', () => {
    api.getDemandInsights(' Centro ').subscribe();
    const request = http.expectOne(value => value.url === `${API_CONFIG.baseUrl}/demand/insights`);
    expect(request.request.params.get('zone')).toBe('Centro'); request.flush([]);
    api.suggestions('Centro').subscribe();
    const suggestions = http.expectOne(value => value.url === `${API_CONFIG.baseUrl}/demand/suggestions`);
    expect(suggestions.request.params.get('zone')).toBe('Centro'); suggestions.flush([]);
  });
});
