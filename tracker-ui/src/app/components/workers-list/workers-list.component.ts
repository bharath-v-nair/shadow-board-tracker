import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { Worker } from '../../models/worker.model';
import { AddWorkerDialogComponent } from './add-worker-dialog.component';
import { AuthService } from '../../services/auth.service';
import { DemoRestrictedDialogComponent } from '../demo-restricted-dialog/demo-restricted-dialog.component';

@Component({
  selector: 'app-workers-list',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSlideToggleModule, MatDialogModule, MatSnackBarModule, MatMenuModule],
  template: `
    <div class="pb-20 sb-page min-h-screen">
      <header class="sb-header border-b sb-border px-4 py-4 flex items-center shadow-sm sticky top-0 z-10">
        <button mat-icon-button (click)="goBack()" class="mr-2 sb-text-muted focus:outline-none">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div>
          <h1 class="text-xl font-bold sb-text-strong m-0">Shift Roster</h1>
          <p class="sb-text-subtle text-xs m-0 mt-1">Manage active floor workers</p>
        </div>
        <div class="flex-1"></div>

        <button mat-flat-button color="primary" class="!rounded-full" (click)="openAddWorkerDialog()">
          <mat-icon>add</mat-icon>
          Add
        </button>
      </header>

      @if (loading()) {
        <div class="flex justify-center mt-20">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <div class="p-4">
          @for (worker of workers(); track worker.id) {
            <div class="sb-card sb-card-hover p-4 mb-3 flex justify-between items-center">
              <div>
                <h3 class="font-bold sb-text-strong m-0 text-base">{{ worker.name }}</h3>
                <p class="text-xs mt-1 font-medium" [ngClass]="worker.isOnShift ? 'text-emerald-600' : 'sb-text-subtle'">
                  {{ worker.isOnShift ? 'Active Shift' : 'Off Shift' }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <mat-slide-toggle
                  color="primary"
                  [checked]="worker.isOnShift"
                  (change)="onToggleShift(worker)">
                </mat-slide-toggle>
                <button mat-icon-button [matMenuTriggerFor]="menu">
                  <mat-icon class="sb-text-subtle">more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="editWorker(worker)">
                    <mat-icon>edit</mat-icon>
                    <span>Edit</span>
                  </button>
                  <button mat-menu-item (click)="deleteWorker(worker)">
                    <mat-icon color="warn">delete</mat-icon>
                    <span class="text-red-500">Delete</span>
                  </button>
                </mat-menu>
              </div>
            </div>
          }
          @if (workers().length === 0) {
            <div class="sb-empty">
              <mat-icon class="text-4xl sb-text-subtle mb-2">group_off</mat-icon>
              <p class="sb-text-muted">No workers found.</p>
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
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  public auth = inject(AuthService);

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

  openAddWorkerDialog() {
    const dialogRef = this.dialog.open(AddWorkerDialogComponent, {
      width: '400px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Optimistically add to UI, or wait for API. We will wait for API to ensure ID is correct.
        this.snackBar.open('Adding worker...', '', { duration: 2000 });
        this.api.createWorker({ ...result, isAvailable: true }).subscribe({
          next: (newWorker) => {
            this.workers.set([...this.workers(), newWorker]);
            this.snackBar.open('Worker added successfully!', 'Close', { duration: 3000 });
          },
          error: (err) => {
            console.error('Failed to add worker', err);
            this.snackBar.open('Failed to add worker.', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  editWorker(worker: Worker) {
    const dialogRef = this.dialog.open(AddWorkerDialogComponent, {
      width: '400px',
      disableClose: true,
      data: { worker }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Updating worker...', '', { duration: 2000 });
        const updatePayload = {
          id: worker.id,
          name: result.name,
          email: result.email,
          isAvailable: worker.isAvailable
        };
        this.api.updateWorker(worker.id, updatePayload).subscribe({
          next: () => {
            // Update local state
            const updatedWorkers = this.workers().map(w => 
              w.id === worker.id ? { ...w, ...result } : w
            );
            this.workers.set(updatedWorkers);
            this.snackBar.open('Worker updated successfully!', 'Close', { duration: 3000 });
          },
          error: (err) => {
            console.error('Failed to update worker', err);
            this.snackBar.open('Failed to update worker.', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  deleteWorker(worker: Worker) {
    if (this.auth.isDemoUser()) {
      this.dialog.open(DemoRestrictedDialogComponent, {
        data: {
          title: 'Action Restricted',
          message: `Since you are logged in as a Demo User, deletion of worker accounts is not allowed to preserve the environment for other guests.`
        },
        panelClass: 'rounded-2xl'
      });
      return;
    }

    if (confirm(`Are you sure you want to delete ${worker.name}?`)) {
      this.snackBar.open('Deleting worker...', '', { duration: 2000 });
      this.api.deleteWorker(worker.id).subscribe({
        next: () => {
          // Remove from local state
          const updatedWorkers = this.workers().filter(w => w.id !== worker.id);
          this.workers.set(updatedWorkers);
          this.snackBar.open('Worker deleted.', 'Close', { duration: 3000 });
        },
        error: (err) => {
          console.error('Failed to delete worker', err);
          this.snackBar.open('Failed to delete worker.', 'Close', { duration: 3000 });
        }
      });
    }
  }
}
