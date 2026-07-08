import { Board } from '../models/board.model';
import { Tool } from '../models/tool.model';
import { Incident } from '../models/incident.model';

export type BoardStatus = 'ok' | 'pending' | 'missing';

export interface BoardHealth {
  toolCount: number;
  /** Active Open incidents on the board (tool reported missing). */
  missing: number;
  /** Active PendingReview incidents (worker says fixed, awaiting QA verify). */
  pending: number;
  /** Worst active state — drives the card's accent + status chip. */
  status: BoardStatus;
}

export interface BoardWithHealth extends Board {
  health: BoardHealth;
}

// Incident status is serialized inconsistently as string OR number across the app
// ('Open'|0, 'PendingReview'|1, 'Resolved'|2). Match both — do NOT normalize the enum
// (it would change the SignalR payload contract from Phase 20).
function isOpen(status: unknown): boolean {
  return status === 'Open' || status === 0;
}
function isPendingReview(status: unknown): boolean {
  return status === 'PendingReview' || status === 1;
}

/** Pure per-board rollup of tool count + active-incident health. */
export function computeBoardHealth(board: Board, tools: Tool[], incidents: Incident[]): BoardHealth {
  const toolCount = tools.reduce((n, t) => (t.boardId === board.id ? n + 1 : n), 0);

  let missing = 0;
  let pending = 0;
  for (const i of incidents) {
    if (i.boardId !== board.id) continue;
    if (isOpen(i.status)) missing++;
    else if (isPendingReview(i.status)) pending++;
  }

  const status: BoardStatus = missing > 0 ? 'missing' : pending > 0 ? 'pending' : 'ok';
  return { toolCount, missing, pending, status };
}

/** Attaches health to each board (used by the boards list). */
export function withBoardHealth(boards: Board[], tools: Tool[], incidents: Incident[]): BoardWithHealth[] {
  return boards.map((b) => ({ ...b, health: computeBoardHealth(b, tools, incidents) }));
}
