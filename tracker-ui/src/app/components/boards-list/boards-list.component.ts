import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../services/api.service';
import { Board } from '../../models/board.model';

@Component({
  selector: 'app-boards-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="relative min-h-screen">
      <header class="mb-8 mt-2 flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-800 m-0">Shadow Boards</h1>
          <p class="text-gray-500 m-0 mt-1">Select a board to view tools</p>
        </div>
      </header>

      @if (loading()) {
        <div class="flex justify-center mt-20">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (board of boards(); track board.id) {
            <mat-card class="hover:shadow-md transition-shadow cursor-pointer border-t-4 border-t-blue-500 h-full flex flex-col" (click)="goToBoard(board.id)">
              <mat-card-header class="mb-4">
                <mat-icon mat-card-avatar class="text-blue-500 mt-1">dashboard</mat-icon>
                <mat-card-title class="text-xl font-bold text-gray-800">{{ board.name }}</mat-card-title>
                <mat-card-subtitle class="text-gray-500">{{ board.location }}</mat-card-subtitle>
              </mat-card-header>
              <mat-card-actions align="end" class="mt-auto">
                <button mat-button class="text-blue-600 font-semibold tracking-wider">VIEW TOOLS</button>
              </mat-card-actions>
            </mat-card>
          }

          @if (boards().length === 0) {
            <div class="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
              <mat-icon class="text-4xl mb-2 opacity-50">inbox</mat-icon>
              <p>No boards found.</p>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .border-t-primary { border-top-color: var(--mat-sys-primary); }
    .text-primary { color: var(--mat-sys-primary); }
  `]
})
export class BoardsListComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  boards = signal<Board[]>([]);
  loading = signal<boolean>(true);

  ngOnInit() {
    this.api.getBoards().subscribe({
      next: (data) => {
        this.boards.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch boards', err);
        this.loading.set(false);
      }
    });
  }

  goToBoard(id: string) {
    this.router.navigate(['/board', id]);
  }
}
