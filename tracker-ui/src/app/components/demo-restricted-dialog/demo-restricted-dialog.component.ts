import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-demo-restricted-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="p-6 text-center max-w-sm mx-auto">
      <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <mat-icon class="text-3xl text-amber-600">security</mat-icon>
      </div>
      <h2 class="text-xl font-bold sb-text-strong mb-2 m-0">{{ data.title || 'Action Not Allowed' }}</h2>
      <p class="sb-text-muted mb-6 text-sm leading-relaxed">
        {{ data.message || 'Demo users cannot delete boards, tools, and workers.' }}
      </p>
      <button mat-flat-button color="primary" class="w-full h-12 rounded-xl text-sm font-bold" (click)="dialogRef.close()">
        UNDERSTOOD
      </button>
    </div>
  `
})
export class DemoRestrictedDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DemoRestrictedDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title?: string, message?: string }
  ) {}
}
