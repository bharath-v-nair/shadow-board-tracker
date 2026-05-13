import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Board } from '../../models/board.model';
import { Tool } from '../../models/tool.model';
import { Incident } from '../../models/incident.model';
import { ReportDialogComponent } from '../report-dialog/report-dialog.component';

@Component({
  selector: 'app-board-detail',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    MatListModule, 
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="container mx-auto p-4 max-w-4xl min-h-screen">
      <header class="mb-6 mt-4 flex items-center">
        <button mat-icon-button (click)="goBack()" class="mr-2">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div>
          <h1 class="text-3xl font-bold text-gray-800 m-0">{{ board()?.name || 'Loading...' }}</h1>
          <p class="text-gray-500 m-0">{{ board()?.location }}</p>
        </div>
      </header>

      @if (loading()) {
        <div class="flex justify-center mt-20">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <mat-card class="shadow-lg rounded-xl overflow-hidden">
          <mat-card-header class="bg-gray-50 border-b p-4">
            <mat-icon mat-card-avatar class="text-gray-500 mt-1">build</mat-icon>
            <mat-card-title class="text-xl">Tools Inventory</mat-card-title>
            <mat-card-subtitle>Tap an available tool to report it missing</mat-card-subtitle>
          </mat-card-header>
          
          <mat-list class="p-0">
            @for (tool of tools(); track tool.id; let last = $last) {
              <mat-list-item 
                class="h-auto py-3 cursor-pointer transition-colors" 
                [ngClass]="{'border-b': !last, 'bg-red-50 hover:bg-red-100': isMissing(tool), 'bg-yellow-50 hover:bg-yellow-100': isPendingReview(tool), 'hover:bg-gray-50': !isMissing(tool) && !isPendingReview(tool)}"
                (click)="onToolClick(tool)">
                
                <mat-icon matListItemIcon [ngClass]="{'text-red-500': isMissing(tool), 'text-yellow-600': isPendingReview(tool), 'text-green-500': !isMissing(tool) && !isPendingReview(tool)}">
                  {{ tool.iconName || 'handyman' }}
                </mat-icon>
                
                <div matListItemTitle class="font-medium" [ngClass]="{'text-red-700': isMissing(tool), 'text-yellow-700': isPendingReview(tool)}">
                  {{ tool.name }}
                </div>
                
                <div matListItemLine class="text-sm" [ngClass]="{'text-red-500': isMissing(tool), 'text-yellow-600': isPendingReview(tool), 'text-gray-500': !isMissing(tool) && !isPendingReview(tool)}">
                  Type: {{ tool.type }} • Condition: {{ isMissing(tool) ? 'Missing' : (isPendingReview(tool) ? 'Pending QA Verification' : tool.condition) }}
                </div>
                
                @if ((isMissing(tool) || isPendingReview(tool)) && getActiveIncident(tool.id)) {
                  <div matListItemLine class="mt-1">
                    <div class="inline-flex flex-col text-xs text-gray-500 border-l-2 py-1 pl-2" [ngClass]="{'border-red-400': isMissing(tool), 'border-yellow-400': isPendingReview(tool)}">
                      <span>Reported by <strong>{{ getActiveIncident(tool.id)?.reporterName || 'Unknown' }}</strong> on {{ getActiveIncident(tool.id)?.reportedAt | date:'short' }}</span>
                      <span>Assigned to: <strong>{{ getActiveIncident(tool.id)?.workerName || 'Unknown' }}</strong></span>
                    </div>
                  </div>
                }

                @if (isPendingReview(tool) && isQA) {
                  <div matListItemLine class="mt-2 flex gap-2">
                    <button mat-flat-button class="bg-green-600 text-white" (click)="onVerifyIncident(getActiveIncident(tool.id)!.id); $event.stopPropagation()">Verify & Close</button>
                    <button mat-stroked-button color="warn" (click)="onReopenIncident(getActiveIncident(tool.id)!.id); $event.stopPropagation()">Reject & Reopen</button>
                  </div>
                }
                
                <button mat-icon-button matListItemMeta *ngIf="!isMissing(tool) && !isPendingReview(tool)" color="warn" (click)="onToolClick(tool); $event.stopPropagation()">
                  <mat-icon>report_problem</mat-icon>
                </button>
              </mat-list-item>
            }

            @if (tools().length === 0) {
              <div class="p-8 text-center text-gray-500">
                <p>No tools assigned to this board.</p>
              </div>
            }
          </mat-list>
        </mat-card>
      }
    </div>
  `
})
export class BoardDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  get isQA() {
    return this.authService.isQA();
  }

  board = signal<Board | null>(null);
  tools = signal<Tool[]>([]);
  incidents = signal<Incident[]>([]);
  loading = signal<boolean>(true);

  ngOnInit() {
    const boardId = this.route.snapshot.paramMap.get('id');
    if (boardId) {
      this.fetchBoardDetails(boardId);
    } else {
      this.goBack();
    }
  }

  fetchBoardDetails(id: string, showLoading: boolean = true) {
    if (showLoading) {
      this.loading.set(true);
    }
    forkJoin({
      boardData: this.api.getBoardWithTools(id),
      incidents: this.api.getIncidents()
    }).subscribe({
      next: (data) => {
        this.board.set(data.boardData.board);
        this.tools.set(data.boardData.tools);
        this.incidents.set(data.incidents);
        if (showLoading) {
          this.loading.set(false);
        }
      },
      error: (err) => {
        console.error('Failed to fetch board details', err);
        this.snackBar.open('Failed to load board details', 'Close', { duration: 3000 });
        if (showLoading) {
          this.loading.set(false);
        }
      }
    });
  }

  getActiveIncident(toolId: string): Incident | undefined {
    return this.incidents().find(i => i.toolId === toolId && i.status !== 'Resolved' && i.status !== 2 as any);
  }

  isPendingReview(tool: Tool): boolean {
    const incident = this.getActiveIncident(tool.id);
    return incident ? (incident.status === 'PendingReview' || incident.status === 1 as any) : false;
  }

  isMissing(tool: Tool): boolean {
    const incident = this.getActiveIncident(tool.id);
    return tool.condition === 'Missing' || tool.condition === 'Lost' || (incident ? (incident.status === 'Open' || incident.status === 0 as any) : false);
  }

  onVerifyIncident(incidentId: string) {
    this.api.verifyIncident(incidentId).subscribe({
      next: () => {
        this.incidents.update(incidents => incidents.filter(i => i.id !== incidentId));
        this.snackBar.open('Incident verified and closed.', 'Close', { duration: 3000 });
      },
      error: () => this.snackBar.open('Failed to verify incident', 'Close', { duration: 3000 })
    });
  }

  onReopenIncident(incidentId: string) {
    this.api.reopenIncident(incidentId).subscribe({
      next: () => {
        this.incidents.update(incidents => incidents.map(i => {
          if (i.id === incidentId) {
            return { ...i, status: 'Open' };
          }
          return i;
        }));
        this.snackBar.open('Incident rejected and reopened.', 'Close', { duration: 3000 });
      },
      error: () => this.snackBar.open('Failed to reopen incident', 'Close', { duration: 3000 })
    });
  }

  onToolClick(tool: Tool) {
    if (this.isMissing(tool) || this.isPendingReview(tool)) {
      this.snackBar.open('This tool already has an active incident.', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(ReportDialogComponent, {
      width: '400px',
      data: { tool }
    });

    dialogRef.afterClosed().subscribe(incident => {
      if (incident) {
        this.fetchBoardDetails(this.board()!.id, false);
        this.snackBar.open('Incident reported successfully!', 'Close', { duration: 3000 });
      }
    });
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
