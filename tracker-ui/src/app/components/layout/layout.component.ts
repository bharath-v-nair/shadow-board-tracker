import { Component, computed, inject, signal, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { forkJoin } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBottomSheetModule, MatBottomSheet } from '@angular/material/bottom-sheet';
import { AdminMenuComponent } from '../admin-menu/admin-menu.component';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { SearchService, SearchResultItem } from '../../services/search.service';
import { Board } from '../../models/board.model';
import { Tool } from '../../models/tool.model';
import { Incident } from '../../models/incident.model';
import { fadeSlide, prefersReducedMotion } from '../../shared/animations';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatButtonModule, MatBottomSheetModule],
  animations: [fadeSlide],
  template: `
    <div class="max-w-md mx-auto h-screen flex flex-col sb-page relative overflow-hidden">
      <!-- Top App Bar -->
      <header class="sb-surface border-b sb-border px-4 py-3 flex items-center shadow-sm z-10" style="padding-top: max(0.75rem, env(safe-area-inset-top));">
        <!-- Avatar Touch Target -->
        <button (click)="openProfileMenu()" aria-label="Open profile menu" class="w-12 h-12 rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-brand)] flex-shrink-0 border sb-border sb-surface-2 flex items-center justify-center hover:brightness-95 transition">
          <mat-icon class="sb-text-muted">person</mat-icon>
        </button>

        <!-- Search Pill (opens the search overlay; the sparkle is dormant until Phase 28) -->
        <button (click)="openSearch()" aria-label="Search boards, tools and incidents"
                class="rounded-full sb-surface-2 flex-1 ml-3 px-4 py-3 flex items-center justify-between sb-text-subtle cursor-text text-left hover:brightness-95 transition">
          <span class="text-sm font-medium">Ask AI or Search...</span>
          <mat-icon class="text-blue-500" style="font-size: 20px; width: 20px; height: 20px;">auto_awesome</mat-icon>
        </button>
      </header>

      <!-- Main Content Area -->
      <main class="flex-1 overflow-y-auto p-4 pb-24">
        <router-outlet></router-outlet>
      </main>

      <!-- Search Overlay -->
      @if (searchOpen()) {
        <div class="absolute inset-0 z-40 sb-page flex flex-col" @fadeSlide [@.disabled]="reducedMotion"
             (keydown.escape)="closeSearch()">
          <header class="sb-surface border-b sb-border px-3 py-3 flex items-center gap-2" style="padding-top: max(0.75rem, env(safe-area-inset-top));">
            <button mat-icon-button (click)="closeSearch()" aria-label="Close search" class="sb-text-muted">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div class="flex items-center flex-1 rounded-full sb-surface-2 px-4 py-2.5">
              <mat-icon class="sb-text-subtle mr-2" style="font-size:20px;width:20px;height:20px;">search</mat-icon>
              <input #searchInput type="text" [(ngModel)]="queryText" (ngModelChange)="queryRaw.set($event)"
                     placeholder="Search boards, tools, incidents"
                     class="bg-transparent flex-1 outline-none text-sm sb-text-strong" />
              @if (queryText) {
                <button (click)="clearQuery()" aria-label="Clear" class="sb-text-subtle">
                  <mat-icon style="font-size:18px;width:18px;height:18px;">close</mat-icon>
                </button>
              }
            </div>
          </header>

          <div class="flex-1 overflow-y-auto p-4">
            @if (loading()) {
              <div class="space-y-3">
                @for (r of [1,2,3,4]; track r) {
                  <div class="sb-card p-4 flex items-center gap-3">
                    <div class="sb-skeleton h-9 w-9 rounded-lg"></div>
                    <div class="flex-1">
                      <div class="sb-skeleton h-4 w-2/5 mb-2"></div>
                      <div class="sb-skeleton h-3 w-1/4"></div>
                    </div>
                  </div>
                }
              </div>
            } @else if (!debounced()?.trim()) {
              <div class="sb-empty mt-4">
                <mat-icon class="text-3xl sb-text-subtle mb-2">search</mat-icon>
                <p class="font-medium sb-text-muted">Search the floor</p>
                <p class="text-xs sb-text-subtle mt-1">Find any board, tool or incident by name.</p>
              </div>
            } @else if (results().total === 0) {
              <div class="sb-empty mt-4">
                <mat-icon class="text-3xl sb-text-subtle mb-2">search_off</mat-icon>
                <p class="font-medium sb-text-muted">No matches for “{{ debounced() }}”.</p>
                <p class="text-xs sb-text-subtle mt-1">Try a different name or keyword.</p>
              </div>
            } @else {
              @if (results().boards.length) {
                <p class="text-xs font-bold uppercase tracking-wider sb-text-subtle mb-2 px-1">Boards</p>
                <div class="space-y-2 mb-5">
                  @for (item of results().boards; track item.id) {
                    <ng-container *ngTemplateOutlet="row; context: { $implicit: item, icon: 'dashboard' }"></ng-container>
                  }
                </div>
              }
              @if (results().tools.length) {
                <p class="text-xs font-bold uppercase tracking-wider sb-text-subtle mb-2 px-1">Tools</p>
                <div class="space-y-2 mb-5">
                  @for (item of results().tools; track item.id) {
                    <ng-container *ngTemplateOutlet="row; context: { $implicit: item, icon: 'handyman' }"></ng-container>
                  }
                </div>
              }
              @if (results().incidents.length) {
                <p class="text-xs font-bold uppercase tracking-wider sb-text-subtle mb-2 px-1">Incidents</p>
                <div class="space-y-2 mb-5">
                  @for (item of results().incidents; track item.id) {
                    <ng-container *ngTemplateOutlet="row; context: { $implicit: item, icon: 'report' }"></ng-container>
                  }
                </div>
              }
            }
          </div>
        </div>

        <!-- Result row template -->
        <ng-template #row let-item let-icon="icon">
          <button (click)="go(item)" class="w-full sb-card sb-card-hover p-3.5 flex items-center gap-3 text-left">
            <div class="sb-surface-2 p-2 rounded-lg flex items-center justify-center flex-shrink-0">
              <mat-icon class="sb-text-subtle" style="font-size:20px;width:20px;height:20px;">{{ icon }}</mat-icon>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold sb-text-strong m-0 truncate">{{ item.label }}</p>
              <p class="text-xs sb-text-subtle m-0 truncate">{{ item.sublabel }}</p>
            </div>
            @if (item.status) {
              <span class="sb-chip"
                    [class.sb-chip--open]="item.status === 'open'"
                    [class.sb-chip--pending]="item.status === 'pending'"
                    [class.sb-chip--resolved]="item.status === 'resolved'">
                {{ statusLabel(item.status) }}
              </span>
            }
          </button>
        </ng-template>
      }

      <!-- Bottom Navigation -->
      <nav class="absolute bottom-0 w-full sb-surface border-t sb-border shadow-[0_-8px_24px_-4px_rgba(0,0,0,0.08)] flex items-end z-20" style="height: 68px; padding-bottom: env(safe-area-inset-bottom);">

        <!-- Left: Home -->
        <button class="group relative flex flex-col items-center justify-center focus:outline-none transition-all duration-200 flex-1 h-full pb-2"
                routerLink="/dashboard"
                routerLinkActive #homeLink="routerLinkActive">
          <mat-icon class="transition-all duration-200 text-[26px] w-[26px] h-[26px]"
                    [ngClass]="homeLink.isActive ? 'text-blue-600 scale-110' : 'text-slate-400 group-hover:text-slate-600'">
            home
          </mat-icon>
          <span class="text-[10px] mt-0.5 font-semibold tracking-wide transition-colors duration-200"
                [ngClass]="homeLink.isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'">
            Home
          </span>
          <span class="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600 transition-all duration-300"
                [ngClass]="homeLink.isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'">
          </span>
        </button>

        <!-- Center spacer for FAB -->
        <div class="flex-1"></div>

        <!-- Right: Boards -->
        <button class="group relative flex flex-col items-center justify-center focus:outline-none transition-all duration-200 flex-1 h-full pb-2"
                routerLink="/boards"
                routerLinkActive #boardsLink="routerLinkActive">
          <mat-icon class="transition-all duration-200 text-[26px] w-[26px] h-[26px]"
                    [ngClass]="boardsLink.isActive ? 'text-blue-600 scale-110' : 'text-slate-400 group-hover:text-slate-600'">
            grid_view
          </mat-icon>
          <span class="text-[10px] mt-0.5 font-semibold tracking-wide transition-colors duration-200"
                [ngClass]="boardsLink.isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'">
            Boards
          </span>
          <span class="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600 transition-all duration-300"
                [ngClass]="boardsLink.isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'">
          </span>
        </button>
      </nav>

      <!-- Center FAB (glowing gradient) -->
      <div class="absolute bottom-5 left-1/2 transform -translate-x-1/2 z-30">
        <a routerLink="/scan"
           class="w-[60px] h-[60px] rounded-full flex items-center justify-center text-white
                  transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none
                  focus:ring-4 focus:ring-blue-300/60"
           style="background: linear-gradient(135deg, #6366f1 0%, #2563eb 100%);
                  box-shadow: 0 8px 24px -4px rgba(99,102,241,0.6), 0 4px 12px -2px rgba(37,99,235,0.4);">
          <mat-icon style="font-size: 26px; width: 26px; height: 26px;">qr_code_scanner</mat-icon>
        </a>
      </div>
    </div>
  `
})
export class LayoutComponent {
  private bottomSheet = inject(MatBottomSheet);
  private authService = inject(AuthService);
  private router = inject(Router);
  private api = inject(ApiService);
  private searchSvc = inject(SearchService);

