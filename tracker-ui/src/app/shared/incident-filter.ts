import { Incident } from '../models/incident.model';

export type IncidentSort = 'newest' | 'oldest';

export interface IncidentFilter {
  boardId?: string | null;
  workerId?: string | null;
  /** Inclusive lower bound on reportedAt (epoch ms). Derived from a date preset. */
  from?: number | null;
  sort?: IncidentSort;
}

function reportedMs(i: Incident): number {
  return new Date(i.reportedAt).getTime();
}

/**
 * Pure board/worker/date filter + sort over incidents. Status is NOT filtered here —
 * the dashboard tabs (Pending/Alerts/History) own that. Kept standalone so the rules are
 * unit-testable without the DOM. Client-side is fine to a few hundred incidents; at true
 * scale this moves server-side (query params + pagination) — see the postmortem.
 */
export function applyIncidentFilters(incidents: Incident[], f: IncidentFilter): Incident[] {
  const filtered = incidents.filter((i) => {
    if (f.boardId && i.boardId !== f.boardId) return false;
    if (f.workerId && i.workerId !== f.workerId) return false;
    if (f.from != null && reportedMs(i) < f.from) return false;
    return true;
  });

  const sort = f.sort ?? 'newest';
  return filtered.sort((a, b) =>
    sort === 'oldest' ? reportedMs(a) - reportedMs(b) : reportedMs(b) - reportedMs(a)
  );
}

/** Count of non-default filters active (drives the "clear" affordance / badge). */
export function activeFilterCount(f: IncidentFilter): number {
  let n = 0;
  if (f.boardId) n++;
  if (f.workerId) n++;
  if (f.from != null) n++;
  return n;
}
