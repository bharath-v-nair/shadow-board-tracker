import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { Board } from '../models/board.model';
import { Tool, CreateToolPayload, UpdateToolPayload } from '../models/tool.model';
import { Worker } from '../models/worker.model';
import { CreateIncidentDto, Incident } from '../models/incident.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // ── Boards ──────────────────────────────────────────────
  getBoards(): Observable<Board[]> {
    return this.http.get<Board[]>(`${this.apiUrl}/boards`);
  }

  getBoard(id: string): Observable<Board> {
    return this.http.get<Board>(`${this.apiUrl}/boards/${id}`);
  }

  createBoard(payload: { name: string; location: string; qrConfig?: string }): Observable<Board> {
    return this.http.post<Board>(`${this.apiUrl}/boards`, payload);
  }

  updateBoard(id: string, payload: { id: string; name: string; location: string; qrConfig?: string }): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/boards/${id}`, payload);
  }

  updateBoardQrConfig(id: string, config: { size: number; showLabel: boolean }): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/boards/${id}/qr-config`, { qrConfig: JSON.stringify(config) });
  }

  deleteBoard(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/boards/${id}`);
  }

  // ── Tools ────────────────────────────────────────────────
  getTools(boardId?: string): Observable<Tool[]> {
    let params = new HttpParams();
    if (boardId) {
      params = params.set('boardId', boardId);
    }
    return this.http.get<Tool[]>(`${this.apiUrl}/tools`, { params });
  }

  getToolTypes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/tools/types`);
  }

  getToolNames(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/tools/names`);
  }

  createTool(payload: CreateToolPayload): Observable<Tool> {
    return this.http.post<Tool>(`${this.apiUrl}/tools`, payload);
  }

  updateTool(id: string, payload: UpdateToolPayload): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/tools/${id}`, payload);
  }

  deleteTool(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tools/${id}`);
  }

  getBoardWithTools(id: string): Observable<{ board: Board; tools: Tool[] }> {
    return forkJoin({
      board: this.getBoard(id),
      tools: this.getTools(id)
    });
  }

  // ── Workers ──────────────────────────────────────────────
  getCurrentWorker(): Observable<Worker> {
    return this.http.get<Worker>(`${this.apiUrl}/workers/me`);
  }

  getWorkers(role?: string, isOnShift?: boolean): Observable<Worker[]> {
    let params = new HttpParams();
    if (role) {
      params = params.set('role', role);
    }
    if (isOnShift !== undefined) {
      params = params.set('isOnShift', isOnShift);
    }
    return this.http.get<Worker[]>(`${this.apiUrl}/workers`, { params });
  }

  createWorker(worker: Partial<Worker>): Observable<Worker> {
    return this.http.post<Worker>(`${this.apiUrl}/workers`, worker);
  }

  updateWorker(id: string, worker: Partial<Worker>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/workers/${id}`, worker);
  }

  deleteWorker(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/workers/${id}`);
  }

  toggleWorkerShift(workerId: string): Observable<Worker> {
    return this.http.patch<Worker>(`${this.apiUrl}/workers/${workerId}/shift`, {});
  }

  // ── Incidents ────────────────────────────────────────────
  createIncident(incident: CreateIncidentDto): Observable<Incident> {
    return this.http.post<Incident>(`${this.apiUrl}/incidents`, incident);
  }

  getIncident(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/incidents/${id}`);
  }

  getIncidents(): Observable<Incident[]> {
    return this.http.get<Incident[]>(`${this.apiUrl}/incidents`);
  }

  resolveIncident(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/incidents/${id}/resolve`, {});
  }

  verifyIncident(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/incidents/${id}/verify`, {});
  }

  reopenIncident(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/incidents/${id}/reopen`, {});
  }

  getAllGlobalIncidents(): Observable<Incident[]> {
    return this.http.get<Incident[]>(`${this.apiUrl}/incidents/all`);
  }

  // ── Auth ─────────────────────────────────────────────────
  verifyMagicLink(email: string, token: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/auth/verify`, { email, token });
  }

  requestMagicLink(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/request-link`, { email });
  }

  demoLogin(): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/auth/demo-login`, {});
  }
}


