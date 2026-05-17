import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { ApiService } from '../../services/api.service';
import { Incident } from '../../models/incident.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTabsModule],
  template: `
    <div class="max-w-md mx-auto min-h-screen bg-slate-50 pb-20 font-sans text-slate-800">
      <header class="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-6 shadow-sm sticky top-0 z-20 transition-all">
        <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 m-0">Command Center</h1>
        <p class="text-slate-500 text-sm m-0 mt-1 font-medium">Global QA Dashboard</p>
      </header>

      @if (loading()) {
        <div class="flex justify-center items-center mt-32">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <div class="px-5 mt-2">
          <div class="flex overflow-x-auto border-b border-slate-200 scrollbar-hide">
            <button (click)="selectedTab.set(0)"
                    class="flex-1 whitespace-nowrap py-3.5 px-4 font-bold text-[13px] uppercase tracking-wide border-b-[3px] transition-colors duration-200 outline-none"
                    [ngClass]="selectedTab() === 0 ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'">
              Pending ({{ pendingIncidents().length }})
            </button>
            <button (click)="selectedTab.set(1)"
                    class="flex-1 whitespace-nowrap py-3.5 px-4 font-bold text-[13px] uppercase tracking-wide border-b-[3px] transition-colors duration-200 outline-none"
                    [ngClass]="selectedTab() === 1 ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'">
              Alerts ({{ openIncidents().length }})
            </button>
            <button (click)="selectedTab.set(2)"
                    class="flex-1 whitespace-nowrap py-3.5 px-4 font-bold text-[13px] uppercase tracking-wide border-b-[3px] transition-colors duration-200 outline-none"
                    [ngClass]="selectedTab() === 2 ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'">
              History ({{ resolvedIncidents().length }})
            </button>
          </div>
        </div>

        <div class="mt-1">
          @if (selectedTab() === 0) {
            <!-- Pending QA Content -->
            <div class="p-4 space-y-4">
              @for (incident of pendingIncidents(); track incident.id) {
                <div class="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-5 border border-slate-100 cursor-pointer overflow-hidden transform hover:-translate-y-1" (click)="goToBoard(incident.boardId)">
                  <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-300 to-amber-500"></div>
                  
                  <div class="flex justify-between items-start mb-3 pl-2">
                    <h3 class="font-bold text-slate-900 m-0 text-lg group-hover:text-amber-600 transition-colors">{{ incident.toolName || 'Unknown Tool' }}</h3>
                    <span class="bg-amber-50 text-amber-700 text-[11px] px-3 py-1 rounded-full font-bold border border-amber-200/50 shadow-sm uppercase tracking-wide">Pending Review</span>
                  </div>
                  
                  <div class="pl-2 space-y-2">
                    <p class="text-sm text-slate-600 flex items-center gap-1">
                      <mat-icon class="text-slate-400 text-[18px] w-[18px] h-[18px]">place</mat-icon> 
                      <span class="font-medium">{{ incident.boardName || 'Unknown Board' }}</span>
                    </p>
                    
                    <div class="flex flex-col gap-1.5 mt-4 pt-3 border-t border-slate-50">
                      <p class="text-xs text-slate-500 flex justify-between items-center">
                        <span>Reported by</span> <strong class="text-slate-700">{{ incident.reporterName || 'Unknown' }}</strong>
                      </p>
                      <p class="text-xs text-slate-500 flex justify-between items-center">
                        <span>Assigned to</span> <strong class="text-slate-700">{{ incident.workerName || 'Unknown' }}</strong>
                      </p>
                      <p class="text-xs text-slate-500 flex justify-between items-center">
                        <span>Reported at</span> <strong class="text-slate-700">{{ incident.reportedAt | date:'MMM d, h:mm a' }}</strong>
                      </p>
                    </div>

                    <div class="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border" [ngClass]="isOverTwoHours(incident.reportedAt) ? 'bg-red-50/50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-600'">
                      <mat-icon class="text-[16px] w-[16px] h-[16px]">schedule</mat-icon>
                      <span class="text-xs font-semibold tracking-wide">Elapsed: {{ getTimeElapsed(incident.reportedAt) }}</span>
                    </div>
                  </div>
                </div>
              }
              @if (pendingIncidents().length === 0) {
                <div class="flex flex-col items-center justify-center py-16 px-4 text-slate-400 bg-white/50 rounded-2xl border border-dashed border-slate-300 mt-2">
                  <div class="bg-slate-100 p-4 rounded-full mb-4 shadow-sm">
                    <mat-icon class="text-3xl text-slate-400 block">check_circle</mat-icon>
                  </div>
                  <p class="font-medium text-slate-600">No tasks pending QA review.</p>
                  <p class="text-xs mt-1">You're all caught up!</p>
                </div>
              }
            </div>
          } @else if (selectedTab() === 1) {
            <!-- Active Alerts Content -->
            <div class="p-4 space-y-4">
              @for (incident of openIncidents(); track incident.id) {
                <div class="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-5 border border-slate-100 cursor-pointer overflow-hidden transform hover:-translate-y-1" (click)="goToBoard(incident.boardId)">
                  <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-rose-400 to-rose-600"></div>
                  
                  <div class="flex justify-between items-start mb-3 pl-2">
                    <h3 class="font-bold text-slate-900 m-0 text-lg group-hover:text-rose-600 transition-colors">{{ incident.toolName || 'Unknown Tool' }}</h3>
                    <span class="bg-rose-50 text-rose-700 text-[11px] px-3 py-1 rounded-full font-bold border border-rose-200/50 shadow-sm uppercase tracking-wide animate-pulse">Missing</span>
                  </div>
                  
                  <div class="pl-2 space-y-2">
                    <p class="text-sm text-slate-600 flex items-center gap-1">
                      <mat-icon class="text-slate-400 text-[18px] w-[18px] h-[18px]">place</mat-icon> 
                      <span class="font-medium">{{ incident.boardName || 'Unknown Board' }}</span>
                    </p>
                    
                    <div class="flex flex-col gap-1.5 mt-4 pt-3 border-t border-slate-50">
                      <p class="text-xs text-slate-500 flex justify-between items-center">
                        <span>Reported by</span> <strong class="text-slate-700">{{ incident.reporterName || 'Unknown' }}</strong>
                      </p>
                      <p class="text-xs text-slate-500 flex justify-between items-center">
                        <span>Assigned to</span> <strong class="text-slate-700">{{ incident.workerName || 'Unknown' }}</strong>
                      </p>
                      <p class="text-xs text-slate-500 flex justify-between items-center">
                        <span>Reported at</span> <strong class="text-slate-700">{{ incident.reportedAt | date:'MMM d, h:mm a' }}</strong>
                      </p>
                    </div>

                    <div class="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border" [ngClass]="isOverTwoHours(incident.reportedAt) ? 'bg-red-50/50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-600'">
                      <mat-icon class="text-[16px] w-[16px] h-[16px]">schedule</mat-icon>
                      <span class="text-xs font-semibold tracking-wide">Elapsed: {{ getTimeElapsed(incident.reportedAt) }}</span>
                    </div>
                  </div>
                </div>
              }
              @if (openIncidents().length === 0) {
                <div class="flex flex-col items-center justify-center py-16 px-4 text-slate-400 bg-white/50 rounded-2xl border border-dashed border-slate-300 mt-2">
                  <div class="bg-emerald-50 p-4 rounded-full mb-4 shadow-sm">
                    <mat-icon class="text-3xl text-emerald-500 block">task_alt</mat-icon>
                  </div>
                  <p class="font-medium text-slate-600">All clear! No missing tools.</p>
                  <p class="text-xs mt-1">The factory floor is fully operational.</p>
                </div>
              }
            </div>
          } @else if (selectedTab() === 2) {
            <!-- History Content -->
            <div class="p-4 space-y-4">
              @for (incident of resolvedIncidents(); track incident.id) {
                <div class="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-5 border border-slate-100 cursor-pointer overflow-hidden transform hover:-translate-y-1" (click)="goToBoard(incident.boardId)">
                  <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-emerald-400 to-emerald-600"></div>
                  
                  <div class="flex justify-between items-start mb-3 pl-2">
                    <h3 class="font-bold text-slate-900 m-0 text-lg group-hover:text-emerald-600 transition-colors">{{ incident.toolName || 'Unknown Tool' }}</h3>
                    <span class="bg-emerald-50 text-emerald-700 text-[11px] px-3 py-1 rounded-full font-bold border border-emerald-200/50 shadow-sm uppercase tracking-wide">Resolved</span>
                  </div>
                  
                  <div class="pl-2 space-y-2">
                    <p class="text-sm text-slate-600 flex items-center gap-1">
                      <mat-icon class="text-slate-400 text-[18px] w-[18px] h-[18px]">place</mat-icon> 
                      <span class="font-medium">{{ incident.boardName || 'Unknown Board' }}</span>
                    </p>
                    
                    <div class="flex flex-col gap-1.5 mt-4 pt-3 border-t border-slate-50">
                      <p class="text-xs text-slate-500 flex justify-between items-center">
                        <span>Reported by</span> <strong class="text-slate-700">{{ incident.reporterName || 'Unknown' }}</strong>
                      </p>
                      <p class="text-xs text-slate-500 flex justify-between items-center">
                        <span>Resolved by</span> <strong class="text-slate-700">{{ incident.workerName || 'Unknown' }}</strong>
                      </p>
                      <p class="text-xs text-slate-500 flex justify-between items-center">
                        <span>Resolved at</span> <strong class="text-slate-700">{{ incident.resolvedAt | date:'mediumDate' }}</strong>
                      </p>
                    </div>

                    <div class="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-slate-50 border-slate-100 text-slate-600">
                      <mat-icon class="text-[16px] w-[16px] h-[16px]">check_circle_outline</mat-icon>
                      <span class="text-xs font-semibold tracking-wide">{{ getResolutionTime(incident.reportedAt, incident.resolvedAt) }}</span>
                    </div>
                  </div>
                </div>
              }
              @if (resolvedIncidents().length === 0) {
                <div class="flex flex-col items-center justify-center py-16 px-4 text-slate-400 bg-white/50 rounded-2xl border border-dashed border-slate-300 mt-2">
                  <div class="bg-slate-100 p-4 rounded-full mb-4 shadow-sm">
                    <mat-icon class="text-3xl text-slate-400 block">history</mat-icon>
                  </div>
                  <p class="font-medium text-slate-600">No resolved history.</p>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  globalIncidents = signal<Incident[]>([]);
  loading = signal<boolean>(true);
  selectedTab = signal<number>(0);

  pendingIncidents = computed(() => this.globalIncidents().filter(i => i.status === 'PendingReview' || i.status === 1 as any));
  openIncidents = computed(() => this.globalIncidents().filter(i => i.status === 'Open' || i.status === 0 as any));
  resolvedIncidents = computed(() => this.globalIncidents().filter(i => i.status === 'Resolved' || i.status === 2 as any));

  ngOnInit() {
    this.api.getAllGlobalIncidents().subscribe({
      next: (data) => {
        this.globalIncidents.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch global incidents', err);
        this.loading.set(false);
      }
    });
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
}
