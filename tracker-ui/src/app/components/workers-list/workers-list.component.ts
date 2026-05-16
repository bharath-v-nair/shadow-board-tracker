import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../../services/api.service';
import { Worker } from '../../models/worker.model';

@Component({
  selector: 'app-workers-list',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSlideToggleModule],
  template: `
    <div class="pb-20">
      <header class="bg-white border-b px-4 py-4 flex items-center shadow-sm sticky top-0 z-10">
        <button mat-icon-button (click)="goBack()" class="mr-2 text-gray-500 focus:outline-none">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div>
          <h1 class="text-xl font-bold text-gray-800 m-0">Shift Roster</h1>
          <p class="text-gray-500 text-xs m-0 mt-1">Manage active floor workers</p>
        </div>
      </header>

      @if (loading()) {
        <div class="flex justify-center mt-20">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <div class="p-4">
          @for (worker of workers(); track worker.id) {
            <div class="bg-white p-4 mb-3 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center transition-all hover:shadow-md">
              <div>
                <h3 class="font-bold text-gray-800 m-0 text-base">{{ worker.name }}</h3>
                <p class="text-xs mt-1 font-medium" [ngClass]="worker.isOnShift ? 'text-green-600' : 'text-gray-400'">
                  {{ worker.isOnShift ? 'Active Shift' : 'Off Shift' }}
                </p>
              </div>
              <mat-slide-toggle 
                color="primary"
                [checked]="worker.isOnShift" 
                (change)="onToggleShift(worker)">
              </mat-slide-toggle>
            </div>
          }
          @if (workers().length === 0) {
            <div class="text-center py-10 text-gray-400">
              <mat-icon class="text-4xl opacity-50 mb-2">group_off</mat-icon>
              <p>No workers found.</p>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class WorkersListComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  workers = signal<Worker[]>([]);
  loading = signal<boolean>(true);

  ngOnInit() {
    this.api.getWorkers('Worker').subscribe({
      next: (data) => {
        // Sort workers: Active Shift first, then alphabetically
        const sorted = data.sort((a, b) => {
          if (a.isOnShift === b.isOnShift) return a.name.localeCompare(b.name);
          return a.isOnShift ? -1 : 1;
        });
        this.workers.set(sorted);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch workers', err);
        this.loading.set(false);
      }
    });
  }

  onToggleShift(worker: Worker) {
    // Optimistic UI Update: Flip local state
    worker.isOnShift = !worker.isOnShift;
    this.workers.set([...this.workers()]);

    this.api.toggleWorkerShift(worker.id).subscribe({
      error: (err) => {
        console.error('Failed to toggle shift', err);
        // Revert on error
        worker.isOnShift = !worker.isOnShift;
        this.workers.set([...this.workers()]);
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
