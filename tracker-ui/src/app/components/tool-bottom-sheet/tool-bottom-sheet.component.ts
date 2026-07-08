import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetModule
} from '@angular/material/bottom-sheet';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { startWith, map } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { Tool, CreateToolPayload, UpdateToolPayload } from '../../models/tool.model';
import { AuthService } from '../../services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { DemoRestrictedDialogComponent } from '../demo-restricted-dialog/demo-restricted-dialog.component';

export interface ToolSheetData {
  boardId: string;
  /** Existing tool — triggers Edit mode */
  tool?: Tool;
  /** Seed the name autocomplete with names already on this board */
  knownNames?: string[];
}

export interface ToolSheetResult {
  action: 'save' | 'delete';
  tool: Tool;
}

const CONDITIONS = ['Good', 'Damaged', 'Lost'] as const;

@Component({
  selector: 'app-tool-bottom-sheet',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatBottomSheetModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  template: `
    <div class="px-4 pt-4 pb-8">
      <!-- Handle bar -->
      <div class="flex justify-center mb-4">
        <div class="w-10 h-1 rounded-full" style="background: var(--sb-border-strong);"></div>
      </div>

      <!-- Title -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold sb-text-strong m-0">
          {{ isEditMode ? 'Edit Tool' : 'Add New Tool' }}
        </h2>
        <button mat-icon-button (click)="dismiss()" aria-label="Close" class="sb-text-muted">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">

        <!-- Name — Combobox (free-text + autocomplete) -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Tool Name</mat-label>
          <input
            matInput
            formControlName="name"
            [matAutocomplete]="nameAuto"
            placeholder="e.g. 10mm Socket"
            id="tool-name-input"
          />
          <mat-icon matSuffix>handyman</mat-icon>
          <mat-autocomplete #nameAuto="matAutocomplete">
            @for (opt of filteredNames(); track opt) {
              <mat-option [value]="opt">{{ opt }}</mat-option>
            }
          </mat-autocomplete>
          @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
            <mat-error>Tool name is required</mat-error>
          }
        </mat-form-field>

        <!-- Type — Combobox (free-text + autocomplete) -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Tool Type</mat-label>
          <input
            matInput
            formControlName="type"
            [matAutocomplete]="typeAuto"
            placeholder="e.g. Socket Wrench, Power Tool…"
            id="tool-type-input"
          />
          <mat-icon matSuffix>category</mat-icon>
          <mat-autocomplete #typeAuto="matAutocomplete">
            @for (opt of filteredTypes(); track opt) {
              <mat-option [value]="opt">{{ opt }}</mat-option>
            }
          </mat-autocomplete>
          @if (form.get('type')?.hasError('required') && form.get('type')?.touched) {
            <mat-error>Tool type is required</mat-error>
          }
        </mat-form-field>

        <!-- Condition — static dropdown -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Condition</mat-label>
          <mat-select formControlName="condition" id="tool-condition-select">
            @for (c of conditions; track c) {
              <mat-option [value]="c">{{ c }}</mat-option>
            }
          </mat-select>
          @if (form.get('condition')?.hasError('required') && form.get('condition')?.touched) {
            <mat-error>Condition is required</mat-error>
          }
        </mat-form-field>

        @if (error()) {
          <p class="text-red-600 text-sm -mt-2">{{ error() }}</p>
        }

        <!-- Actions -->
        <div class="flex gap-3 mt-2">
          <button
            mat-flat-button
            type="submit"
            [disabled]="form.invalid || submitting()"
            class="flex-1 bg-blue-600 text-white font-semibold"
            id="tool-sheet-submit-btn"
          >
            @if (submitting()) {
              <mat-spinner diameter="20" class="inline-block mr-2"></mat-spinner>
            }
            {{ submitting() ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Add Tool') }}
          </button>
          <button mat-stroked-button type="button" (click)="dismiss()" class="flex-none">
            Cancel
          </button>
        </div>

        <!-- Delete — only in edit mode -->
        @if (isEditMode) {
          <mat-divider class="my-2"></mat-divider>
          <button
            mat-stroked-button
            type="button"
            color="warn"
            [disabled]="deleting()"
            (click)="onDelete()"
            class="w-full"
            id="tool-sheet-delete-btn"
          >
            @if (deleting()) {
              <mat-spinner diameter="18" class="inline-block mr-2"></mat-spinner>
            } @else {
              <mat-icon class="mr-1">delete_outline</mat-icon>
            }
            {{ deleting() ? 'Deleting...' : 'Delete Tool' }}
          </button>
        }
      </form>
    </div>
  `
})
export class ToolBottomSheetComponent implements OnInit {
  private sheetRef = inject(MatBottomSheetRef<ToolBottomSheetComponent>);
  private data: ToolSheetData = inject(MAT_BOTTOM_SHEET_DATA);
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  public auth = inject(AuthService);
  private dialog = inject(MatDialog);

