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

        <!-- Optional evidence photo. Camera-first on mobile via the capture attribute. -->
        <div class="mb-2">
          @if (photoPreview()) {
            <div class="relative inline-block">
              <img [src]="photoPreview()" alt="Selected evidence"
                   class="w-20 h-20 rounded-lg object-cover border sb-border" />
              <button type="button" (click)="clearPhoto()" aria-label="Remove photo"
                      class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow">
                <mat-icon class="text-[16px] w-[16px] h-[16px]">close</mat-icon>
              </button>
            </div>
          } @else {
            <button type="button" (click)="photoInput.click()"
                    class="flex items-center gap-2 text-sm sb-text-muted border sb-border rounded-lg px-3 py-2 w-full justify-center">
              <mat-icon class="text-[20px] w-[20px] h-[20px]">add_a_photo</mat-icon>
              Attach a photo (optional)
            </button>
          }
          <input #photoInput type="file" accept="image/png,image/jpeg,image/webp" capture="environment"
                 class="hidden" (change)="onPhotoSelected($event)" />
        </div>
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
  selectedPhoto = signal<File | null>(null);
  photoPreview = signal<string | null>(null);

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

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      // Keep it simple in the sheet: just ignore oversize; the button label stays "Attach".
      alert('Photo must be under 5MB.');
      return;
    }

    this.selectedPhoto.set(file);
    const reader = new FileReader();
    reader.onload = () => this.photoPreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  clearPhoto() {
    this.selectedPhoto.set(null);
    this.photoPreview.set(null);
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
        // The incident exists now; the photo (if any) attaches to its id in a second call.
        // A photo failure shouldn't undo a successful report, so we dismiss either way.
        const photo = this.selectedPhoto();
        if (photo) {
          this.api.uploadIncidentPhoto(incident.id, photo).subscribe({
            next: () => { this.submitting.set(false); this.sheetRef.dismiss(incident); },
            error: (err) => {
              console.error('Incident reported, but photo upload failed', err);
              this.submitting.set(false);
              this.sheetRef.dismiss(incident);
            }
          });
        } else {
          this.submitting.set(false);
          this.sheetRef.dismiss(incident);
        }
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
