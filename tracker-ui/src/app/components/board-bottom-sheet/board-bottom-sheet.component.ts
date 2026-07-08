import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetModule
} from '@angular/material/bottom-sheet';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../services/api.service';
import { Board } from '../../models/board.model';

@Component({
  selector: 'app-board-bottom-sheet',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatBottomSheetModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="px-4 pt-3 pb-6 sb-surface">
      <!-- Handle bar -->
      <div class="flex justify-center mb-4">
        <div class="w-10 h-1 rounded-full" style="background: var(--sb-border-strong);"></div>
      </div>

      <!-- Title -->
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-xl font-bold sb-text-strong m-0">
          {{ isEditMode ? 'Edit Board' : 'Add New Board' }}
        </h2>
        <button mat-icon-button (click)="dismiss()" aria-label="Close" class="sb-text-muted">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-3">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Board Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Wrench Set A" id="board-name-input" />
          @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
            <mat-error>Board name is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Location</mat-label>
          <input matInput formControlName="location" placeholder="e.g. Workshop Floor 2 – Bay 3" id="board-location-input" />
          @if (form.get('location')?.hasError('required') && form.get('location')?.touched) {
            <mat-error>Location is required</mat-error>
          }
        </mat-form-field>

        @if (error()) {
          <p class="text-red-600 text-sm -mt-1">{{ error() }}</p>
        }

        <!-- Actions: primary dominates, cancel recedes -->
        <div class="flex flex-col items-stretch gap-1 mt-3">
          <button
            mat-flat-button
            type="submit"
            [disabled]="form.invalid || submitting()"
            class="w-full !h-12 !rounded-full !bg-blue-600 !text-white font-semibold disabled:!bg-slate-300 disabled:!text-slate-500"
            id="board-sheet-submit-btn"
          >
            @if (submitting()) {
              <mat-spinner diameter="20" class="inline-block mr-2"></mat-spinner>
            }
            {{ submitting() ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Add Board') }}
          </button>

          @if (form.invalid && !submitting()) {
            <p class="text-xs sb-text-subtle text-center mt-1">Enter a board name and location to continue.</p>
          }

          <button mat-button type="button" (click)="dismiss()" class="w-full sb-text-muted mt-1">
            Cancel
          </button>
        </div>
      </form>
    </div>
  `
})
export class BoardBottomSheetComponent implements OnInit {
  private sheetRef = inject(MatBottomSheetRef<BoardBottomSheetComponent>);
  private data: Board | null = inject(MAT_BOTTOM_SHEET_DATA, { optional: true });
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  submitting = signal(false);
  error = signal<string | null>(null);

  get isEditMode(): boolean {
    return !!this.data;
  }

  form = this.fb.group({
    name: ['', Validators.required],
    location: ['', Validators.required]
  });

  ngOnInit() {
    if (this.data) {
      this.form.patchValue({ name: this.data.name, location: this.data.location });
    }
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);

    const { name, location } = this.form.value;

    if (this.isEditMode && this.data) {
      const payload = { id: this.data.id, name: name!, location: location! };
      this.api.updateBoard(this.data.id, payload).subscribe({
        next: () => {
          this.submitting.set(false);
          // Return the updated board object (PUT returns 204, so we construct it from known data)
          this.sheetRef.dismiss({ ...this.data!, name: name!, location: location! } as Board);
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set('Failed to update board. Please try again.');
          console.error(err);
        }
      });
    } else {
      this.api.createBoard({ name: name!, location: location! }).subscribe({
        next: (newBoard) => {
          this.submitting.set(false);
          this.sheetRef.dismiss(newBoard);
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set('Failed to create board. Please try again.');
          console.error(err);
        }
      });
    }
  }

  dismiss() {
    this.sheetRef.dismiss(undefined);
  }
}
