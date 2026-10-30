import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CreateExperienceComponent } from './create-experience.component';
import { ExperienceService } from '../../../core/services/experience.service';
import { AuthService } from '../../../core/services/auth.service';

describe('Publish experience contracts', () => {
  const venueId = 'd83dd374-89cc-47f8-a6a8-0fc30d171001';
  const categoryId = 'd83dd374-89cc-47f8-a6a8-0fc30d171002';
  const route = {
    snapshot: { paramMap: convertToParamMap({}), queryParamMap: convertToParamMap({}) },
  };
  const api = {
    getCategories: () => of([{ id: categoryId, name: 'Arte' }]),
    getMyVenues: () =>
      of([
        {
          id: venueId,
          name: 'Local',
          zone: 'Centro',
          address: 'Dirección',
          city: 'Santa Cruz',
          max_capacity: 30,
        },
      ]),
    getCommissionQuote: vi.fn((price: number) =>
      of({
        price,
        rate: 0.08,
        ratePercent: 8,
        feePerTicket: price * 0.08,
        netPerTicket: price * 0.92,
        tierKey: 'exp.breakdown.tierMid',
      }),
    ),
    createExperience: vi.fn((payload: unknown) => of({ id: 'created' })),
    updateExperience: vi.fn((id: string, payload: unknown) => of({ id })),
    getMyExperience: vi.fn(() =>
      of({
        id: 'edited',
        can_edit: true,
        title: 'Existing event',
        description: 'Descripción suficientemente larga',
        category_id: categoryId,
        venue_id: venueId,
        modality: 'IN_PERSON',
        price: 0,
        min_capacity: 1,
        max_capacity: 20,
        duration_minutes: 120,
        event_date: '2030-12-02T00:30:00.000Z',
        virtual_meeting_url: null,
        cover_image_url: null,
      }),
    ),
  };
  beforeEach(() => {
    vi.useFakeTimers();
    api.createExperience.mockClear();
    api.updateExperience.mockClear();
    route.snapshot.paramMap = convertToParamMap({});
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ExperienceService, useValue: api },
        { provide: ActivatedRoute, useValue: route },
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => true,
            isAttendee: () => false,
            canPublishExperiences: () => true,
          },
        },
      ],
    });
  });
  afterEach(() => vi.useRealTimers());

  it('sends venue UUID and Bolivia-to-UTC conversion, without invented venue fields', async () => {
    const fixture = TestBed.createComponent(CreateExperienceComponent);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(151);
    const component = fixture.componentInstance;
    component.form.patchValue({
      title: 'Taller de arte',
      description: 'Descripción suficientemente larga',
      category_id: categoryId,
      venue_id: venueId,
      event_date_only: '2030-12-01',
      event_time_only: '20:30',
    });
    component.selectVenue();
    component.onSubmit();
    const payload = api.createExperience.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(payload['venue_id']).toBe(venueId);
    expect(payload['event_date']).toBe('2030-12-02T00:30:00.000Z');
    expect(payload).not.toHaveProperty('venue_name');
    expect(payload).not.toHaveProperty('address');
    fixture.destroy();
  });

  it('rejects an unknown physical venue before posting', async () => {
    const fixture = TestBed.createComponent(CreateExperienceComponent);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(151);
    fixture.componentInstance.form.patchValue({
      title: 'Taller válido',
      description: 'Descripción suficientemente larga',
      venue_id: 'unknown',
    });
    fixture.componentInstance.onSubmit();
    expect(api.createExperience).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.controls.venue_id.invalid).toBe(true);
    fixture.destroy();
  });

  it('reutiliza el formulario al editar sin crear otra experiencia ni cambiar su categoría', async () => {
    route.snapshot.paramMap = convertToParamMap({ id: 'edited' });
    const fixture = TestBed.createComponent(CreateExperienceComponent);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(151);
    const component = fixture.componentInstance;
    expect(component.form.controls.event_date_only.value).toBe('2030-12-01');
    expect(component.form.controls.event_time_only.value).toBe('20:30');
    component.form.controls.title.setValue('Título actualizado');
    component.onSubmit();
    expect(api.createExperience).not.toHaveBeenCalled();
    expect(api.updateExperience).toHaveBeenCalledWith(
      'edited',
      expect.objectContaining({
        title: 'Título actualizado',
        price: 0,
        event_date: '2030-12-02T00:30:00.000Z',
      }),
    );
    expect(api.updateExperience.mock.calls[0][1]).not.toHaveProperty('category_id');
    fixture.destroy();
  });
});
