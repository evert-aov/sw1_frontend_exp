import { TestBed } from '@angular/core/testing';
import { EnergyTrafficLightComponent } from './energy-traffic-light.component';

describe('EnergyTrafficLightComponent (HU-17)', () => {
  function render(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(EnergyTrafficLightComponent);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('enciende solo la luz del color recibido y muestra el porcentaje', () => {
    const element = render({ light: 'YELLOW', energyScore: 0.512, trend: 'FALLING' });
    const lit = Array.from(element.querySelectorAll('.lamp.is-on'));
    expect(lit.map((lamp) => lamp.getAttribute('data-color'))).toEqual(['YELLOW']);
    expect(element.querySelector('.energy-value')?.textContent?.trim()).toBe('51%');
  });

  it('sin datos no enciende luces ni muestra porcentaje', () => {
    const element = render({ light: null, energyScore: null });
    expect(element.querySelectorAll('.lamp.is-on').length).toBe(0);
    expect(element.querySelector('.energy-value')).toBeNull();
  });

  it('se atenúa cuando la señal no es en vivo y oculta la ayuda en modo compacto', () => {
    const element = render({ light: 'GREEN', energyScore: 0.9, live: false, compact: true });
    expect(element.querySelector('.traffic-light')?.classList).toContain('is-dimmed');
    expect(element.querySelector('.hint')).toBeNull();
  });
});
