import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Board } from '../../models/board.model';
import { Tool } from '../../models/tool.model';
import { Incident } from '../../models/incident.model';
import { ReportDialogComponent } from '../report-dialog/report-dialog.component';
import { ToolBottomSheetComponent, ToolSheetData, ToolSheetResult } from '../tool-bottom-sheet/tool-bottom-sheet.component';
import { QrCustomizerDialogComponent } from '../qr-customizer-dialog/qr-customizer-dialog.component';
import { BoardBottomSheetComponent } from '../board-bottom-sheet/board-bottom-sheet.component';
import { MatMenuModule } from '@angular/material/menu';
import { DemoRestrictedDialogComponent } from '../demo-restricted-dialog/demo-restricted-dialog.component';
import { listStagger, prefersReducedMotion } from '../../shared/animations';

@Component({
  selector: 'app-board-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatBottomSheetModule,
    MatMenuModule
  ],
  animations: [listStagger],
  template: `
    <div class="container mx-auto px-2 py-4 sm:p-4 max-w-4xl min-h-screen pb-32">
      <!-- Header -->
      <header class="mb-6 mt-4 flex items-center">
        <button mat-icon-button (click)="goBack()" class="mr-2">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div>
          <h1 class="text-3xl font-bold sb-text-strong m-0 leading-tight">{{ board()?.name || 'Loading...' }}</h1>
          <p class="text-sm sb-text-muted m-0">{{ board()?.location }}</p>
        </div>
        
        <div class="ml-auto flex items-center gap-2">
          @if (authService.isDemoUser()) {
            <button (click)="showDemoInfo()" class="bg-amber-100 text-amber-700 font-bold px-3 py-1.5 rounded-full text-xs shadow-sm flex items-center gap-1.5 border border-amber-200 hover:bg-amber-200 transition-colors">
              <mat-icon class="text-[16px] w-[16px] h-[16px]">visibility</mat-icon> Demo Mode
            </button>
          }
          
          <button mat-icon-button [matMenuTriggerFor]="boardMenu" aria-label="Board options">
            <mat-icon>more_vert</mat-icon>
          </button>
          <mat-menu #boardMenu="matMenu">
            <button mat-menu-item (click)="onGenerateQr()">
              <mat-icon class="text-gray-600">qr_code_2</mat-icon>
              <span>Generate QR</span>
            </button>
            <button mat-menu-item (click)="onEditBoard()">
              <mat-icon>edit</mat-icon>
              <span>Edit Board</span>
            </button>
            <button mat-menu-item class="text-red-600" (click)="onDeleteBoard()">
              <mat-icon class="text-red-600">delete_outline</mat-icon>
              <span>Delete Board</span>
            </button>
          </mat-menu>
        </div>
      </header>

      @if (loading()) {
        <mat-card class="rounded-2xl overflow-hidden p-0">
          <div class="p-5 border-b sb-border flex items-center gap-3">
            <div class="sb-skeleton h-9 w-9 rounded-lg"></div>
            <div class="sb-skeleton h-5 w-40"></div>
          </div>
          @for (row of [1,2,3]; track row) {
            <div class="p-5 border-b sb-border flex items-start gap-4">
              <div class="sb-skeleton h-12 w-12 rounded-lg"></div>
              <div class="flex-1">
                <div class="sb-skeleton h-4 w-1/3 mb-2"></div>
                <div class="sb-skeleton h-3 w-1/4"></div>
              </div>
            </div>
          }
        </mat-card>
      } @else {
        <mat-card class="rounded-2xl overflow-hidden p-0">
          <!-- Card Header with Add Tool Button -->
          <div class="flex justify-between items-center p-5 border-b sb-border">
            <div class="flex items-center gap-3">
              <div class="sb-surface-2 p-2 rounded-lg flex items-center justify-center">
                <mat-icon class="sb-text-subtle">build</mat-icon>
              </div>
              <h2 class="text-xl font-bold sb-text-strong m-0">Tools Inventory</h2>
            </div>
            <button mat-flat-button class="!rounded-full !bg-orange-50 !text-orange-700 font-semibold" [disabled]="isOpeningSheet()" (click)="onAddTool()">
              <mat-icon class="mr-1" style="font-size: 20px; height: 20px; width: 20px;">add</mat-icon> Add Tool
            </button>
          </div>

          <!-- Tools List -->
          <div class="flex flex-col" [@listStagger]="tools().length" [@.disabled]="reducedMotion">
            @for (tool of tools(); track tool.id; let last = $last) {
              <div
                class="flex items-start p-5 border-b sb-border last:border-b-0 hover:bg-black/[0.03] transition-colors cursor-pointer border-l-4"
                [ngClass]="{
                  'border-l-transparent': !isMissing(tool) && !isPendingReview(tool),
                  'border-l-rose-500': isMissing(tool),
                  'border-l-amber-400': isPendingReview(tool),
                  'pointer-events-none opacity-50': isOpeningSheet()
                }"
                (click)="onToolClick(tool)"
              >
                <!-- Icon Pill -->
                <div
                  class="flex-shrink-0 p-3 rounded-lg flex items-center justify-center mr-4"
                  [ngClass]="{
                    'sb-surface-2 sb-text-subtle': !isMissing(tool) && !isPendingReview(tool),
                    'bg-rose-50 text-rose-500': isMissing(tool),
                    'bg-amber-50 text-amber-500': isPendingReview(tool)
                  }"
                >
                  <mat-icon>{{ tool.iconName || 'handyman' }}</mat-icon>
                </div>

                <!-- Text Content -->
                <div class="flex-grow flex flex-col pt-0.5">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-base font-bold sb-text-strong">{{ tool.name }}</span>
                    @if (isMissing(tool)) {
                      <span class="sb-chip sb-chip--open">Missing</span>
                    } @else if (isPendingReview(tool)) {
                      <span class="sb-chip sb-chip--pending">Pending Review</span>
                    }
                  </div>

                  <div class="text-xs sb-text-subtle font-medium mb-3 flex items-center gap-1">
                    <mat-icon style="font-size: 14px; width: 14px; height: 14px;">category</mat-icon> {{ tool.type }}
                  </div>

                  <!-- Incident Details (if active) -->
                  @if ((isMissing(tool) || isPendingReview(tool)) && getActiveIncident(tool.id)) {
                    <div class="grid grid-cols-2 gap-y-1 text-xs mb-2">
                      <div class="sb-text-subtle">Reported by</div>
                      <div class="text-right font-bold sb-text-muted">{{ getActiveIncident(tool.id)?.reporterName || 'Unknown' }}</div>
                      <div class="sb-text-subtle">Assigned to</div>
                      <div class="text-right font-bold sb-text-muted">{{ getActiveIncident(tool.id)?.workerName || 'Unknown' }}</div>
                      <div class="sb-text-subtle">Reported at</div>
                      <div class="text-right font-bold sb-text-muted">{{ getActiveIncident(tool.id)?.reportedAt | date:'short' }}</div>
                    </div>
                  }

                  <!-- QA Action Buttons (if pending review) -->
                  @if (isPendingReview(tool) && isQA) {
                    <div class="mt-3 flex gap-2">
                      <button
                        mat-flat-button
                        class="!bg-emerald-50 hover:!bg-emerald-100 !text-emerald-700 !rounded-full !h-8 !px-4 !text-xs font-semibold"
                        (click)="onVerifyIncident(getActiveIncident(tool.id)!.id); $event.stopPropagation()"
                      >
                        <mat-icon style="font-size: 16px; width: 16px; height: 16px; line-height: 16px; margin-right: 4px;">check_circle</mat-icon>
                        Verify & Close
                      </button>
                      <button
                        mat-flat-button
                        class="!bg-rose-50 hover:!bg-rose-100 !text-rose-700 !rounded-full !h-8 !px-4 !text-xs font-semibold"
                        (click)="onReopenIncident(getActiveIncident(tool.id)!.id); $event.stopPropagation()"
                      >
                        <mat-icon style="font-size: 16px; width: 16px; height: 16px; line-height: 16px; margin-right: 4px;">cancel</mat-icon>
                        Reject
                      </button>
                    </div>
                  }
                </div>

                <!-- Right Action Area (Report Missing) -->
                @if (!isMissing(tool) && !isPendingReview(tool)) {
                  <button
                    mat-icon-button
                    class="flex-shrink-0 ml-4 sb-text-subtle hover:text-red-500 transition-colors focus:outline-none"
                    (click)="openReportDialog(tool); $event.stopPropagation()"
                    aria-label="Report missing"
                  >
                    <mat-icon>error_outline</mat-icon>
                  </button>
                }
              </div>
            }

            <!-- Empty State -->
            @if (tools().length === 0) {
              <div class="p-12 flex flex-col items-center justify-center text-center">
                <div class="sb-surface-2 p-4 rounded-full mb-4">
                  <mat-icon class="sb-text-subtle" style="font-size: 32px; width: 32px; height: 32px;">handyman</mat-icon>
                </div>
                <h3 class="sb-text-strong font-semibold mb-1">No tools yet</h3>
                <p class="text-sm sb-text-muted max-w-[200px]">Click "Add Tool" above to start building this board's inventory.</p>
              </div>
            }
          </div>
        </mat-card>
      }
    </div>
  `
})
export class BoardDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  public authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private bottomSheet = inject(MatBottomSheet);
  private snackBar = inject(MatSnackBar);

  readonly reducedMotion = prefersReducedMotion();

  get isQA() {
    return this.authService.isQA();
  }

  board = signal<Board | null>(null);
  tools = signal<Tool[]>([]);
  incidents = signal<Incident[]>([]);
  loading = signal<boolean>(true);
  isOpeningSheet = signal<boolean>(false);

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

  // ── Tool state helpers ───────────────────────────────────

  getActiveIncident(toolId: string): Incident | undefined {
    return this.incidents().find(i => i.toolId === toolId && i.status !== 'Resolved' && i.status !== 2 as any);
  }

  isPendingReview(tool: Tool): boolean {
    const incident = this.getActiveIncident(tool.id);
    return incident ? (incident.status === 'PendingReview' || incident.status === 1 as any) : false;
  }

  /**
   * A tool is "missing" only when it has an active Open incident.
   * "Missing" is NOT a stored condition value — it is an operational state.
   */
  isMissing(tool: Tool): boolean {
    const incident = this.getActiveIncident(tool.id);
    return incident ? (incident.status === 'Open' || incident.status === 0 as any) : false;
  }

  // ── Tool CRUD ────────────────────────────────────────────

  onAddTool() {
    const boardId = this.board()?.id;
    if (!boardId) return;

    this.isOpeningSheet.set(true);
    this.api.getToolNames()
      .pipe(finalize(() => this.isOpeningSheet.set(false)))
      .subscribe({
        next: (names) => {
          const sheetData: ToolSheetData = {
            boardId,
            knownNames: names
          };
          const ref = this.bottomSheet.open(ToolBottomSheetComponent, {
            data: sheetData,
            panelClass: 'rounded-t-2xl'
          });
          ref.afterDismissed().subscribe((result: ToolSheetResult | undefined) => {
            if (result?.action === 'save') {
              this.tools.update(list => [...list, result.tool]);
              this.snackBar.open(`"${result.tool.name}" added.`, 'Close', { duration: 2500 });
            }
          });
        },
        error: () => this.snackBar.open('Failed to load tool dictionary', 'Close', { duration: 3000 })
      });
  }

  onEditTool(tool: Tool) {
    const boardId = this.board()?.id;
    if (!boardId) return;

    this.isOpeningSheet.set(true);
    this.api.getToolNames()
      .pipe(finalize(() => this.isOpeningSheet.set(false)))
      .subscribe({
        next: (names) => {
          const sheetData: ToolSheetData = {
            boardId,
            tool,
            knownNames: names
          };
          const ref = this.bottomSheet.open(ToolBottomSheetComponent, {
            data: sheetData,
            panelClass: 'rounded-t-2xl'
          });
          ref.afterDismissed().subscribe((result: ToolSheetResult | undefined) => {
            if (!result) return;
            if (result.action === 'save') {
              this.tools.update(list => list.map(t => t.id === result.tool.id ? result.tool : t));
              this.snackBar.open('Tool updated.', 'Close', { duration: 2500 });
            } else if (result.action === 'delete') {
              this.tools.update(list => list.filter(t => t.id !== result.tool.id));
              this.snackBar.open(`"${result.tool.name}" deleted.`, 'Close', { duration: 2500 });
            }
          });
        },
        error: () => this.snackBar.open('Failed to load tool dictionary', 'Close', { duration: 3000 })
      });
  }

  // ── Tool click routing ───────────────────────────────────

  /**
   * Clicking a tool:
   * - If it has an active incident → show a snackbar (can't edit/report again)
   * - If it's clean → open Edit sheet (user can update details or delete)
   * The "report missing" icon button directly calls openReportDialog() independently.
   */
  onToolClick(tool: Tool) {
    if (this.isMissing(tool) || this.isPendingReview(tool)) {
      this.snackBar.open('This tool already has an active incident.', 'Close', { duration: 3000 });
      return;
    }
    this.onEditTool(tool);
  }

  // ── Report missing ───────────────────────────────────────

  openReportDialog(tool: Tool) {
    const ref = this.bottomSheet.open(ReportDialogComponent, {
      data: { tool },
      panelClass: 'rounded-t-2xl'
    });
    ref.afterDismissed().subscribe(incident => {
      if (incident) {
        this.fetchBoardDetails(this.board()!.id, false);
        this.snackBar.open('Incident reported successfully!', 'Close', { duration: 3000 });
      }
    });
  }

  // ── Incident actions ─────────────────────────────────────

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

  // ── QR Generation ────────────────────────────────────────
  onGenerateQr() {
    const currentBoard = this.board();
    if (!currentBoard) return;

    const ref = this.dialog.open(QrCustomizerDialogComponent, {
      data: currentBoard,
      width: '800px',
      maxWidth: '95vw',
      panelClass: 'qr-dialog'
    });
    ref.afterClosed().subscribe((newConfig) => {
      if (newConfig) {
        this.board.set({ ...currentBoard, qrConfig: JSON.stringify(newConfig) });
      }
    });
  }

  // ── Edit Board ────────────────────────────────────────────
  onEditBoard() {
    const currentBoard = this.board();
    if (!currentBoard) return;

    const ref = this.bottomSheet.open(BoardBottomSheetComponent, {
      data: currentBoard,
      panelClass: 'rounded-t-2xl'
    });
    ref.afterDismissed().subscribe((updatedBoard) => {
      if (updatedBoard) {
        this.board.set(updatedBoard);
        this.snackBar.open('Board updated.', 'Close', { duration: 2500 });
      }
    });
  }

  // ── Delete Board ──────────────────────────────────────────
  onDeleteBoard() {
    const currentBoard = this.board();
    if (!currentBoard) return;

    if (this.authService.isDemoUser()) {
      this.dialog.open(DemoRestrictedDialogComponent, {
        data: {
          title: 'Action Restricted',
          message: `Since you are logged in as a Demo User, deletion of shadow boards is not allowed to preserve the environment for other guests.`
        },
        panelClass: 'rounded-2xl'
      });
      return;
    }

    if (!confirm(`Delete "${currentBoard.name}"? This cannot be undone.`)) return;

    this.api.deleteBoard(currentBoard.id).subscribe({
      next: () => {
        this.snackBar.open(`"${currentBoard.name}" deleted.`, 'Close', { duration: 2500 });
        this.router.navigate(['/boards']);
      },
      error: () => this.snackBar.open('Failed to delete board.', 'Close', { duration: 3000 })
    });
  }

  goBack() {
    this.router.navigate(['/boards']);
  }

  showDemoInfo() {
    this.dialog.open(DemoRestrictedDialogComponent, {
      data: {
        title: 'Demo Mode Active',
        message: 'You have full access to create incidents and manage workflows. However, demo users cannot delete boards, tools, or workers.'
      },
      panelClass: 'rounded-2xl'
    });
  }
}
