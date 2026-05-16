import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../services/api.service';
import { Worker } from '../../models/worker.model';
import { Tool } from '../../models/tool.model';

@Component({
  selector: 'app-report-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title class="text-xl font-bold border-b pb-2">Report Missing Tool</h2>
    <mat-dialog-content class="py-6 min-w-[300px]">
      <p class="mb-4 text-gray-600">Tool: <strong class="text-gray-900">{{ data.tool.name }}</strong></p>
      
      @if (loading()) {
        <div class="flex justify-center py-4">
          <mat-spinner diameter="30"></mat-spinner>
        </div>
      } @else {
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Assign to Worker</mat-label>
          <mat-select [(ngModel)]="selectedWorkerId">
            @for (worker of workers(); track worker.id) {
              <mat-option [value]="worker.id">{{ worker.name }} ({{ worker.email }})</mat-option>
            }
          </mat-select>
        </mat-form-field>
        
        @if (workers().length === 0) {
          <p class="text-red-500 text-sm mt-2">No available workers found.</p>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="pb-4 pr-4">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="warn" 
              [disabled]="!selectedWorkerId || loading() || submitting()" 
              (click)="reportMissing()">
        {{ submitting() ? 'Reporting...' : 'Report Missing' }}
      </button>
    </mat-dialog-actions>
  `
})
export class ReportDialogComponent implements OnInit {
  data = inject(MAT_DIALOG_DATA) as { tool: Tool };
  dialogRef = inject(MatDialogRef<ReportDialogComponent>);
  private api = inject(ApiService);

  workers = signal<Worker[]>([]);
  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  selectedWorkerId: string = '';

  // ngOnInit() {
  //   this.api.getWorkers().subscribe({
  //     next: (allWorkers) => {
  //       const availableWorkers = allWorkers.filter(w => w.isAvailable);
  //       this.workers.set(availableWorkers);
  //       this.loading.set(false);
  //     },
  //     error: (err) => {
  //       console.error('Failed to fetch workers', err);
  //       this.loading.set(false);
  //     }
  //   });
  // }

  ngOnInit() {
    this.api.getWorkers('Worker', true).subscribe({
      next: (data) => {
        this.workers.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch workers', err);
        this.loading.set(false);
      }
    });
  }

  reportMissing() {
    if (!this.selectedWorkerId) return;

    this.submitting.set(true);

    const payload = {
      toolId: this.data.tool.id,
      workerId: this.selectedWorkerId,
      status: 'Open'
    };

    this.api.createIncident(payload).subscribe({
      next: (incident) => {
        this.submitting.set(false);
        this.dialogRef.close(incident);
      },
      error: (err) => {
        console.error('Failed to report incident', err);
        this.submitting.set(false);
      }
    });
  }
}
