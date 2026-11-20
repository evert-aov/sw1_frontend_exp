import { TestBed } from '@angular/core/testing';
import { McAlert, McDynamicType } from '../../../../core/models/live-telemetry.model';
import { I18nService } from '../../../../core/services/i18n.service';
import { McAlertAction, McAlertCardComponent } from './mc-alert-card.component';

describe('McAlertCardComponent (HU-18 / HU-19)', () => {
  function alertOf(type: McDynamicType, overrides: Partial<McAlert> = {}): McAlert {
    return {
      id: 'alert-1',
      session_id: 'session-1',
      trigger: 'SUSTAINED_INATTENTION',
      status: 'ACTIVE',
      average_attention: 0.31,
      low_attention_seconds: 305,
      created_at: '2026-11-19T20:00:00Z',
      resolved_at: null,
      break_ends_at: null,
      suggestion_id: 'suggestion-1',
      dynamic: {
        id: 'dyn-1',
        code: 'TEST',
        dynamic_type: type,
        modality: 'ANY',
        intensity: 2,
        duration_minutes: 5,
        title_es: 'Pausa de 5 minutos',
        title_en: 'Five-minute break',
        instructions_es: 'Anuncia una pausa',
        instructions_en: 'Announce a break',
      },
      ...overrides,
    };
  }

  function render(alert: McAlert) {
    const fixture = TestBed.createComponent(McAlertCardComponent);
    fixture.componentRef.setInput('alert', alert);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.inject(I18nService).currentLang.set('es');
  });

  afterEach(() => vi.useRealTimers());

  it('muestra la alerta con la dinámica y la acción según su tipo', () => {
    const element = render(alertOf('AUDIENCE_QUESTION')).nativeElement as HTMLElement;
    expect(element.textContent).toContain('La atención del público está bajando');
    expect(element.textContent).toContain('5 min');
    expect(element.textContent).toContain('31%');
    expect(element.querySelector('.mc-btn-primary')?.textContent).toContain('Lanzar pregunta');

    const breakCard = render(alertOf('SHORT_BREAK')).nativeElement as HTMLElement;
    expect(breakCard.querySelector('.mc-btn-primary')?.textContent).toContain('Iniciar pausa');
  });

  it('usa los textos de la dinámica en el idioma activo', () => {
    TestBed.inject(I18nService).currentLang.set('en');
    const element = render(alertOf('SHORT_BREAK')).nativeElement as HTMLElement;
    expect(element.querySelector('.mc-dynamic-title')?.textContent).toContain('Five-minute break');
  });

  it('emite la respuesta elegida y no repite mientras está ocupada', () => {
    const fixture = render(alertOf('AUDIENCE_QUESTION'));
    const chosen: McAlertAction[] = [];
    fixture.componentInstance.respond.subscribe((action) => chosen.push(action));
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
      '.mc-btn',
    );
    buttons[0].click();
    buttons[1].click();
    buttons[2].click();
    expect(chosen).toEqual(['apply', 'next', 'dismiss']);

    fixture.componentRef.setInput('busy', true);
    fixture.componentInstance.choose('apply');
    expect(chosen.length).toBe(3);
  });

  it('muestra la cuenta regresiva de la pausa y avisa al terminar', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-19T20:00:00Z'));
    const fixture = render(
      alertOf('SHORT_BREAK', { status: 'APPLIED', break_ends_at: '2026-11-19T20:00:03Z' }),
    );
    let finished = false;
    fixture.componentInstance.breakFinished.subscribe(() => (finished = true));
    expect((fixture.nativeElement as HTMLElement).querySelector('.mc-countdown')?.textContent).toBe(
      '0:03',
    );
    vi.advanceTimersByTime(3000);
    expect(finished).toBe(true);
  });

  it('indica que la sugerencia fue descartada, no aplicada', () => {
    const element = render(alertOf('AUDIENCE_QUESTION', { status: 'DISMISSED' }))
      .nativeElement as HTMLElement;
    expect(element.textContent).toContain('Sugerencia descartada');
    expect(element.textContent).not.toContain('Dinámica aplicada');
  });

  it('indica cuando la atención se recuperó sola', () => {
    const element = render(alertOf('AUDIENCE_QUESTION', { status: 'EXPIRED' }))
      .nativeElement as HTMLElement;
    expect(element.textContent).toContain('La atención se recuperó');
    expect(element.querySelector('.mc-btn')).toBeNull();
  });
});
