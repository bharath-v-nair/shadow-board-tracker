import { applyIncidentFilters, activeFilterCount } from './incident-filter';
import { Incident } from '../models/incident.model';

function inc(id: string, over: Partial<Incident>): Incident {
  return {
    id, toolId: 't', boardId: 'b1', workerId: 'w1', reporterId: 'r1',
    reportedAt: '2026-01-10T00:00:00Z', status: 'Open', ...over,
  };
}

describe('incident-filter', () => {
  const incidents: Incident[] = [
    inc('a', { boardId: 'b1', workerId: 'w1', reportedAt: '2026-01-01T00:00:00Z' }),
    inc('b', { boardId: 'b2', workerId: 'w1', reportedAt: '2026-01-05T00:00:00Z' }),
    inc('c', { boardId: 'b1', workerId: 'w2', reportedAt: '2026-01-10T00:00:00Z' }),
  ];

  it('returns everything (newest first) with no filters', () => {
    expect(applyIncidentFilters(incidents, {}).map((i) => i.id)).toEqual(['c', 'b', 'a']);
  });

  it('filters by board', () => {
    expect(applyIncidentFilters(incidents, { boardId: 'b1' }).map((i) => i.id)).toEqual(['c', 'a']);
  });

  it('filters by worker', () => {
    expect(applyIncidentFilters(incidents, { workerId: 'w1' }).map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('filters by from-date (inclusive lower bound on reportedAt)', () => {
    const from = new Date('2026-01-05T00:00:00Z').getTime();
    expect(applyIncidentFilters(incidents, { from }).map((i) => i.id)).toEqual(['c', 'b']);
  });

  it('combines filters and sorts oldest-first', () => {
    const r = applyIncidentFilters(incidents, { boardId: 'b1', sort: 'oldest' });
    expect(r.map((i) => i.id)).toEqual(['a', 'c']);
  });

  it('does not mutate the input array', () => {
    const copy = [...incidents];
    applyIncidentFilters(incidents, { sort: 'oldest' });
    expect(incidents).toEqual(copy);
  });

  it('counts active filters', () => {
    expect(activeFilterCount({})).toBe(0);
    expect(activeFilterCount({ boardId: 'b1', workerId: 'w1', from: 123 })).toBe(3);
    expect(activeFilterCount({ sort: 'oldest' })).toBe(0);
  });
});
