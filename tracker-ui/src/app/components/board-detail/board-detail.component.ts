import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { Board } from '../../models/board.model';
import { Tool } from '../../models/tool.model';
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
                [ngClass]="{'border-b': !last, 'bg-red-50 hover:bg-red-100': isMissing(tool), 'hover:bg-gray-50': !isMissing(tool)}"
                (click)="onToolClick(tool)">
                
                <mat-icon matListItemIcon [ngClass]="{'text-red-500': isMissing(tool), 'text-green-500': !isMissing(tool)}">
                  {{ tool.iconName || 'handyman' }}
                </mat-icon>
                
                <div matListItemTitle class="font-medium" [ngClass]="{'text-red-700': isMissing(tool)}">
                  {{ tool.name }}
                </div>
                
                <div matListItemLine class="text-sm" [ngClass]="{'text-red-500': isMissing(tool), 'text-gray-500': !isMissing(tool)}">
                  Type: {{ tool.type }} • Condition: {{ tool.condition }}
                </div>
                
                <button mat-icon-button matListItemMeta *ngIf="!isMissing(tool)" color="warn" (click)="onToolClick(tool); $event.stopPropagation()">
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
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  board = signal<Board | null>(null);
  tools = signal<Tool[]>([]);
  loading = signal<boolean>(true);

  ngOnInit() {
    const boardId = this.route.snapshot.paramMap.get('id');
    if (boardId) {
      this.fetchBoardDetails(boardId);
    } else {
      this.goBack();
    }
  }

  fetchBoardDetails(id: string) {
    this.loading.set(true);
    this.api.getBoardWithTools(id).subscribe({
      next: (data) => {
        this.board.set(data.board);
        this.tools.set(data.tools);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch board details', err);
        this.snackBar.open('Failed to load board details', 'Close', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  isMissing(tool: Tool): boolean {
    return tool.condition === 'Missing' || tool.condition === 'Lost';
  }

  onToolClick(tool: Tool) {
    if (this.isMissing(tool)) {
      this.snackBar.open('This tool is already reported missing.', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(ReportDialogComponent, {
      width: '400px',
      data: { tool }
    });

    dialogRef.afterClosed().subscribe(incident => {
      if (incident) {
        // Optimistically update the UI tool condition
        const updatedTools = this.tools().map(t => {
          if (t.id === tool.id) {
            return { ...t, condition: 'Missing' };
          }
          return t;
        });
        this.tools.set(updatedTools);
        this.snackBar.open('Incident reported successfully!', 'Close', { duration: 3000 });
      }
    });
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
