import { computeBoardHealth, withBoardHealth } from './board-health';
import { Board } from '../models/board.model';
import { Tool } from '../models/tool.model';
import { Incident } from '../models/incident.model';

describe('board-health', () => {
  const boards: Board[] = [
    { id: 'b1', name: 'Main Hub', location: 'Central' },
    { id: 'b2', name: 'Welding', location: 'Fab' },
    { id: 'b3', name: 'Empty', location: 'Nowhere' },
  ];
  const tools: Tool[] = [
    { id: 't1', name: 'Wrench', type: 'Hand', condition: 'Good', boardId: 'b1' },
    { id: 't2', name: 'Drill', type: 'Power', condition: 'Good', boardId: 'b1' },
    { id: 't3', name: 'Mask', type: 'PPE', condition: 'Good', boardId: 'b2' },
  ];

  function incident(id: string, boardId: string, status: string | number): Incident {
    return { id, toolId: 't', boardId, workerId: 'w', reporterId: 'r', reportedAt: '2026-01-01', status: status as any };
  }

  it('counts tools per board', () => {
    expect(computeBoardHealth(boards[0], tools, []).toolCount).toBe(2);
    expect(computeBoardHealth(boards[1], tools, []).toolCount).toBe(1);
    expect(computeBoardHealth(boards[2], tools, []).toolCount).toBe(0);
  });

  it('counts missing (Open) and pending (PendingReview), ignoring resolved and other boards', () => {
    const incidents = [
      incident('i1', 'b1', 'Open'),
      incident('i2', 'b1', 'PendingReview'),
      incident('i3', 'b1', 'Resolved'), // ignored
      incident('i4', 'b2', 'Open'),     // other board
    ];
    const h = computeBoardHealth(boards[0], tools, incidents);
    expect(h.missing).toBe(1);
    expect(h.pending).toBe(1);
  });

  it('matches numeric status too (Open=0, PendingReview=1)', () => {
    const incidents = [incident('i1', 'b1', 0), incident('i2', 'b1', 1)];
    const h = computeBoardHealth(boards[0], tools, incidents);
    expect(h.missing).toBe(1);
    expect(h.pending).toBe(1);
  });

  it('derives status worst-first: missing > pending > ok', () => {
    expect(computeBoardHealth(boards[0], tools, [incident('i', 'b1', 'Open'), incident('j', 'b1', 'PendingReview')]).status).toBe('missing');
    expect(computeBoardHealth(boards[0], tools, [incident('j', 'b1', 'PendingReview')]).status).toBe('pending');
    expect(computeBoardHealth(boards[0], tools, []).status).toBe('ok');
  });

  it('withBoardHealth attaches health to every board and preserves fields', () => {
    const enriched = withBoardHealth(boards, tools, [incident('i1', 'b2', 'Open')]);
    expect(enriched).toHaveLength(3);
    expect(enriched[0].name).toBe('Main Hub');
    expect(enriched[0].health.status).toBe('ok');
    expect(enriched[1].health).toEqual({ toolCount: 1, missing: 1, pending: 0, status: 'missing' });
  });
});
