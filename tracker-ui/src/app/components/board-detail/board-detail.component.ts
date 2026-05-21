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
    MatBottomSheetModule
  ],
  template: `
    <div class="container mx-auto p-4 max-w-4xl min-h-screen pb-32">
      <!-- Header -->
      <header class="mb-6 mt-4 flex items-center">
        <button mat-icon-button (click)="goBack()" class="mr-2">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div>
          <h1 class="text-3xl font-bold text-gray-800 m-0 leading-tight">{{ board()?.name || 'Loading...' }}</h1>
          <p class="text-sm text-gray-500 m-0">{{ board()?.location }}</p>
        </div>
      </header>

      @if (loading()) {
        <div class="flex justify-center mt-20">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <mat-card class="shadow-sm rounded-2xl border border-gray-100 overflow-hidden bg-white">
          <!-- Card Header with Add Tool Button -->
          <div class="flex justify-between items-center p-5 border-b border-gray-100 bg-white">
            <div class="flex items-center gap-3">
              <div class="bg-gray-100 p-2 rounded-lg flex items-center justify-center">
                <mat-icon class="text-gray-500">build</mat-icon>
              </div>
              <h2 class="text-xl font-bold text-gray-800 m-0">Tools Inventory</h2>
            </div>
            <button mat-stroked-button class="rounded-full text-blue-600 border-blue-200 hover:bg-blue-50 font-medium" [disabled]="isOpeningSheet()" (click)="onAddTool()">
              <mat-icon class="mr-1" style="font-size: 20px; height: 20px; width: 20px;">add</mat-icon> Add Tool
            </button>
          </div>

          <!-- Tools List -->
          <div class="flex flex-col">
            @for (tool of tools(); track tool.id; let last = $last) {
              <div
                class="flex items-center p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer border-l-4"
                [ngClass]="{
                  'border-l-transparent': !isMissing(tool) && !isPendingReview(tool),
                  'border-l-red-500': isMissing(tool),
                  'border-l-amber-400': isPendingReview(tool),
                  'pointer-events-none opacity-50': isOpeningSheet()
                }"
                (click)="onToolClick(tool)"
              >
                <!-- Icon Pill -->
                <div 
                  class="flex-shrink-0 p-2 rounded-lg flex items-center justify-center mr-4"
                  [ngClass]="{
                    'bg-gray-100 text-gray-500': !isMissing(tool) && !isPendingReview(tool),
                    'bg-red-50 text-red-500': isMissing(tool),
                    'bg-amber-50 text-amber-600': isPendingReview(tool)
                  }"
                >
                  <mat-icon>{{ tool.iconName || 'handyman' }}</mat-icon>
                </div>

                <!-- Text Content -->
                <div class="flex-grow flex flex-col">
                  <span class="text-sm font-semibold text-gray-800">{{ tool.name }}</span>
                  <div class="text-xs text-gray-400 font-medium mt-0.5">
                    {{ tool.type }} &bull; {{ isMissing(tool) ? 'Missing' : (isPendingReview(tool) ? 'Pending QA' : tool.condition) }}
                  </div>
                  
                  <!-- Incident Details (if active) -->
                  @if ((isMissing(tool) || isPendingReview(tool)) && getActiveIncident(tool.id)) {
                    <div class="mt-2 text-xs text-gray-500 flex flex-col gap-0.5">
                      <span>Reported by <span class="font-medium text-gray-700">{{ getActiveIncident(tool.id)?.reporterName || 'Unknown' }}</span> on {{ getActiveIncident(tool.id)?.reportedAt | date:'short' }}</span>
                      <span>Assigned to: <span class="font-medium text-gray-700">{{ getActiveIncident(tool.id)?.workerName || 'Unknown' }}</span></span>
                    </div>
                  }

                  <!-- QA Action Buttons (if pending review) -->
                  @if (isPendingReview(tool) && isQA) {
                    <div class="mt-3 flex gap-2">
                      <button
                        mat-flat-button
                        class="bg-green-600 text-white !rounded-full !h-8 !px-4 !text-xs"
                        (click)="onVerifyIncident(getActiveIncident(tool.id)!.id); $event.stopPropagation()"
                      >Verify & Close</button>
                      <button
                        mat-stroked-button
                        color="warn"
                        class="!rounded-full !h-8 !px-4 !text-xs"
                        (click)="onReopenIncident(getActiveIncident(tool.id)!.id); $event.stopPropagation()"
                      >Reject</button>
                    </div>
                  }
                </div>

                <!-- Right Action Area (Report Missing) -->
                @if (!isMissing(tool) && !isPendingReview(tool)) {
                  <button
                    mat-icon-button
                    class="flex-shrink-0 ml-4 text-gray-300 hover:text-red-500 transition-colors focus:outline-none"
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
                <div class="bg-gray-50 p-4 rounded-full mb-4">
                  <mat-icon class="text-gray-400" style="font-size: 32px; width: 32px; height: 32px;">handyman</mat-icon>
                </div>
                <h3 class="text-gray-800 font-semibold mb-1">No tools yet</h3>
                <p class="text-sm text-gray-500 max-w-[200px]">Click "Add Tool" above to start building this board's inventory.</p>
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
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private bottomSheet = inject(MatBottomSheet);
  private snackBar = inject(MatSnackBar);

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

  goBack() {
    this.router.navigate(['/boards']);
  }
}
