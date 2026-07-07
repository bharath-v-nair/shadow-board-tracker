import { Injectable } from '@angular/core';
import { Board } from '../models/board.model';
import { Tool } from '../models/tool.model';
import { Incident } from '../models/incident.model';

export type StatusKey = 'open' | 'pending' | 'resolved' | null;
export type SearchKind = 'board' | 'tool' | 'incident';

export interface SearchResultItem {
  id: string;
  kind: SearchKind;
  label: string;
  sublabel: string;
  status: StatusKey;
  /** Router command array to navigate to when the result is chosen. */
  link: (string | undefined)[];
}

export interface SearchResults {
  boards: SearchResultItem[];
  tools: SearchResultItem[];
  incidents: SearchResultItem[];
  total: number;
}

export interface SearchData {
  boards: Board[];
  tools: Tool[];
  incidents: Incident[];
}

const EMPTY: SearchResults = { boards: [], tools: [], incidents: [], total: 0 };
/** Cap per group so the overlay stays fast and skimmable. */
const PER_GROUP = 8;

/**
 * Pure, DOM-free search over already-fetched boards/tools/incidents. Kept as a
 * standalone service (not baked into the component) precisely so the filter and
 * grouping rules are unit-testable in isolation. The backend does no search work —
 * see the postmortem for when server-side search becomes necessary.
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  /** Normalizes the mixed string|number incident status into a chip key. */
  statusKey(status: unknown): StatusKey {
    if (status === 'Open' || status === 0) return 'open';
    if (status === 'PendingReview' || status === 1) return 'pending';
    if (status === 'Resolved' || status === 2) return 'resolved';
    return null;
  }

  search(rawQuery: string, data: SearchData): SearchResults {
    const q = (rawQuery ?? '').trim().toLowerCase();
    if (!q) return EMPTY;

    const boardNameById = new Map(data.boards.map((b) => [b.id, b.name] as const));

    const boards: SearchResultItem[] = data.boards
      .filter((b) => `${b.name} ${b.location}`.toLowerCase().includes(q))
      .slice(0, PER_GROUP)
      .map((b) => ({
        id: b.id,
        kind: 'board',
        label: b.name,
        sublabel: b.location,
        status: null,
        link: ['/board', b.id],
      }));

    const tools: SearchResultItem[] = data.tools
      .filter((t) => `${t.name} ${t.type}`.toLowerCase().includes(q))
      .slice(0, PER_GROUP)
      .map((t) => ({
        id: t.id,
        kind: 'tool',
        label: t.name,
        sublabel: boardNameById.get(t.boardId) ?? t.type,
        status: null,
        link: ['/board', t.boardId],
      }));

    const incidents: SearchResultItem[] = data.incidents
      .filter((i) =>
        `${i.toolName ?? ''} ${i.boardName ?? ''} ${i.reporterName ?? ''} ${i.workerName ?? ''}`
          .toLowerCase()
          .includes(q)
      )
      .slice(0, PER_GROUP)
      .map((i) => ({
        id: i.id,
        kind: 'incident',
        label: i.toolName ?? 'Incident',
        sublabel: i.boardName ?? 'Unknown board',
        status: this.statusKey(i.status),
        link: ['/incident', i.id],
      }));

    return { boards, tools, incidents, total: boards.length + tools.length + incidents.length };
  }
}
