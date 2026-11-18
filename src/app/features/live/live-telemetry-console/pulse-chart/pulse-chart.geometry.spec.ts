import { PulsePoint } from '../../../../core/models/live-telemetry.model';
import { buildPulseGeometry, energyToY, PULSE_CHART_HEIGHT, PULSE_CHART_WIDTH } from './pulse-chart.geometry';

describe('buildPulseGeometry (HU-17)', () => {
  const end = '2026-11-17T20:01:00Z';
  const point = (iso: string, energy: number): PulsePoint => ({
    recorded_at: iso,
    energy_score: energy,
    traffic_light: energy >= 0.65 ? 'GREEN' : energy >= 0.4 ? 'YELLOW' : 'RED',
  });

  it('proyecta energía alta arriba y baja abajo', () => {
    expect(energyToY(1)).toBe(0);
    expect(energyToY(0)).toBe(PULSE_CHART_HEIGHT);
    expect(energyToY(2)).toBe(0);
  });

  it('ubica los puntos dentro de la ventana de 60 s', () => {
    const geometry = buildPulseGeometry(
      [point('2026-11-17T20:00:00Z', 0.5), point('2026-11-17T20:00:30Z', 0.8), point(end, 0.2)],
      end,
    );
    expect(geometry.linePath).toBe(`M0 50 L${PULSE_CHART_WIDTH / 2} 20 L${PULSE_CHART_WIDTH} 80`);
    expect(geometry.lastPoint).toEqual({ x: PULSE_CHART_WIDTH, y: 80, light: 'RED' });
    expect(geometry.areaPath.endsWith('Z')).toBe(true);
  });

  it('descarta puntos fuera de la ventana y fechas inválidas', () => {
    const geometry = buildPulseGeometry(
      [point('2026-11-17T19:59:00Z', 0.9), point('fecha-invalida', 0.9)],
      end,
    );
    expect(geometry.linePath).toBe('');
    expect(geometry.lastPoint).toBeNull();
  });

  it('dibuja los umbrales del semáforo', () => {
    const geometry = buildPulseGeometry([], end);
    expect(geometry.greenY).toBe(35);
    expect(geometry.yellowY).toBe(60);
  });
});
