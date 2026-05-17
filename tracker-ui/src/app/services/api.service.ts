import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { Board } from '../models/board.model';
import { Tool } from '../models/tool.model';
import { Worker } from '../models/worker.model';
import { CreateIncidentDto, Incident } from '../models/incident.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getBoards(): Observable<Board[]> {
    return this.http.get<Board[]>(`${this.apiUrl}/boards`);
  }

  getBoard(id: string): Observable<Board> {
    return this.http.get<Board>(`${this.apiUrl}/boards/${id}`);
  }

  getTools(): Observable<Tool[]> {
    return this.http.get<Tool[]>(`${this.apiUrl}/tools`);
  }

  getBoardWithTools(id: string): Observable<{ board: Board; tools: Tool[] }> {
    return forkJoin({
      board: this.getBoard(id),
      tools: this.getTools().pipe(map(tools => tools.filter(t => t.boardId === id)))
    });
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

  toggleWorkerShift(workerId: string): Observable<Worker> {
    return this.http.patch<Worker>(`${this.apiUrl}/workers/${workerId}/shift`, {});
  }

  createIncident(incident: CreateIncidentDto): Observable<Incident> {
    return this.http.post<Incident>(`${this.apiUrl}/incidents`, incident);
  }

  verifyMagicLink(email: string, token: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/auth/verify`, { email, token });
  }

  requestMagicLink(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/request-link`, { email });
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
}
