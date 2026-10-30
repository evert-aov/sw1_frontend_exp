import { eventTimeInBolivia } from './event-time.util';

describe('Event date in Bolivia', () => {
  it('preserves local evening across UTC day boundary', () => {
    expect(eventTimeInBolivia('2026-12-01', '20:30')).toBe('2026-12-02T00:30:00.000Z');
  });
  it('does not interpret local midnight as UTC midnight', () => {
    expect(eventTimeInBolivia('2026-12-01', '00:00')).toBe('2026-12-01T04:00:00.000Z');
  });
});
