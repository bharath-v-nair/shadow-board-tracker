import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../services/api.service';
import { Worker } from '../../models/worker.model';
import { Tool } from '../../models/tool.model';

/**
 * Report a tool missing. A bottom sheet (not a centered dialog) to stay consistent with
 * the Add/Edit Tool and Board flows. Dismisses with the created incident, or undefined.
 */
@Component({
  selector: 'app-report-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatBottomSheetModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="px-4 pt-3 pb-6 sb-surface">
      <!-- Handle bar -->
      <div class="flex justify-center mb-4">
        <div class="w-10 h-1 rounded-full" style="background: var(--sb-border-strong);"></div>
      </div>

      <div class="flex items-start justify-between mb-1">
        <h2 class="text-xl font-bold sb-text-strong m-0">Report Missing Tool</h2>
        <button mat-icon-button (click)="dismiss()" aria-label="Close" class="sb-text-muted -mt-2 -mr-2">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <p class="sb-text-muted text-sm mb-5">
        Assign <strong class="sb-text-strong">{{ data.tool.name }}</strong> to an on-shift worker to recover it.
      </p>

      @if (loading()) {
        <div class="flex justify-center py-6"><mat-spinner diameter="30"></mat-spinner></div>
      } @else if (workers().length === 0) {
        <div class="sb-empty my-2">
          <mat-icon class="text-3xl sb-text-subtle mb-2">person_off</mat-icon>
          <p class="sb-text-muted font-medium">No on-shift workers</p>
          <p class="text-xs sb-text-subtle mt-1">Put a worker on shift to assign this tool.</p>
        </div>
      } @else {
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Assign to worker</mat-label>
          <mat-select [(ngModel)]="selectedWorkerId">
            @for (worker of workers(); track worker.id) {
              <mat-option [value]="worker.id">{{ worker.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }

      <!-- Actions: alert-red primary dominates, cancel recedes -->
      <div class="flex flex-col items-stretch gap-1 mt-3">
        <button
          mat-flat-button
          [disabled]="!selectedWorkerId || loading() || submitting()"
          (click)="reportMissing()"
          class="w-full !h-12 !rounded-full !bg-rose-600 !text-white font-semibold disabled:!bg-slate-300 disabled:!text-slate-500"
        >
          @if (submitting()) {
            <mat-spinner diameter="20" class="inline-block mr-2"></mat-spinner>
          }
          {{ submitting() ? 'Reporting…' : 'Report Missing' }}
        </button>
        <button mat-button type="button" (click)="dismiss()" class="w-full sb-text-muted mt-1">Cancel</button>
      </div>
    </div>
  `
})
export class ReportDialogComponent implements OnInit {
  data = inject(MAT_BOTTOM_SHEET_DATA) as { tool: Tool };
  private sheetRef = inject(MatBottomSheetRef<ReportDialogComponent>);
  private api = inject(ApiService);

  workers = signal<Worker[]>([]);
  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  selectedWorkerId = '';

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
        this.sheetRef.dismiss(incident);
      },
      error: (err) => {
        console.error('Failed to report incident', err);
        this.submitting.set(false);
      }
    });
  }

  dismiss() {
    this.sheetRef.dismiss(undefined);
  }
}
