import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ApiService } from '../../services/api.service';
import { Incident } from '../../models/incident.model';
import { Board } from '../../models/board.model';
import { Worker } from '../../models/worker.model';
import { AuthService } from '../../services/auth.service';
import { RealtimeService } from '../../services/realtime.service';
import { SkeletonCardComponent } from '../shared/skeleton-card.component';
import { listStagger, prefersReducedMotion } from '../../shared/animations';
import { applyIncidentFilters, activeFilterCount, IncidentSort } from '../../shared/incident-filter';

type DatePreset = 'all' | 'today' | '7d' | '30d';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule, MatMenuModule, SkeletonCardComponent],
  animations: [listStagger],
  template: `
    <div class="max-w-md mx-auto min-h-screen sb-page pb-20 font-sans">
      <header class="sb-header px-6 py-6 shadow-sm sticky top-0 z-20">
        <h1 class="text-3xl font-extrabold tracking-tight sb-text-strong m-0">Command Center</h1>
      </header>

      <!-- Tabs -->
      <div class="px-5 mt-2">
        <div class="flex overflow-x-auto border-b sb-border scrollbar-hide">
          <button (click)="selectedTab.set(0)"
                  class="flex-1 whitespace-nowrap py-3.5 px-4 font-bold text-[13px] uppercase tracking-wide border-b-[3px] transition-colors duration-200 outline-none"
                  [ngClass]="selectedTab() === 0 ? 'border-amber-500 text-amber-600' : 'border-transparent sb-text-subtle hover:border-slate-300'">
            Pending ({{ pendingIncidents().length }})
          </button>
          <button (click)="selectedTab.set(1)"
                  class="flex-1 whitespace-nowrap py-3.5 px-4 font-bold text-[13px] uppercase tracking-wide border-b-[3px] transition-colors duration-200 outline-none"
                  [ngClass]="selectedTab() === 1 ? 'border-rose-500 text-rose-600' : 'border-transparent sb-text-subtle hover:border-slate-300'">
            Alerts ({{ openIncidents().length }})
          </button>
          <button (click)="selectedTab.set(2)"
                  class="flex-1 whitespace-nowrap py-3.5 px-4 font-bold text-[13px] uppercase tracking-wide border-b-[3px] transition-colors duration-200 outline-none"
                  [ngClass]="selectedTab() === 2 ? 'border-emerald-500 text-emerald-600' : 'border-transparent sb-text-subtle hover:border-slate-300'">
            History ({{ resolvedIncidents().length }})
          </button>
        </div>
      </div>

      <!-- Filter / sort bar -->
      @if (!loading()) {
        <div class="px-4 mt-3 flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          <div class="flex rounded-full sb-surface-2 p-0.5 flex-shrink-0 border sb-border">
            @for (p of datePresets; track p.key) {
              <button (click)="datePreset.set(p.key)"
                      class="px-3 py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap"
                      [ngClass]="datePreset() === p.key ? 'sb-surface sb-text-strong shadow-sm' : 'sb-text-subtle'">
                {{ p.label }}
              </button>
            }
          </div>

          <button [matMenuTriggerFor]="boardMenu" class="flex items-center gap-1 flex-shrink-0 rounded-full sb-surface-2 border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors"
                  [ngClass]="filterBoardId() ? 'sb-brand-text border-[color:var(--sb-brand)]' : 'sb-text-muted sb-border'">
            <mat-icon class="text-[15px] w-[15px] h-[15px]">grid_view</mat-icon>
            <span class="truncate max-w-[110px]">{{ boardLabel() }}</span>
            <mat-icon class="text-[16px] w-[16px] h-[16px]">expand_more</mat-icon>
          </button>
          <mat-menu #boardMenu="matMenu">
            <button mat-menu-item (click)="filterBoardId.set(null)">All boards</button>
            @for (b of boards(); track b.id) {
              <button mat-menu-item (click)="filterBoardId.set(b.id)">{{ b.name }}</button>
            }
          </mat-menu>

          <button [matMenuTriggerFor]="workerMenu" class="flex items-center gap-1 flex-shrink-0 rounded-full sb-surface-2 border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors"
                  [ngClass]="filterWorkerId() ? 'sb-brand-text border-[color:var(--sb-brand)]' : 'sb-text-muted sb-border'">
            <mat-icon class="text-[15px] w-[15px] h-[15px]">person</mat-icon>
            <span class="truncate max-w-[110px]">{{ workerLabel() }}</span>
            <mat-icon class="text-[16px] w-[16px] h-[16px]">expand_more</mat-icon>
          </button>
          <mat-menu #workerMenu="matMenu">
            <button mat-menu-item (click)="filterWorkerId.set(null)">All workers</button>
            @for (w of workers(); track w.id) {
              <button mat-menu-item (click)="filterWorkerId.set(w.id)">{{ w.name }}</button>
            }
          </mat-menu>

          <button [matMenuTriggerFor]="sortMenu" class="flex items-center gap-1 flex-shrink-0 rounded-full sb-surface-2 border sb-border px-3 py-1.5 text-xs font-semibold sb-text-muted whitespace-nowrap">
            <mat-icon class="text-[15px] w-[15px] h-[15px]">swap_vert</mat-icon>
            <span>{{ sort() === 'newest' ? 'Newest' : 'Oldest' }}</span>
          </button>
          <mat-menu #sortMenu="matMenu">
            <button mat-menu-item (click)="sort.set('newest')">Newest first</button>
            <button mat-menu-item (click)="sort.set('oldest')">Oldest first</button>
          </mat-menu>

          @if (activeCount() > 0) {
            <button (click)="clearFilters()" class="flex-shrink-0 flex items-center gap-1 text-xs font-semibold sb-brand-text px-2 whitespace-nowrap">
              <mat-icon class="text-[15px] w-[15px] h-[15px]">close</mat-icon> Clear
            </button>
          }
        </div>
      }

      @if (loading()) {
        <div class="p-4"><app-skeleton-card [count]="3" /></div>
      } @else {
        <div class="mt-1">
          @if (selectedTab() === 0) {
            <div class="p-4 space-y-3" [@listStagger]="pendingIncidents().length" [@.disabled]="reducedMotion">
              @for (incident of pendingIncidents(); track incident.id) {
                <ng-container *ngTemplateOutlet="activeCard; context: { $implicit: incident, kind: 'pending' }"></ng-container>
              }
              @if (pendingIncidents().length === 0) {
                <ng-container *ngTemplateOutlet="emptyState; context: { icon: activeCount() ? 'filter_alt_off' : 'check_circle', title: activeCount() ? 'No matches for these filters.' : 'No tasks pending QA review.', sub: activeCount() ? 'Try clearing a filter.' : 'You are all caught up!' }"></ng-container>
              }
            </div>
          } @else if (selectedTab() === 1) {
            <div class="p-4 space-y-3" [@listStagger]="openIncidents().length" [@.disabled]="reducedMotion">
              @for (incident of openIncidents(); track incident.id) {
                <ng-container *ngTemplateOutlet="activeCard; context: { $implicit: incident, kind: 'open' }"></ng-container>
              }
              @if (openIncidents().length === 0) {
                <ng-container *ngTemplateOutlet="emptyState; context: { icon: activeCount() ? 'filter_alt_off' : 'task_alt', title: activeCount() ? 'No matches for these filters.' : 'All clear! No missing tools.', sub: activeCount() ? 'Try clearing a filter.' : 'The factory floor is fully operational.' }"></ng-container>
              }
            </div>
          } @else if (selectedTab() === 2) {
            <div class="p-4 space-y-3" [@listStagger]="resolvedIncidents().length" [@.disabled]="reducedMotion">
              @for (incident of resolvedIncidents(); track incident.id) {
                <div class="group relative sb-card sb-card-hover p-4 cursor-pointer overflow-hidden" (click)="goToBoard(incident.boardId)">
                  <div class="absolute left-0 top-0 bottom-0 w-1.5 sb-accent--resolved"></div>
                  <div class="pl-2">
                    <div class="flex items-center justify-between gap-2">
                      <h3 class="font-bold sb-text-strong text-base truncate m-0 group-hover:text-emerald-600 transition-colors">{{ incident.toolName || 'Unknown Tool' }}</h3>
                      <span class="sb-chip sb-chip--resolved">Resolved</span>
                    </div>
                    <div class="flex items-center gap-1.5 mt-1.5 text-xs sb-text-subtle min-w-0">
                      <mat-icon class="text-[14px] w-[14px] h-[14px] flex-shrink-0">place</mat-icon>
                      <span class="truncate">{{ incident.boardName || 'Unknown Board' }}</span>
                      <span class="opacity-50">•</span>
                      <mat-icon class="text-[14px] w-[14px] h-[14px] flex-shrink-0">schedule</mat-icon>
                      <span class="whitespace-nowrap">{{ getResolutionTime(incident.reportedAt, incident.resolvedAt) }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 mt-1.5 text-xs sb-text-muted min-w-0">
                      <span class="truncate">{{ incident.reporterName || 'Unknown' }}</span>
                      <mat-icon class="text-[14px] w-[14px] h-[14px] sb-text-subtle flex-shrink-0">arrow_forward</mat-icon>
                      <span class="truncate">{{ incident.workerName || 'Unknown' }}</span>
                      <span class="ml-auto whitespace-nowrap sb-text-subtle">{{ incident.resolvedAt | date:'MMM d' }}</span>
                    </div>
                  </div>
                </div>
              }
              @if (resolvedIncidents().length === 0) {
                <ng-container *ngTemplateOutlet="emptyState; context: { icon: activeCount() ? 'filter_alt_off' : 'history', title: activeCount() ? 'No matches for these filters.' : 'No resolved history.', sub: activeCount() ? 'Try clearing a filter.' : '' }"></ng-container>
              }
            </div>
          }
        </div>
      }
    </div>

    <!-- Compact active-incident card (Pending + Alerts) -->
    <ng-template #activeCard let-incident let-kind="kind">
      <div class="group relative sb-card sb-card-hover p-4 cursor-pointer overflow-hidden" (click)="goToBoard(incident.boardId)">
        <div class="absolute left-0 top-0 bottom-0 w-1.5" [ngClass]="kind === 'open' ? 'sb-accent--open' : 'sb-accent--pending'"></div>
        <div class="pl-2">
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-bold sb-text-strong text-base truncate m-0 transition-colors"
                [ngClass]="kind === 'open' ? 'group-hover:text-rose-600' : 'group-hover:text-amber-600'">
              {{ incident.toolName || 'Unknown Tool' }}
            </h3>
            <span class="sb-chip" [ngClass]="kind === 'open' ? 'sb-chip--open animate-pulse' : 'sb-chip--pending'">
              {{ kind === 'open' ? 'Missing' : 'Pending Review' }}
            </span>
          </div>
          <div class="flex items-center gap-1.5 mt-1.5 text-xs min-w-0" [ngClass]="isOverTwoHours(incident.reportedAt) ? 'text-red-500' : 'sb-text-subtle'">
            <mat-icon class="text-[14px] w-[14px] h-[14px] flex-shrink-0">place</mat-icon>
            <span class="truncate sb-text-subtle">{{ incident.boardName || 'Unknown Board' }}</span>
            <span class="opacity-50">•</span>
            <mat-icon class="text-[14px] w-[14px] h-[14px] flex-shrink-0">schedule</mat-icon>
            <span class="whitespace-nowrap font-semibold">{{ getTimeElapsed(incident.reportedAt) }}</span>
          </div>
          <div class="flex items-center gap-1.5 mt-1.5 text-xs sb-text-muted min-w-0">
            <span class="truncate">{{ incident.reporterName || 'Unknown' }}</span>
            <mat-icon class="text-[14px] w-[14px] h-[14px] sb-text-subtle flex-shrink-0">arrow_forward</mat-icon>
            <span class="truncate">{{ incident.workerName || 'Unknown' }}</span>
          </div>
        </div>
      </div>
    </ng-template>

    <!-- Shared empty state -->
    <ng-template #emptyState let-icon="icon" let-title="title" let-sub="sub">
      <div class="sb-empty mt-2">
        <div class="sb-surface-2 p-4 rounded-full mb-4 shadow-sm">
          <mat-icon class="text-3xl sb-text-subtle block">{{ icon }}</mat-icon>
        </div>
        <p class="font-medium sb-text-muted">{{ title }}</p>
        @if (sub) { <p class="text-xs mt-1 sb-text-subtle">{{ sub }}</p> }
      </div>
    </ng-template>
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);
  public auth = inject(AuthService);
  private realtime = inject(RealtimeService);
  private destroyRef = inject(DestroyRef);

  readonly reducedMotion = prefersReducedMotion();

  globalIncidents = signal<Incident[]>([]);
  boards = signal<Board[]>([]);
  workers = signal<Worker[]>([]);
  loading = signal<boolean>(true);
  selectedTab = signal<number>(0);

  // ── Filters ──────────────────────────────────────────────
  readonly datePresets: { key: DatePreset; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: '7d', label: '7d' },
    { key: '30d', label: '30d' },
  ];
  filterBoardId = signal<string | null>(null);
  filterWorkerId = signal<string | null>(null);
  datePreset = signal<DatePreset>('all');
  sort = signal<IncidentSort>('newest');

  private fromMs = computed<number | null>(() => {
    const preset = this.datePreset();
    if (preset === 'all') return null;
    const now = new Date();
    if (preset === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const days = preset === '7d' ? 7 : 30;
    return now.getTime() - days * 24 * 60 * 60 * 1000;
  });

  private criteria = computed(() => ({
    boardId: this.filterBoardId(),
    workerId: this.filterWorkerId(),
    from: this.fromMs(),
    sort: this.sort(),
  }));

  private filtered = computed(() => applyIncidentFilters(this.globalIncidents(), this.criteria()));
  activeCount = computed(() => activeFilterCount(this.criteria()));

  boardLabel = computed(() => this.boards().find(b => b.id === this.filterBoardId())?.name ?? 'Board');
  workerLabel = computed(() => this.workers().find(w => w.id === this.filterWorkerId())?.name ?? 'Worker');

  pendingIncidents = computed(() => this.filtered().filter(i => i.status === 'PendingReview' || i.status === 1 as any));
  openIncidents = computed(() => this.filtered().filter(i => i.status === 'Open' || i.status === 0 as any));
  resolvedIncidents = computed(() => this.filtered().filter(i => i.status === 'Resolved' || i.status === 2 as any));

  ngOnInit() {
    // Wire live streams BEFORE connecting so no push is missed once the baseline is set.
    this.realtime.incidentChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(incident => this.upsertIncident(incident));

    this.realtime.incidentDeleted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => this.removeIncident(id));

    // Incidents drive the tabs; boards + workers populate the filter dropdowns.
    forkJoin({
      incidents: this.api.getAllGlobalIncidents(),
      boards: this.api.getBoards(),
      workers: this.api.getWorkers('Worker'),
    }).subscribe({
      next: ({ incidents, boards, workers }) => {
        this.globalIncidents.set(incidents);
        this.boards.set(boards);
        this.workers.set(workers);
        this.loading.set(false);
        this.realtime.start();
      },
      error: (err) => {
        console.error('Failed to fetch dashboard data', err);
        this.loading.set(false);
      }
    });
  }

  ngOnDestroy() {
    this.realtime.stop();
  }

  clearFilters() {
    this.filterBoardId.set(null);
    this.filterWorkerId.set(null);
    this.datePreset.set('all');
  }

  /** Replaces an existing incident in place, or prepends a brand-new one (newest first). */
  private upsertIncident(incoming: Incident) {
    this.globalIncidents.update(list => {
      const index = list.findIndex(i => i.id === incoming.id);
      if (index === -1) return [incoming, ...list];
      const next = [...list];
      next[index] = incoming;
      return next;
    });
  }

  private removeIncident(id: string) {
    this.globalIncidents.update(list => list.filter(i => i.id !== id));
  }

  goToBoard(boardId?: string) {
    if (boardId) this.router.navigate(['/board', boardId]);
  }

  getTimeElapsed(reportedAt: string | Date): string {
    return this.formatTimeDiff(new Date().getTime() - new Date(reportedAt).getTime());
  }

  getResolutionTime(reportedAt: string | Date, resolvedAt?: string | Date): string {
    if (!resolvedAt) return 'Resolved';
    return `Took ${this.formatTimeDiff(new Date(resolvedAt).getTime() - new Date(reportedAt).getTime())}`;
  }

  isOverTwoHours(reportedAt: string | Date): boolean {
    return (new Date().getTime() - new Date(reportedAt).getTime()) > 7200000;
  }

  private formatTimeDiff(diffMs: number): string {
    if (diffMs < 0) return '0 mins';
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours > 0) return `${hours} hr${hours > 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
    return `${mins} min${mins !== 1 ? 's' : ''}`;
  }
}
