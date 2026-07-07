import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApiService } from '../../services/api.service';
import { Incident } from '../../models/incident.model';
import { AuthService } from '../../services/auth.service';
import { RealtimeService } from '../../services/realtime.service';
import { DemoRestrictedDialogComponent } from '../demo-restricted-dialog/demo-restricted-dialog.component';
import { SkeletonCardComponent } from '../shared/skeleton-card.component';
import { listStagger, prefersReducedMotion } from '../../shared/animations';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule, MatTabsModule, MatDialogModule, SkeletonCardComponent],
  animations: [listStagger],
  template: `
    <div class="max-w-md mx-auto min-h-screen sb-page pb-20 font-sans">
      <header class="sb-header px-6 py-6 shadow-sm sticky top-0 z-20 flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight sb-text-strong m-0">Command Center</h1>
          <p class="sb-text-muted text-sm m-0 mt-1 font-medium">Global QA Dashboard</p>
        </div>
        @if (auth.isDemoUser()) {
          <button (click)="showDemoInfo()" class="bg-amber-100 text-amber-700 font-bold px-3 py-1.5 rounded-full text-xs shadow-sm flex items-center gap-1.5 border border-amber-200 hover:bg-amber-200 transition-colors">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">visibility</mat-icon> Demo Mode
          </button>
        }
      </header>

      <div class="px-5 mt-2">
        <div class="flex overflow-x-auto border-b sb-border scrollbar-hide">
          <button (click)="selectedTab.set(0)"
                  class="flex-1 whitespace-nowrap py-3.5 px-4 font-bold text-[13px] uppercase tracking-wide border-b-[3px] transition-colors duration-200 outline-none focus-visible:bg-amber-50"
                  [ngClass]="selectedTab() === 0 ? 'border-amber-500 text-amber-600' : 'border-transparent sb-text-subtle hover:border-slate-300'">
            Pending ({{ pendingIncidents().length }})
          </button>
          <button (click)="selectedTab.set(1)"
                  class="flex-1 whitespace-nowrap py-3.5 px-4 font-bold text-[13px] uppercase tracking-wide border-b-[3px] transition-colors duration-200 outline-none focus-visible:bg-rose-50"
                  [ngClass]="selectedTab() === 1 ? 'border-rose-500 text-rose-600' : 'border-transparent sb-text-subtle hover:border-slate-300'">
            Alerts ({{ openIncidents().length }})
          </button>
          <button (click)="selectedTab.set(2)"
                  class="flex-1 whitespace-nowrap py-3.5 px-4 font-bold text-[13px] uppercase tracking-wide border-b-[3px] transition-colors duration-200 outline-none focus-visible:bg-emerald-50"
                  [ngClass]="selectedTab() === 2 ? 'border-emerald-500 text-emerald-600' : 'border-transparent sb-text-subtle hover:border-slate-300'">
            History ({{ resolvedIncidents().length }})
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="p-4">
          <app-skeleton-card [count]="3" />
        </div>
      } @else {
        <div class="mt-1">
          @if (selectedTab() === 0) {
            <!-- Pending QA Content -->
            <div class="p-4 space-y-4" [@listStagger]="pendingIncidents().length" [@.disabled]="reducedMotion">
              @for (incident of pendingIncidents(); track incident.id) {
                <div class="group relative sb-card sb-card-hover p-5 cursor-pointer overflow-hidden" (click)="goToBoard(incident.boardId)">
                  <div class="absolute left-0 top-0 bottom-0 w-1.5 sb-accent--pending"></div>

                  <div class="flex justify-between items-start mb-3 pl-2 gap-2">
                    <h3 class="font-bold sb-text-strong m-0 text-lg group-hover:text-amber-600 transition-colors">{{ incident.toolName || 'Unknown Tool' }}</h3>
                    <span class="sb-chip sb-chip--pending">Pending Review</span>
                  </div>

                  <div class="pl-2 space-y-2">
                    <p class="text-sm sb-text-muted flex items-center gap-1">
                      <mat-icon class="sb-text-subtle text-[18px] w-[18px] h-[18px]">place</mat-icon>
                      <span class="font-medium">{{ incident.boardName || 'Unknown Board' }}</span>
                    </p>

                    <div class="flex flex-col gap-1.5 mt-4 pt-3 border-t sb-border">
                      <p class="text-xs sb-text-subtle flex justify-between items-center">
                        <span>Reported by</span> <strong class="sb-text-muted">{{ incident.reporterName || 'Unknown' }}</strong>
                      </p>
                      <p class="text-xs sb-text-subtle flex justify-between items-center">
                        <span>Assigned to</span> <strong class="sb-text-muted">{{ incident.workerName || 'Unknown' }}</strong>
                      </p>
                      <p class="text-xs sb-text-subtle flex justify-between items-center">
                        <span>Reported at</span> <strong class="sb-text-muted">{{ incident.reportedAt | date:'MMM d, h:mm a' }}</strong>
                      </p>
                    </div>

                    <div class="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border" [ngClass]="isOverTwoHours(incident.reportedAt) ? 'bg-red-50 border-red-100 text-red-600' : 'sb-surface-2 sb-border sb-text-muted'">
                      <mat-icon class="text-[16px] w-[16px] h-[16px]">schedule</mat-icon>
                      <span class="text-xs font-semibold tracking-wide">Elapsed: {{ getTimeElapsed(incident.reportedAt) }}</span>
                    </div>
                  </div>
                </div>
              }
              @if (pendingIncidents().length === 0) {
                <div class="sb-empty mt-2">
                  <div class="sb-surface-2 p-4 rounded-full mb-4 shadow-sm">
                    <mat-icon class="text-3xl sb-text-subtle block">check_circle</mat-icon>
                  </div>
                  <p class="font-medium sb-text-muted">No tasks pending QA review.</p>
                  <p class="text-xs mt-1 sb-text-subtle">You're all caught up!</p>
                </div>
              }
            </div>
          } @else if (selectedTab() === 1) {
            <!-- Active Alerts Content -->
            <div class="p-4 space-y-4" [@listStagger]="openIncidents().length" [@.disabled]="reducedMotion">
              @for (incident of openIncidents(); track incident.id) {
                <div class="group relative sb-card sb-card-hover p-5 cursor-pointer overflow-hidden" (click)="goToBoard(incident.boardId)">
                  <div class="absolute left-0 top-0 bottom-0 w-1.5 sb-accent--open"></div>

                  <div class="flex justify-between items-start mb-3 pl-2 gap-2">
                    <h3 class="font-bold sb-text-strong m-0 text-lg group-hover:text-rose-600 transition-colors">{{ incident.toolName || 'Unknown Tool' }}</h3>
                    <span class="sb-chip sb-chip--open animate-pulse">Missing</span>
                  </div>

                  <div class="pl-2 space-y-2">
                    <p class="text-sm sb-text-muted flex items-center gap-1">
                      <mat-icon class="sb-text-subtle text-[18px] w-[18px] h-[18px]">place</mat-icon>
                      <span class="font-medium">{{ incident.boardName || 'Unknown Board' }}</span>
                    </p>

                    <div class="flex flex-col gap-1.5 mt-4 pt-3 border-t sb-border">
                      <p class="text-xs sb-text-subtle flex justify-between items-center">
                        <span>Reported by</span> <strong class="sb-text-muted">{{ incident.reporterName || 'Unknown' }}</strong>
                      </p>
                      <p class="text-xs sb-text-subtle flex justify-between items-center">
                        <span>Assigned to</span> <strong class="sb-text-muted">{{ incident.workerName || 'Unknown' }}</strong>
                      </p>
                      <p class="text-xs sb-text-subtle flex justify-between items-center">
                        <span>Reported at</span> <strong class="sb-text-muted">{{ incident.reportedAt | date:'MMM d, h:mm a' }}</strong>
                      </p>
                    </div>

                    <div class="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border" [ngClass]="isOverTwoHours(incident.reportedAt) ? 'bg-red-50 border-red-100 text-red-600' : 'sb-surface-2 sb-border sb-text-muted'">
                      <mat-icon class="text-[16px] w-[16px] h-[16px]">schedule</mat-icon>
                      <span class="text-xs font-semibold tracking-wide">Elapsed: {{ getTimeElapsed(incident.reportedAt) }}</span>
                    </div>
                  </div>
                </div>
              }
              @if (openIncidents().length === 0) {
                <div class="sb-empty mt-2">
                  <div class="bg-emerald-50 p-4 rounded-full mb-4 shadow-sm">
                    <mat-icon class="text-3xl text-emerald-500 block">task_alt</mat-icon>
                  </div>
                  <p class="font-medium sb-text-muted">All clear! No missing tools.</p>
                  <p class="text-xs mt-1 sb-text-subtle">The factory floor is fully operational.</p>
                </div>
              }
            </div>
          } @else if (selectedTab() === 2) {
            <!-- History Content -->
            <div class="p-4 space-y-4" [@listStagger]="resolvedIncidents().length" [@.disabled]="reducedMotion">
              @for (incident of resolvedIncidents(); track incident.id) {
                <div class="group relative sb-card sb-card-hover p-5 cursor-pointer overflow-hidden" (click)="goToBoard(incident.boardId)">
                  <div class="absolute left-0 top-0 bottom-0 w-1.5 sb-accent--resolved"></div>

                  <div class="flex justify-between items-start mb-3 pl-2 gap-2">
                    <h3 class="font-bold sb-text-strong m-0 text-lg group-hover:text-emerald-600 transition-colors">{{ incident.toolName || 'Unknown Tool' }}</h3>
                    <span class="sb-chip sb-chip--resolved">Resolved</span>
                  </div>

                  <div class="pl-2 space-y-2">
                    <p class="text-sm sb-text-muted flex items-center gap-1">
                      <mat-icon class="sb-text-subtle text-[18px] w-[18px] h-[18px]">place</mat-icon>
                      <span class="font-medium">{{ incident.boardName || 'Unknown Board' }}</span>
                    </p>

                    <div class="flex flex-col gap-1.5 mt-4 pt-3 border-t sb-border">
                      <p class="text-xs sb-text-subtle flex justify-between items-center">
                        <span>Reported by</span> <strong class="sb-text-muted">{{ incident.reporterName || 'Unknown' }}</strong>
                      </p>
                      <p class="text-xs sb-text-subtle flex justify-between items-center">
                        <span>Resolved by</span> <strong class="sb-text-muted">{{ incident.workerName || 'Unknown' }}</strong>
                      </p>
                      <p class="text-xs sb-text-subtle flex justify-between items-center">
                        <span>Resolved at</span> <strong class="sb-text-muted">{{ incident.resolvedAt | date:'mediumDate' }}</strong>
                      </p>
                    </div>

                    <div class="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border sb-surface-2 sb-border sb-text-muted">
                      <mat-icon class="text-[16px] w-[16px] h-[16px]">check_circle_outline</mat-icon>
                      <span class="text-xs font-semibold tracking-wide">{{ getResolutionTime(incident.reportedAt, incident.resolvedAt) }}</span>
                    </div>
                  </div>
                </div>
              }
              @if (resolvedIncidents().length === 0) {
                <div class="sb-empty mt-2">
                  <div class="sb-surface-2 p-4 rounded-full mb-4 shadow-sm">
                    <mat-icon class="text-3xl sb-text-subtle block">history</mat-icon>
                  </div>
                  <p class="font-medium sb-text-muted">No resolved history.</p>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);
  public auth = inject(AuthService);
  private dialog = inject(MatDialog);
  private realtime = inject(RealtimeService);
  private destroyRef = inject(DestroyRef);

  readonly reducedMotion = prefersReducedMotion();

  globalIncidents = signal<Incident[]>([]);
  loading = signal<boolean>(true);
  selectedTab = signal<number>(0);

  pendingIncidents = computed(() => this.globalIncidents().filter(i => i.status === 'PendingReview' || i.status === 1 as any));
  openIncidents = computed(() => this.globalIncidents().filter(i => i.status === 'Open' || i.status === 0 as any));
  resolvedIncidents = computed(() => this.globalIncidents().filter(i => i.status === 'Resolved' || i.status === 2 as any));

  ngOnInit() {
    // Wire the live streams BEFORE connecting. The socket only opens after the initial
    // fetch resolves (below), so no push can arrive before the baseline is set — that
    // avoids a race where a push gets overwritten by the initial .set(data).
    this.realtime.incidentChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(incident => this.upsertIncident(incident));

    this.realtime.incidentDeleted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => this.removeIncident(id));

    this.api.getAllGlobalIncidents().subscribe({
      next: (data) => {
        this.globalIncidents.set(data);
        this.loading.set(false);
        // Baseline is in place — now go live.
        this.realtime.start();
      },
      error: (err) => {
        console.error('Failed to fetch global incidents', err);
        this.loading.set(false);
      }
    });
  }

  ngOnDestroy() {
    this.realtime.stop();
  }

  /** Replaces an existing incident in place, or prepends a brand-new one (newest first). */
  private upsertIncident(incoming: Incident) {
    this.globalIncidents.update(list => {
      const index = list.findIndex(i => i.id === incoming.id);
      if (index === -1) {
        return [incoming, ...list];
      }
      const next = [...list];
      next[index] = incoming;
      return next;
    });
  }

  private removeIncident(id: string) {
    this.globalIncidents.update(list => list.filter(i => i.id !== id));
  }

  goToBoard(boardId?: string) {
    if (boardId) {
      this.router.navigate(['/board', boardId]);
    }
  }

  getTimeElapsed(reportedAt: string | Date): string {
    const start = new Date(reportedAt).getTime();
    const now = new Date().getTime();
    const diffMs = now - start;
    return this.formatTimeDiff(diffMs);
  }

  getResolutionTime(reportedAt: string | Date, resolvedAt?: string | Date): string {
    if (!resolvedAt) return 'Unknown';
    const start = new Date(reportedAt).getTime();
    const end = new Date(resolvedAt).getTime();
    const diffMs = end - start;
    return `Took ${this.formatTimeDiff(diffMs)}`;
  }

  isOverTwoHours(reportedAt: string | Date): boolean {
    const start = new Date(reportedAt).getTime();
    const now = new Date().getTime();
    return (now - start) > 7200000;
  }

  private formatTimeDiff(diffMs: number): string {
    if (diffMs < 0) return '0 mins';
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours > 0) {
      return `${hours} hr${hours > 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
    }
    return `${mins} min${mins !== 1 ? 's' : ''}`;
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