  readonly reducedMotion = prefersReducedMotion();

  // ── Search state ─────────────────────────────────────────
  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  searchOpen = signal(false);
  loading = signal(false);
  private loaded = false;

  queryText = '';
  queryRaw = signal('');
  // ~200ms debounce so we filter on a settled query, not every keystroke.
  debounced = toSignal(toObservable(this.queryRaw).pipe(debounceTime(200)), { initialValue: '' });

  private boards = signal<Board[]>([]);
  private tools = signal<Tool[]>([]);
  private incidents = signal<Incident[]>([]);

  results = computed(() =>
    this.searchSvc.search(this.debounced(), {
      boards: this.boards(),
      tools: this.tools(),
      incidents: this.incidents(),
    })
  );

  openSearch(): void {
    this.searchOpen.set(true);
    // Fetch the searchable corpus once, on first open.
    if (!this.loaded) {
      this.loading.set(true);
      forkJoin({
        boards: this.api.getBoards(),
        tools: this.api.getTools(),
        incidents: this.api.getAllGlobalIncidents(),
      }).subscribe({
        next: ({ boards, tools, incidents }) => {
          this.boards.set(boards);
          this.tools.set(tools);
          this.incidents.set(incidents);
          this.loaded = true;
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Search data load failed', err);
          this.loading.set(false);
        },
      });
    }
    // Focus the input after the overlay renders.
    setTimeout(() => this.searchInput()?.nativeElement.focus(), 0);
  }

  closeSearch(): void {
    this.searchOpen.set(false);
  }

  clearQuery(): void {
    this.queryText = '';
    this.queryRaw.set('');
    this.searchInput()?.nativeElement.focus();
  }

  go(item: SearchResultItem): void {
    this.closeSearch();
    this.router.navigate(item.link as string[]);
  }

  statusLabel(status: string): string {
    if (status === 'open') return 'Missing';
    if (status === 'pending') return 'Pending';
    if (status === 'resolved') return 'Resolved';
    return status;
  }

  openProfileMenu() {
    this.bottomSheet.open(AdminMenuComponent);
  }

  signOut() {
    this.authService.clearToken();
    this.router.navigate(['/login']);
  }
}