  conditions = CONDITIONS;
  submitting = signal(false);
  deleting = signal(false);
  error = signal<string | null>(null);

  /** All distinct types from the API — seeded on init */
  private allTypes = signal<string[]>([]);

  get isEditMode(): boolean {
    return !!this.data.tool;
  }

  form = this.fb.group({
    name: ['', Validators.required],
    type: ['', Validators.required],
    condition: ['Good', Validators.required]
  });

  // ── Reactive autocomplete signals ────────────────────────

  private nameChanges = toSignal(
    this.form.get('name')!.valueChanges.pipe(startWith('')),
    { initialValue: '' }
  );

  private typeChanges = toSignal(
    this.form.get('type')!.valueChanges.pipe(startWith('')),
    { initialValue: '' }
  );

  filteredNames = computed(() => {
    const query = (this.nameChanges() ?? '').toLowerCase();
    const names = this.data.knownNames ?? [];
    return names.filter(n => n.toLowerCase().includes(query));
  });

  filteredTypes = computed(() => {
    const query = (this.typeChanges() ?? '').toLowerCase();
    return this.allTypes().filter(t => t.toLowerCase().includes(query));
  });

  // ─────────────────────────────────────────────────────────

  ngOnInit() {
    // Pre-fill form in Edit mode
    if (this.data.tool) {
      const { name, type, condition } = this.data.tool;
      this.form.patchValue({ name, type, condition });
    }

    // Load tool types for the autocomplete (fire and forget)
    this.api.getToolTypes().subscribe({
      next: (types) => this.allTypes.set(types),
      error: () => { /* graceful degradation — autocomplete just shows empty */ }
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);

    const { name, type, condition } = this.form.value;

    if (this.isEditMode && this.data.tool) {
      const payload: UpdateToolPayload = {
        id: this.data.tool.id,
        name: name!,
        type: type!,
        condition: condition!,
        boardId: this.data.boardId
      };
      this.api.updateTool(this.data.tool.id, payload).subscribe({
        next: () => {
          this.submitting.set(false);
          // PUT returns 204 — reconstruct the updated tool from the known data
          const updated: Tool = { ...this.data.tool!, name: name!, type: type!, condition: condition! };
          this.sheetRef.dismiss({ action: 'save', tool: updated } as ToolSheetResult);
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set('Failed to update tool. Please try again.');
          console.error(err);
        }
      });
    } else {
      const payload: CreateToolPayload = {
        name: name!,
        type: type!,
        condition: condition!,
        boardId: this.data.boardId
      };
      this.api.createTool(payload).subscribe({
        next: (newTool) => {
          this.submitting.set(false);
          this.sheetRef.dismiss({ action: 'save', tool: newTool } as ToolSheetResult);
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set('Failed to create tool. Please try again.');
          console.error(err);
        }
      });
    }
  }

  onDelete() {
    if (!this.data.tool) return;
    
    if (this.auth.isDemoUser()) {
      this.dialog.open(DemoRestrictedDialogComponent, {
        data: {
          title: 'Action Restricted',
          message: `Since you are logged in as a Demo User, deletion of tools is not allowed to preserve the environment for other guests.`
        },
        panelClass: 'rounded-2xl'
      });
      return;
    }

    this.deleting.set(true);
    this.error.set(null);

    this.api.deleteTool(this.data.tool.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.sheetRef.dismiss({ action: 'delete', tool: this.data.tool! } as ToolSheetResult);
      },
      error: (err) => {
        this.deleting.set(false);
        this.error.set('Failed to delete tool. Please try again.');
        console.error(err);
      }
    });
  }

  dismiss() {
    this.sheetRef.dismiss(undefined);
  }
}
