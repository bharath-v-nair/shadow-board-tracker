import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  getWorkers(): Observable<Worker[]> {
    return this.http.get<Worker[]>(`${this.apiUrl}/workers`);
  }

  createIncident(incident: CreateIncidentDto): Observable<Incident> {
    return this.http.post<Incident>(`${this.apiUrl}/incidents`, incident);
  }

  verifyMagicLink(token: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/auth/verify`, { token });
  }
}
