import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-add-worker-dialog',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MatDialogModule, 
    MatButtonModule, 
    MatFormFieldModule, 
    MatInputModule
  ],
  template: `
    <h2 mat-dialog-title class="font-bold sb-text-strong">{{ isEditMode ? 'Edit Worker' : 'Add New Worker' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="workerForm" class="flex flex-col gap-4 mt-2">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Full Name</mat-label>
          <input matInput formControlName="name" placeholder="John Doe">
          <mat-error *ngIf="workerForm.get('name')?.hasError('required')">Name is required</mat-error>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Email Address</mat-label>
          <input matInput type="email" formControlName="email" placeholder="john.doe@example.com">
          <mat-error *ngIf="workerForm.get('email')?.hasError('required')">Email is required</mat-error>
          <mat-error *ngIf="workerForm.get('email')?.hasError('email')">Please enter a valid email</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="workerForm.invalid" (click)="onSubmit()">{{ isEditMode ? 'Update Worker' : 'Add Worker' }}</button>
    </mat-dialog-actions>
  `
})
export class AddWorkerDialogComponent {
  workerForm: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddWorkerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEditMode = !!(data && data.worker);
    
    this.workerForm = this.fb.group({
      name: [this.isEditMode ? data.worker.name : '', Validators.required],
      email: [this.isEditMode ? data.worker.email : '', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    if (this.workerForm.valid) {
      this.dialogRef.close(this.workerForm.value);
    }
  }
}
