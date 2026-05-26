import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApiService } from '../../services/api.service';
import { Board } from '../../models/board.model';
import { BoardBottomSheetComponent } from '../board-bottom-sheet/board-bottom-sheet.component';
import { QrCustomizerDialogComponent } from '../qr-customizer-dialog/qr-customizer-dialog.component';

@Component({
  selector: 'app-boards-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatSnackBarModule,
    MatBottomSheetModule,
    MatDialogModule
  ],
  template: `
    <!-- Wrapper gives room for FAB -->
    <div class="relative min-h-screen pb-24">
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
            <mat-card
              class="hover:shadow-md transition-shadow cursor-pointer border-t-4 border-t-blue-500 h-full flex flex-col"
              (click)="goToBoard(board.id)"
              id="board-card-{{ board.id }}"
            >
              <mat-card-header class="mb-4">
                <mat-icon mat-card-avatar class="text-blue-500 mt-1">dashboard</mat-icon>
                <mat-card-title class="text-xl font-bold text-gray-800">{{ board.name }}</mat-card-title>
                <mat-card-subtitle class="text-gray-500">{{ board.location }}</mat-card-subtitle>

                <!-- 3-dot overflow menu -->
                <button
                  mat-icon-button
                  class="ml-auto"
                  [matMenuTriggerFor]="boardMenu"
                  (click)="$event.stopPropagation()"
                  aria-label="Board options"
                  id="board-menu-btn-{{ board.id }}"
                >
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #boardMenu="matMenu">
                  <button mat-menu-item (click)="onGenerateQr(board); $event.stopPropagation()">
                    <mat-icon class="text-gray-600">qr_code_2</mat-icon>
                    <span>Generate QR</span>
                  </button>
                  <button mat-menu-item (click)="onEditBoard(board); $event.stopPropagation()">
                    <mat-icon>edit</mat-icon>
                    <span>Edit</span>
                  </button>
                  <button mat-menu-item class="text-red-600" (click)="onDeleteBoard(board); $event.stopPropagation()">
                    <mat-icon class="text-red-600">delete_outline</mat-icon>
                    <span>Delete</span>
                  </button>
                </mat-menu>
              </mat-card-header>

              <mat-card-actions align="end" class="mt-auto">
                <button mat-button class="text-blue-600 font-semibold tracking-wider">VIEW TOOLS</button>
              </mat-card-actions>
            </mat-card>
          }

          @if (boards().length === 0) {
            <div class="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
              <mat-icon class="text-4xl mb-2 opacity-50">inbox</mat-icon>
              <p>No boards yet. Tap <strong>+</strong> to add the first one.</p>
            </div>
          }
        </div>
      }

      <!-- Bottom-right FAB -->
      <button
        mat-fab
        class="fixed bottom-20 right-6 z-50 bg-blue-600 text-white shadow-xl"
        (click)="onAddBoard()"
        aria-label="Add board"
        id="add-board-fab"
      >
        <mat-icon>add</mat-icon>
      </button>
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
  private bottomSheet = inject(MatBottomSheet);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

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

  // ── Add Board ─────────────────────────────────────────────
  onAddBoard() {
    const ref = this.bottomSheet.open(BoardBottomSheetComponent, {
      panelClass: 'rounded-t-2xl'
    });
    ref.afterDismissed().subscribe((newBoard: Board | undefined) => {
      if (newBoard) {
        this.boards.update(list => [...list, newBoard]);
        this.snackBar.open(`"${newBoard.name}" created!`, 'Close', { duration: 3000 });
        // Instantly navigate to the new board's detail page
        this.router.navigate(['/board', newBoard.id]);
      }
    });
  }

  // ── Edit Board ────────────────────────────────────────────
  onEditBoard(board: Board) {
    const ref = this.bottomSheet.open(BoardBottomSheetComponent, {
      data: board,
      panelClass: 'rounded-t-2xl'
    });
    ref.afterDismissed().subscribe((updatedBoard: Board | undefined) => {
      if (updatedBoard) {
        this.boards.update(list => list.map(b => b.id === updatedBoard.id ? updatedBoard : b));
        this.snackBar.open('Board updated.', 'Close', { duration: 2500 });
      }
    });
  }

  // ── Generate QR ───────────────────────────────────────────
  onGenerateQr(board: Board) {
    const ref = this.dialog.open(QrCustomizerDialogComponent, {
      data: board,
      width: '800px',
      maxWidth: '95vw',
      panelClass: 'qr-dialog'
    });
    ref.afterClosed().subscribe((newConfig) => {
      if (newConfig) {
        this.boards.update(list => list.map(b => {
          if (b.id === board.id) {
             return { ...b, qrConfig: JSON.stringify(newConfig) };
          }
          return b;
        }));
      }
    });
  }

  // ── Delete Board ──────────────────────────────────────────
  onDeleteBoard(board: Board) {
    if (!confirm(`Delete "${board.name}"? This cannot be undone.`)) return;

    this.api.deleteBoard(board.id).subscribe({
      next: () => {
        this.boards.update(list => list.filter(b => b.id !== board.id));
        this.snackBar.open(`"${board.name}" deleted.`, 'Close', { duration: 2500 });
      },
      error: () => this.snackBar.open('Failed to delete board.', 'Close', { duration: 3000 })
    });
  }
}
