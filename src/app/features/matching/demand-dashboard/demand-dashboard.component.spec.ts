import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DemandDashboardComponent } from './demand-dashboard.component';
import { MatchingService } from '../../../core/services/matching.service';
import { AuthService } from '../../../core/services/auth.service';
import { UnmetDemandInsight, SuggestedExperience } from '../../../core/models/matching.model';

describe('DemandDashboardComponent (HU-10 & HU-11)', () => {
  let component: DemandDashboardComponent;
  let matchingServiceMock: Partial<MatchingService>;
  let authServiceMock: Partial<AuthService>;

  const mockInsights: UnmetDemandInsight[] = [
    {
      id: 'insight-1',
      zone: 'Plan 3000',
      category_keyword: 'Bienestar',
      search_count: 8,
      suggested_price: 60,
      suggested_time_slot: 'Sábado Mañana',
    },
    {
      id: 'insight-2',
      zone: 'Equipetrol',
      category_keyword: 'Gastronomía',
      search_count: 12,
      suggested_price: 120,
      suggested_time_slot: 'Viernes Noche',
    },
  ];

  const mockSuggestions: SuggestedExperience[] = [
    {
      zone: 'Equipetrol',
      category_keyword: 'Gastronomía',
      category_id: 'cat-1',
      estimated_interest_count: 12,
      suggested_price: 120,
      suggested_currency: 'BOB',
      recommended_time_slot: 'Viernes 19:00 - Noche',
      recommended_modality: 'Presencial',
      rationale: 'Demanda de 12 búsquedas insatisfechas observadas.',
      quorum_probability: 0.85,
    },
  ];

  beforeEach(async () => {
    matchingServiceMock = {
      getDemandInsights: vi.fn(() => of(mockInsights)),
      suggestions: vi.fn(() => of(mockSuggestions)),
    };

    authServiceMock = {
      canPublishExperiences: signal(true),
    };

    await TestBed.configureTestingModule({
      imports: [DemandDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MatchingService, useValue: matchingServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DemandDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('calculates executive KPIs correctly', () => {
    expect(component.totalSearches()).toBe(20);
    expect(component.uniqueCategoriesCount()).toBe(2);
    expect(component.topZone()).toBe('Equipetrol');
    expect(component.maxSearchCount()).toBe(12);
  });

  it('computes heatmap relative percentage and tone badge', () => {
    // 12/12 = 100% -> high intensity (error tone)
    expect(component.getIntensityPercentage(12)).toBe(100);
    expect(component.getIntensityBadge(12).badgeTone).toBe('error');

    // 8/12 = 66.7% -> moderate intensity (warning tone)
    expect(component.getIntensityPercentage(8)).toBe(67);
    expect(component.getIntensityBadge(8).badgeTone).toBe('warning');
  });

  it('filters data when selecting a quick zone chip', () => {
    component.selectQuickZone('Equipetrol');
    expect(component.zone).toBe('Equipetrol');
    expect(matchingServiceMock.getDemandInsights).toHaveBeenCalledWith('Equipetrol');

    component.selectQuickZone('Todas las zonas');
    expect(component.zone).toBe('');
    expect(matchingServiceMock.getDemandInsights).toHaveBeenCalledWith('');
  });

  it('prepares draft creation payload for routing', () => {
    const draft = component.draft(mockSuggestions[0]);
    expect(draft['category_id']).toBe('cat-1');
    expect(draft['price']).toBe(120);
    expect(draft['zone']).toBe('Equipetrol');
    expect(draft['title']).toContain('Gastronomía');
  });
});
