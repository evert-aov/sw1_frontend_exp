import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AgeDistribution, AgeDistributionService } from './age-distribution.service';
import { API_CONFIG } from '../config/api.config';

describe('AgeDistributionService (HU-16)', () => {
  const url = `${API_CONFIG.baseUrl}/live/sessions/session-1/age-distribution`;
  const sample: AgeDistribution = {
    session_id: 'session-1',
    window_seconds: 60,
    sample_count: 1,
    detections_count: 4,
    distribution: [
      { age_group: 'YOUTH', percentage: 0, count: 0 },
      { age_group: 'YOUNG_ADULT', percentage: 50, count: 2 },
      { age_group: 'ADULT', percentage: 25, count: 1 },
      { age_group: 'SENIOR', percentage: 25, count: 1 },
    ],
    dominant_age_group: 'YOUNG_ADULT',
    updated_at: '2026-11-08T20:00:00Z',
    estimator_configured: true,
  };
  let api: AgeDistributionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AgeDistributionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('reads the latest distribution of the session with GET', () => {
    let received: AgeDistribution | undefined;
    api.getLatest('session-1').subscribe((value) => (received = value));
    const request = http.expectOne(url);
    expect(request.request.method).toBe('GET');
    request.flush(sample);
    expect(received).toEqual(sample);
  });

  it('encodes the session id before building the route', () => {
    api.getLatest('a/b').subscribe();
    http.expectOne(`${API_CONFIG.baseUrl}/live/sessions/a%2Fb/age-distribution`).flush(sample);
  });

  it('polls immediately and then once per period while subscribed', () => {
    vi.useFakeTimers();
    const counts: number[] = [];
    const subscription = api.watch('session-1', 5000).subscribe((value) => counts.push(value.sample_count));

    vi.advanceTimersByTime(0);
    http.expectOne(url).flush(sample);
    vi.advanceTimersByTime(5000);
    http.expectOne(url).flush({ ...sample, sample_count: 2 });
    subscription.unsubscribe();
    vi.advanceTimersByTime(5000);

    expect(counts).toEqual([1, 2]);
    http.expectNone(url);
  });
});
