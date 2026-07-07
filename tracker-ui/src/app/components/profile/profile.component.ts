import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { Worker } from '../../models/worker.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatSlideToggleModule, MatSnackBarModule],
  template: `
    <div class="max-w-md mx-auto min-h-screen sb-page pb-24">
      <header class="sb-header px-4 py-4 flex items-center shadow-sm sticky top-0 z-20">
        <button mat-icon-button (click)="goBack()" aria-label="Back" class="mr-2 sb-text-muted">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1 class="text-xl font-bold sb-text-strong m-0">Profile</h1>
      </header>

      <div class="p-4">
        @if (loading()) {
          <div class="sb-card p-6 flex flex-col items-center">
            <div class="sb-skeleton h-24 w-24 rounded-full mb-4"></div>
            <div class="sb-skeleton h-5 w-40 mb-2"></div>
            <div class="sb-skeleton h-4 w-24"></div>
          </div>
        } @else if (worker(); as w) {
          <!-- Identity card -->
          <div class="sb-card p-6 flex flex-col items-center text-center">
            <div class="w-24 h-24 rounded-full flex items-center justify-center mb-4 shadow-inner"
                 style="background: var(--sb-brand-soft);">
              <span class="text-4xl font-extrabold sb-brand-text">{{ initials() }}</span>
            </div>
            <h2 class="text-2xl font-bold sb-text-strong m-0">{{ w.name }}</h2>
            <span class="sb-chip mt-2"
                  [class.sb-chip--resolved]="roleKey() === 'QA'"
                  [class.sb-chip--pending]="roleKey() === 'DemoViewer'"
                  [class.sb-chip--open]="roleKey() === 'Worker'">
              {{ roleLabel() }}
            </span>
          </div>

          <!-- Details -->
          <div class="sb-card mt-4 divide-y sb-border">
            <div class="flex items-center gap-3 p-4">
              <mat-icon class="sb-text-subtle">mail</mat-icon>
              <div class="flex-1 min-w-0">
                <p class="text-xs sb-text-subtle m-0 uppercase tracking-wide font-semibold">Email</p>
                <p class="sb-text-strong m-0 truncate">{{ w.email }}</p>
              </div>
              <mat-icon class="sb-text-subtle text-[18px] w-[18px] h-[18px]" aria-label="Read only" title="Read only">lock</mat-icon>
            </div>

            <div class="flex items-center gap-3 p-4">
              <mat-icon [class.text-emerald-500]="w.isOnShift" [class.sb-text-subtle]="!w.isOnShift">
                {{ w.isOnShift ? 'work' : 'work_off' }}
              </mat-icon>
              <div class="flex-1">
                <p class="text-xs sb-text-subtle m-0 uppercase tracking-wide font-semibold">Shift status</p>
                <p class="m-0 font-semibold" [ngClass]="w.isOnShift ? 'text-emerald-600' : 'sb-text-muted'">
                  {{ w.isOnShift ? 'On shift' : 'Off shift' }}
                </p>
              </div>
              <mat-slide-toggle
                color="primary"
                [checked]="w.isOnShift"
                [disabled]="toggling()"
                (change)="onToggleShift()"
                aria-label="Toggle shift status">
              </mat-slide-toggle>
            </div>
          </div>

          <!-- Appearance -->
          <div class="sb-card mt-4">
            <div class="flex items-center gap-3 p-4">
              <mat-icon class="sb-brand-text">{{ theme.isDark() ? 'dark_mode' : 'light_mode' }}</mat-icon>
              <div class="flex-1">
                <p class="text-xs sb-text-subtle m-0 uppercase tracking-wide font-semibold">Appearance</p>
                <p class="m-0 font-semibold sb-text-muted">{{ theme.isDark() ? 'Dark mode' : 'Light mode' }}</p>
              </div>
              <mat-slide-toggle
                color="primary"
                [checked]="theme.isDark()"
                (change)="theme.setDark($event.checked)"
                aria-label="Toggle dark mode">
              </mat-slide-toggle>
            </div>
          </div>
        } @else {
          <div class="sb-empty mt-6">
            <mat-icon class="text-3xl sb-text-subtle mb-2">person_off</mat-icon>
            <p class="font-medium sb-text-muted">Couldn't load your profile.</p>
            <button mat-stroked-button class="mt-3" (click)="load()">Retry</button>
          </div>
        }
      </div>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  theme = inject(ThemeService);

  worker = signal<Worker | null>(null);
  loading = signal<boolean>(true);
  toggling = signal<boolean>(false);

  roleKey = computed(() => this.worker()?.role || (this.auth.isQA() ? 'QA' : this.auth.isDemoUser() ? 'DemoViewer' : 'Worker'));
  roleLabel = computed(() => {
    switch (this.roleKey()) {
      case 'QA': return 'QA Inspector';
      case 'DemoViewer': return 'Demo Viewer';
      case 'Worker': return 'Floor Worker';
      default: return this.roleKey();
    }
  });
  initials = computed(() => {
    const name = this.worker()?.name?.trim() || '';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.getCurrentWorker().subscribe({
      next: (w) => {
        this.worker.set(w);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load profile', err);
        this.worker.set(null);
        this.loading.set(false);
      }
    });
  }

  onToggleShift() {
    const w = this.worker();
    if (!w) return;

    // Optimistic flip; revert if the request fails.
    const previous = w.isOnShift;
    this.worker.set({ ...w, isOnShift: !previous });
    this.toggling.set(true);

    this.api.toggleWorkerShift(w.id).subscribe({
      next: (updated) => {
        this.worker.set(updated);
        this.toggling.set(false);
        this.snackBar.open(updated.isOnShift ? 'You are now on shift.' : 'You are now off shift.', 'Close', { duration: 2500 });
      },
      error: () => {
        this.worker.set({ ...w, isOnShift: previous });
        this.toggling.set(false);
        this.snackBar.open('Failed to update shift status.', 'Close', { duration: 3000 });
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
