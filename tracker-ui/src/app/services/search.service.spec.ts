import { SearchService, SearchData } from './search.service';
import { Board } from '../models/board.model';
import { Tool } from '../models/tool.model';
import { Incident } from '../models/incident.model';

describe('SearchService', () => {
  const svc = new SearchService();

  const boards: Board[] = [
    { id: 'b1', name: 'Main Maintenance Hub', location: 'Central Workshop' },
    { id: 'b2', name: 'Welding Station', location: 'Heavy Fab Area' },
  ];
  const tools: Tool[] = [
    { id: 't1', name: 'Blue Wrench', type: 'Hand Tool', condition: 'Good', boardId: 'b1' },
    { id: 't2', name: 'Welding Mask', type: 'PPE', condition: 'Good', boardId: 'b2' },
  ];
  const incidents: Incident[] = [
    { id: 'i1', toolId: 't1', boardId: 'b1', workerId: 'w1', reporterId: 'r1', toolName: 'Blue Wrench', boardName: 'Main Maintenance Hub', reporterName: 'QA Sam', workerName: 'Worker Alpha', reportedAt: '2026-01-01', status: 'Open' },
    { id: 'i2', toolId: 't2', boardId: 'b2', workerId: 'w2', reporterId: 'r1', toolName: 'Welding Mask', boardName: 'Welding Station', reporterName: 'QA Sam', workerName: 'Worker Beta', reportedAt: '2026-01-02', status: 1 as any },
  ];
  const data: SearchData = { boards, tools, incidents };

  it('returns empty results for a blank query', () => {
    expect(svc.search('', data)).toEqual({ boards: [], tools: [], incidents: [], total: 0 });
    expect(svc.search('   ', data).total).toBe(0);
  });

  it('is case-insensitive and matches board name or location', () => {
    const r = svc.search('central', data);
    expect(r.boards.map((b) => b.id)).toEqual(['b1']);
    expect(r.boards[0].link).toEqual(['/board', 'b1']);
  });

  it('matches tools by name/type and links to the tool\'s board', () => {
    const r = svc.search('wrench', data);
    expect(r.tools.map((t) => t.id)).toEqual(['t1']);
    expect(r.tools[0].sublabel).toBe('Main Maintenance Hub'); // resolved board name
    expect(r.tools[0].link).toEqual(['/board', 'b1']);
  });

  it('groups a shared term across boards, tools and incidents', () => {
    const r = svc.search('welding', data);
    expect(r.boards.map((b) => b.id)).toEqual(['b2']);
    expect(r.tools.map((t) => t.id)).toEqual(['t2']);
    expect(r.incidents.map((i) => i.id)).toEqual(['i2']);
    expect(r.total).toBe(3);
  });

  it('searches incident people fields and maps status to a chip key', () => {
    const bySam = svc.search('sam', data);
    expect(bySam.incidents.map((i) => i.id)).toEqual(['i1', 'i2']);
    expect(bySam.incidents[0].status).toBe('open');          // string 'Open'
    expect(bySam.incidents[1].status).toBe('pending');        // numeric 1
    expect(bySam.incidents[0].link).toEqual(['/incident', 'i1']);
  });

  it('returns no matches for an unrelated query', () => {
    expect(svc.search('zzz-nothing', data).total).toBe(0);
  });
});
