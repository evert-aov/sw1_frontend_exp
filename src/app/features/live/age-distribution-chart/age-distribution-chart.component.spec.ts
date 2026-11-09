import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, defer, of, throwError } from 'rxjs';
import { AgeDistributionChartComponent } from './age-distribution-chart.component';
import {
  AgeDistribution,
  AgeDistributionService,
} from '../../../core/services/age-distribution.service';

describe('AgeDistributionChartComponent (HU-16)', () => {
  const sample: AgeDistribution = {
    session_id: 'session-1',
    window_seconds: 60,
    sample_count: 3,
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
  const emptyWindow: AgeDistribution = {
    ...sample,
    sample_count: 0,
    detections_count: 0,
    distribution: sample.distribution.map((item) => ({ ...item, percentage: 0, count: 0 })),
    dominant_age_group: null,
    updated_at: null,
  };
  let watch: ReturnType<typeof vi.fn>;

  /** Monta el componente con un servicio simulado y procesa efectos y vista. */
  async function render(source: () => Observable<AgeDistribution>) {
    watch = vi.fn(source);
    await TestBed.configureTestingModule({
      imports: [AgeDistributionChartComponent],
      providers: [{ provide: AgeDistributionService, useValue: { watch } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(AgeDistributionChartComponent);
    fixture.componentRef.setInput('sessionId', 'session-1');
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => vi.useRealTimers());

  it('polls the given session and renders the four ordered age bars', async () => {
    const fixture = await render(() => of(sample));
    const component = fixture.componentInstance;

    expect(watch).toHaveBeenCalledWith('session-1', 5000);
    expect(component.loading()).toBe(false);
    expect(component.bars().map((bar) => [bar.group, bar.percentage])).toEqual([
      ['YOUTH', 0],
      ['YOUNG_ADULT', 50],
      ['ADULT', 25],
      ['SENIOR', 25],
    ]);
    expect(component.dominantLabel()).toBe('Jóvenes adultos');

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Edades del público');
    expect(text).toContain('Jóvenes adultos');
    expect(text).toContain('50%');
    expect(text).toContain('Predomina');
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('tells the host when the server has no age model registered', async () => {
    const fixture = await render(() => of({ ...emptyWindow, estimator_configured: false }));
    expect(fixture.componentInstance.estimatorMissing()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('todavía no está disponible');
  });

  it('shows an empty state when the window has no classified faces', async () => {
    const fixture = await render(() => of(emptyWindow));
    expect(fixture.componentInstance.hasData()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Aún no hay rostros analizados');
  });

  it('stops polling and explains a session that does not exist', async () => {
    vi.useFakeTimers();
    let attempts = 0;
    const fixture = await render(() =>
      defer(() => {
        attempts += 1;
        return throwError(() => new HttpErrorResponse({ status: 404 }));
      }),
    );

    await vi.advanceTimersByTimeAsync(20000);

    expect(attempts).toBe(1);
    expect(fixture.componentInstance.error()).toContain('no existe');
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('keeps retrying after a transient server error and clears the alert', async () => {
    vi.useFakeTimers();
    let attempts = 0;
    const fixture = await render(() =>
      defer(() => {
        attempts += 1;
        return attempts === 1 ? throwError(() => new HttpErrorResponse({ status: 503 })) : of(sample);
      }),
    );
    const component = fixture.componentInstance;
    expect(component.error()).toContain('Reintentando');

    await vi.advanceTimersByTimeAsync(5000);

    expect(attempts).toBe(2);
    expect(component.error()).toBe('');
    expect(component.distribution()).toEqual(sample);
  });

  it('restarts polling when the embedding console changes the session', async () => {
    const fixture = await render(() => of(sample));

    fixture.componentRef.setInput('sessionId', 'session-2');
    fixture.detectChanges();
    TestBed.tick();

    expect(watch).toHaveBeenCalledTimes(2);
    expect(watch).toHaveBeenLastCalledWith('session-2', 5000);
  });
});
