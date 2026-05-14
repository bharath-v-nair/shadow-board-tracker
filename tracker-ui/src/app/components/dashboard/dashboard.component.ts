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
    <div class="max-w-md mx-auto min-h-screen bg-gray-50 pb-20">
      <header class="bg-white border-b px-4 py-6 shadow-sm sticky top-0 z-10">
        <h1 class="text-2xl font-bold text-gray-800 m-0">Command Center</h1>
        <p class="text-gray-500 text-sm m-0 mt-1">Global QA Dashboard</p>
      </header>

      @if (loading()) {
        <div class="flex justify-center mt-20">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <mat-tab-group class="mt-2" backgroundColor="primary" animationDuration="0ms">
          <!-- Pending QA Tab -->
          <mat-tab label="Pending QA ({{ pendingIncidents().length }})">
            <div class="p-4">
              @for (incident of pendingIncidents(); track incident.id) {
                <div class="bg-white rounded-lg shadow-sm p-4 mb-3 border-l-4 border-yellow-400 cursor-pointer hover:shadow-md transition-shadow" (click)="goToBoard(incident.boardId)">
                  <div class="flex justify-between items-start mb-2">
                    <h3 class="font-bold text-gray-800 m-0 text-lg">{{ incident.toolName || 'Unknown Tool' }}</h3>
                    <span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-medium">Pending Review</span>
                  </div>
                  <p class="text-sm text-gray-600 mb-1"><mat-icon class="inline-icon text-gray-400 align-middle mr-1 text-sm" style="width:16px;height:16px">place</mat-icon> {{ incident.boardName || 'Unknown Board' }}</p>
                  <p class="text-xs text-gray-500">Reported by: <strong>{{ incident.reporterName || 'Unknown' }}</strong></p>
                  <p class="text-xs text-gray-500">Assigned to: <strong>{{ incident.workerName || 'Unknown' }}</strong></p>
                  <p class="text-xs mb-1 font-medium mt-1" [ngClass]="isOverTwoHours(incident.reportedAt) ? 'text-red-500' : 'text-gray-500'">⏱️ Elapsed: {{ getTimeElapsed(incident.reportedAt) }}</p>
                </div>
              }
              @if (pendingIncidents().length === 0) {
                <div class="text-center py-10 text-gray-400">
                  <mat-icon class="text-4xl opacity-50 mb-2">check_circle</mat-icon>
                  <p>No tasks pending QA review.</p>
                </div>
              }
            </div>
          </mat-tab>

          <!-- Active Alerts Tab -->
          <mat-tab label="Active Alerts ({{ openIncidents().length }})">
            <div class="p-4">
              @for (incident of openIncidents(); track incident.id) {
                <div class="bg-white rounded-lg shadow-sm p-4 mb-3 border-l-4 border-red-500 cursor-pointer hover:shadow-md transition-shadow" (click)="goToBoard(incident.boardId)">
                  <div class="flex justify-between items-start mb-2">
                    <h3 class="font-bold text-gray-800 m-0 text-lg">{{ incident.toolName || 'Unknown Tool' }}</h3>
                    <span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-medium">Missing</span>
                  </div>
                  <p class="text-sm text-gray-600 mb-1"><mat-icon class="inline-icon text-gray-400 align-middle mr-1 text-sm" style="width:16px;height:16px">place</mat-icon> {{ incident.boardName || 'Unknown Board' }}</p>
                  <p class="text-xs text-gray-500">Reported by: <strong>{{ incident.reporterName || 'Unknown' }}</strong></p>
                  <p class="text-xs text-gray-500">Assigned to: <strong>{{ incident.workerName || 'Unknown' }}</strong></p>
                  <p class="text-xs mb-1 font-medium mt-1" [ngClass]="isOverTwoHours(incident.reportedAt) ? 'text-red-500' : 'text-gray-500'">⏱️ Elapsed: {{ getTimeElapsed(incident.reportedAt) }}</p>
                </div>
              }
              @if (openIncidents().length === 0) {
                <div class="text-center py-10 text-gray-400">
                  <mat-icon class="text-4xl opacity-50 mb-2">check_circle</mat-icon>
                  <p>All clear! No missing tools.</p>
                </div>
              }
            </div>
          </mat-tab>

          <!-- History Tab -->
          <mat-tab label="History ({{ resolvedIncidents().length }})">
            <div class="p-4">
              @for (incident of resolvedIncidents(); track incident.id) {
                <div class="bg-white rounded-lg shadow-sm p-4 mb-3 border-l-4 border-green-500 cursor-pointer hover:shadow-md transition-shadow" (click)="goToBoard(incident.boardId)">
                  <div class="flex justify-between items-start mb-2">
                    <h3 class="font-bold text-gray-800 m-0 text-lg">{{ incident.toolName || 'Unknown Tool' }}</h3>
                    <span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-medium">Resolved</span>
                  </div>
                  <p class="text-sm text-gray-600 mb-1"><mat-icon class="inline-icon text-gray-400 align-middle mr-1 text-sm" style="width:16px;height:16px">place</mat-icon> {{ incident.boardName || 'Unknown Board' }}</p>
                  <p class="text-xs text-gray-500">Reported by: <strong>{{ incident.reporterName || 'Unknown' }}</strong></p>
                  <p class="text-xs text-gray-500">Resolved by: <strong>{{ incident.workerName || 'Unknown' }}</strong></p>
                  <p class="text-xs text-gray-500 mt-1 mb-1 font-medium">⏱️ Resolution Time: {{ getResolutionTime(incident.reportedAt, incident.resolvedAt) }}</p>
                  <p class="text-xs text-gray-500">Resolved at: <strong>{{ incident.resolvedAt | date:'shortDate' }}</strong></p>
                </div>
              }
              @if (resolvedIncidents().length === 0) {
                <div class="text-center py-10 text-gray-400">
                  <mat-icon class="text-4xl opacity-50 mb-2">history</mat-icon>
                  <p>No resolved history.</p>
                </div>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  globalIncidents = signal<Incident[]>([]);
  loading = signal<boolean>(true);

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
