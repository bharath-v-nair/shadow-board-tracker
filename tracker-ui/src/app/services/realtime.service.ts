import { Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel
} from '@microsoft/signalr';
import { AuthService } from './auth.service';
import { Incident } from '../models/incident.model';
import { environment } from '../../environments/environment';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * Owns the single SignalR connection to the IncidentHub and turns server pushes into
 * RxJS streams the UI can subscribe to. Components never touch the HubConnection directly.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private auth = inject(AuthService);
  private connection?: HubConnection;

  // Server -> client events. Names MUST match IncidentHub's constants on the backend.
  private readonly incidentChangedSubject = new Subject<Incident>();
  readonly incidentChanged$ = this.incidentChangedSubject.asObservable();

  private readonly incidentDeletedSubject = new Subject<string>();
  readonly incidentDeleted$ = this.incidentDeletedSubject.asObservable();

  // Exposed so the UI can show a "live"/"reconnecting" indicator if desired.
  readonly status = signal<ConnectionStatus>('disconnected');

  /** Opens the connection if it isn't already open. Safe to call more than once. */
  start(): void {
    if (this.connection) {
      return;
    }

    this.connection = new HubConnectionBuilder()
      .withUrl(environment.hubUrl, {
        // The JWT can't go in a header on a WebSocket, so SignalR appends it as the
        // "access_token" query param; the API's OnMessageReceived reads it back.
        // A factory (not a static value) means reconnects always pick up the current token.
        accessTokenFactory: () => this.auth.getToken() ?? ''
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    this.connection.on('IncidentChanged', (incident: Incident) =>
      this.incidentChangedSubject.next(incident)
    );
    this.connection.on('IncidentDeleted', (id: string) =>
      this.incidentDeletedSubject.next(id)
    );

    this.connection.onreconnecting(() => this.status.set('connecting'));
    this.connection.onreconnected(() => this.status.set('connected'));
    this.connection.onclose(() => this.status.set('disconnected'));

    this.status.set('connecting');
    this.connection
      .start()
      .then(() => this.status.set('connected'))
      .catch(err => {
        // A dead socket must never break the page — the initial REST fetch already
        // populated the dashboard, so we just log and stay on manual-refresh behaviour.
        console.error('SignalR connection failed:', err);
        this.status.set('disconnected');
      });
  }

  /** Tears the connection down (call from the component's ngOnDestroy). */
  stop(): void {
    if (!this.connection) {
      return;
    }
    // Capture and clear first so a re-entrant start() can build a fresh connection.
    const conn = this.connection;
    this.connection = undefined;
    if (conn.state !== HubConnectionState.Disconnected) {
      conn.stop().catch(err => console.error('SignalR stop failed:', err));
    }
    this.status.set('disconnected');
  }
}
