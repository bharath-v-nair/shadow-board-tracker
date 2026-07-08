import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { forkJoin } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { Board } from '../../models/board.model';
import { Tool } from '../../models/tool.model';
import { Incident } from '../../models/incident.model';
import { BoardBottomSheetComponent } from '../board-bottom-sheet/board-bottom-sheet.component';
import { QrCustomizerDialogComponent } from '../qr-customizer-dialog/qr-customizer-dialog.component';
import { AuthService } from '../../services/auth.service';
import { DemoRestrictedDialogComponent } from '../demo-restricted-dialog/demo-restricted-dialog.component';
import { listStagger, prefersReducedMotion } from '../../shared/animations';
import { BoardStatus, withBoardHealth } from '../../shared/board-health';

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
  animations: [listStagger],
  template: `
    <div class="relative min-h-screen pb-24">
      <header class="mb-6 mt-2">
        <h1 class="text-3xl font-bold sb-text-strong m-0">Shadow Boards</h1>
      </header>

      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          @for (row of [1,2,3,4,5]; track row) {
            <div class="sb-card p-4 flex items-center gap-3">
              <div class="sb-skeleton h-11 w-11 rounded-xl"></div>
              <div class="flex-1">
                <div class="sb-skeleton h-4 w-2/5 mb-2"></div>
                <div class="sb-skeleton h-3 w-3/4"></div>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" [@listStagger]="boards().length" [@.disabled]="reducedMotion">
          @for (board of boards(); track board.id) {
            <mat-card
              class="sb-card-hover cursor-pointer relative overflow-hidden !p-0"
              (click)="goToBoard(board.id)"
              id="board-card-{{ board.id }}"
            >
              <!-- Status accent -->
              <div class="absolute left-0 top-0 bottom-0 w-1.5" [ngClass]="accentClass(board.health.status)"></div>

              <div class="flex items-start gap-3 p-4 pl-5">
                <!-- Status-tinted leading icon -->
                <div class="sb-surface-2 w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0">
                  <mat-icon [ngClass]="iconClass(board.health.status)">grid_view</mat-icon>
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-1">
                    <div class="min-w-0">
                      <h3 class="text-base font-bold sb-text-strong m-0 truncate">{{ board.name }}</h3>
                      <p class="text-xs sb-text-subtle m-0 mt-0.5 truncate flex items-center gap-1">
                        <mat-icon style="font-size:13px;width:13px;height:13px;">place</mat-icon>{{ board.location }}
                      </p>
                    </div>

                    <button
                      mat-icon-button
                      class="-mt-2 -mr-2 flex-shrink-0"
                      [matMenuTriggerFor]="boardMenu"
                      (click)="$event.stopPropagation()"
                      aria-label="Board options"
                      id="board-menu-btn-{{ board.id }}"
                    >
                      <mat-icon class="sb-text-subtle">more_vert</mat-icon>
                    </button>
                    <mat-menu #boardMenu="matMenu">
                      <button mat-menu-item (click)="onGenerateQr(board); $event.stopPropagation()">
                        <mat-icon class="sb-text-muted">qr_code_2</mat-icon>
                        <span>Generate QR</span>
                      </button>
                      <button mat-menu-item (click)="onEditBoard(board); $event.stopPropagation()">
                        <mat-icon class="sb-text-muted">edit</mat-icon>
                        <span>Edit</span>
                      </button>
                      <button mat-menu-item class="text-red-600" (click)="onDeleteBoard(board); $event.stopPropagation()">
                        <mat-icon class="text-red-600">delete_outline</mat-icon>
                        <span>Delete</span>
                      </button>
                    </mat-menu>
                  </div>

                  <!-- Health metadata -->
                  <div class="flex items-center gap-2 mt-2.5 flex-wrap">
                    <span class="text-xs font-medium sb-text-muted flex items-center gap-1">
                      <mat-icon class="sb-text-subtle" style="font-size:15px;width:15px;height:15px;">handyman</mat-icon>
                      {{ board.health.toolCount }} {{ board.health.toolCount === 1 ? 'tool' : 'tools' }}
                    </span>
                    @if (board.health.missing > 0) {
                      <span class="sb-chip sb-chip--open">{{ board.health.missing }} missing</span>
                    }
                    @if (board.health.pending > 0) {
                      <span class="sb-chip sb-chip--pending">{{ board.health.pending }} pending</span>
                    }
                    @if (board.health.status === 'ok' && board.health.toolCount > 0) {
                      <span class="sb-chip sb-chip--resolved">All present</span>
                    }
                  </div>
                </div>
              </div>
            </mat-card>
          }

          @if (boards().length === 0) {
            <div class="col-span-full sb-empty">
              <div class="sb-surface-2 p-4 rounded-full mb-4 shadow-sm">
                <mat-icon class="text-3xl sb-text-subtle block">inbox</mat-icon>
              </div>
              <p class="font-medium sb-text-muted">No boards yet.</p>
              <p class="text-xs mt-1 sb-text-subtle">Tap the <strong>+</strong> button to add your first shadow board.</p>
            </div>
          }
        </div>
      }

      <!-- Add-Board FAB: pinned to the bottom-right of the phone column, above the nav.
           The right offset clamps the button inside the centered max-w-md (448px) column
           on wide screens, and to the viewport edge on narrow ones. -->
      <button
        mat-fab
        class="!fixed z-30 bg-blue-600 text-white shadow-xl"
        style="right: max(1.25rem, calc(50vw - 224px + 1.25rem)); bottom: calc(5.25rem + env(safe-area-inset-bottom));"
        (click)="onAddBoard()"
        aria-label="Add board"
        id="add-board-fab"
      >
        <mat-icon>add</mat-icon>
      </button>
    </div>
  `
})
export class BoardsListComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private bottomSheet = inject(MatBottomSheet);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  public auth = inject(AuthService);

  readonly reducedMotion = prefersReducedMotion();

  private boardsRaw = signal<Board[]>([]);
  private toolsData = signal<Tool[]>([]);
  private incidentsData = signal<Incident[]>([]);
  loading = signal<boolean>(true);

  /** Boards enriched with tool-count + active-incident health (recomputes on any change). */
  boards = computed(() => withBoardHealth(this.boardsRaw(), this.toolsData(), this.incidentsData()));

  ngOnInit() {
    // One round-trip for everything the card needs to show health at a glance.
    forkJoin({
      boards: this.api.getBoards(),
      tools: this.api.getTools(),
      incidents: this.api.getAllGlobalIncidents()
    }).subscribe({
      next: ({ boards, tools, incidents }) => {
        this.boardsRaw.set(boards);
        this.toolsData.set(tools);
        this.incidentsData.set(incidents);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch boards', err);
        this.loading.set(false);
      }
    });
  }

  accentClass(status: BoardStatus): string {
    return status === 'missing' ? 'sb-accent--open'
      : status === 'pending' ? 'sb-accent--pending'
      : 'sb-accent--resolved';
  }

  iconClass(status: BoardStatus): string {
    return status === 'missing' ? 'text-rose-500'
      : status === 'pending' ? 'text-amber-500'
      : 'sb-brand-text';
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
        this.boardsRaw.update(list => [...list, newBoard]);
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
        this.boardsRaw.update(list => list.map(b => b.id === updatedBoard.id ? updatedBoard : b));
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
        this.boardsRaw.update(list => list.map(b => {
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
    if (this.auth.isDemoUser()) {
      this.dialog.open(DemoRestrictedDialogComponent, {
        data: {
          title: 'Action Restricted',
          message: `Since you are logged in as a Demo User, deletion of shadow boards is not allowed to preserve the environment for other guests.`
        },
        panelClass: 'rounded-2xl'
      });
      return;
    }

    if (!confirm(`Delete "${board.name}"? This cannot be undone.`)) return;

    this.api.deleteBoard(board.id).subscribe({
      next: () => {
        this.boardsRaw.update(list => list.filter(b => b.id !== board.id));
        this.snackBar.open(`"${board.name}" deleted.`, 'Close', { duration: 2500 });
      },
      error: () => this.snackBar.open('Failed to delete board.', 'Close', { duration: 3000 })
    });
  }
}
