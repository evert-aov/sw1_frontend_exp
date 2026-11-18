import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, signal } from '@angular/core';
import { LiveEngagementWidgetComponent } from './live-engagement-widget.component';
import { LiveMetrics } from '../../../../core/models/live.model';

describe('LiveEngagementWidgetComponent (HU-15 Unit Tests)', () => {
  const injector = createEnvironmentInjector([], {} as any);

  function createComponent(): LiveEngagementWidgetComponent {
    return runInInjectionContext(injector, () => new LiveEngagementWidgetComponent());
  }

  it('debe inicializarse con métricas por defecto seguras cuando no hay datos', () => {
    const component = createComponent();

    expect(component.engagementPercent()).toBe(0);
    expect(component.joyPercent()).toBe(0);
    expect(component.attentionPercent()).toBe(0);
    expect(component.inattentionPercent()).toBe(0);
    expect(component.facesCount()).toBe(0);
    expect(component.trafficLight()).toBe('RED');
    expect(component.scoreColor()).toBe('#e11d48');
  });

  it('debe calcular correctamente porcentajes de expresiones y semáforo GREEN', () => {
    const component = createComponent();
    const mockMetrics: LiveMetrics = {
      session_id: 'test-session-123',
      recorded_at: new Date().toISOString(),
      detected_faces_count: 5,
      attention_score: 0.85,
      joy_score: 0.9,
      neutral_score: 0.4,
      inattention_score: 0.1,
      energy_traffic_light: 'GREEN',
    };

    (component as any).metrics = signal(mockMetrics);

    expect(component.facesCount()).toBe(5);
    expect(component.joyPercent()).toBe(90);
    expect(component.attentionPercent()).toBe(85);
    expect(component.inattentionPercent()).toBe(10);
    expect(component.trafficLight()).toBe('GREEN');
    expect(component.scoreColor()).toBe('#059669');
    expect(component.statusLabel()).toContain('óptima');
  });

  it('debe reflejar el color ámbar para semáforo YELLOW', () => {
    const component = createComponent();
    const mockMetrics: LiveMetrics = {
      session_id: 'test-session-456',
      recorded_at: new Date().toISOString(),
      detected_faces_count: 2,
      attention_score: 0.5,
      joy_score: 0.4,
      neutral_score: 0.6,
      inattention_score: 0.4,
      energy_traffic_light: 'YELLOW',
    };

    (component as any).metrics = signal(mockMetrics);

    expect(component.trafficLight()).toBe('YELLOW');
    expect(component.scoreColor()).toBe('#d97706');
    expect(component.statusLabel()).toContain('fluctuaciones');
  });
});
