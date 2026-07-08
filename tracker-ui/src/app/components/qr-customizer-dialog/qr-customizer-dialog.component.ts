import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { QRCodeComponent } from 'angularx-qrcode';
import { Board, QrConfig } from '../../models/board.model';
import { ApiService } from '../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-qr-customizer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatIconModule,
    FormsModule,
    QRCodeComponent
  ],
  template: `
    <div class="p-6 qr-dialog-container relative">
      <button mat-icon-button class="absolute top-2 right-2 text-gray-500" (click)="close()">
        <mat-icon>close</mat-icon>
      </button>
      
      <h2 class="text-2xl font-bold sb-text-strong mb-6">Generate QR Code</h2>

      <div class="flex flex-col md:flex-row gap-8">
        <!-- Left: Controls -->
        <div class="flex-1 flex flex-col gap-6 cdk-overlay-container-exclude">
          <div class="sb-surface-2 p-4 rounded-xl border sb-border">
            <h3 class="text-sm font-semibold sb-text-muted uppercase tracking-wider mb-4">Print Settings</h3>

            <div class="mb-4">
              <label class="block text-sm font-medium sb-text-muted mb-2">QR Size (Physical Print)</label>
              <mat-select [(ngModel)]="config.size" class="w-full sb-surface border sb-border rounded px-3 py-2">
                <mat-option [value]="200">Small (200px)</mat-option>
                <mat-option [value]="300">Medium (300px)</mat-option>
                <mat-option [value]="400">Large (400px)</mat-option>
              </mat-select>
            </div>

            <div class="flex items-center justify-between mt-6 pt-4 border-t sb-border">
              <span class="text-sm font-medium sb-text-muted">Show Board Name</span>
              <mat-slide-toggle color="primary" [(ngModel)]="config.showLabel"></mat-slide-toggle>
            </div>
          </div>
          
          <div class="mt-auto flex gap-3">
            <button mat-stroked-button class="flex-1" (click)="close()">Cancel</button>
            <button mat-flat-button class="flex-1 bg-blue-600 text-white" (click)="saveAndPrint()">
              <mat-icon>print</mat-icon> Save & Print
            </button>
          </div>
        </div>

        <!-- Right: Live Preview -->
        <div class="flex-1 flex items-center justify-center bg-gray-50 p-6 rounded-xl border border-gray-100 min-h-[380px]">
          <div id="qr-print-region" class="inline-flex flex-col items-center p-4 qr-preview-box">
            <!-- Strict Width Container determining layout entirely from QR Code size -->
            <div class="relative flex flex-col items-center" style="margin-bottom: 3.5rem;">
              <!-- QR Frame with Orange Border -->
              <div class="bg-white border-[8px] border-[#E56A14] rounded-xl p-1 flex items-center justify-center shadow-sm max-w-full relative z-10">
                <div class="relative flex items-center justify-center qr-code-wrapper max-w-full">
                  <!-- Pure QR Code with High Error Correction -->
                  <qrcode
                    [qrdata]="qrPayload"
                    [width]="config.size"
                    [margin]="1"
                    [errorCorrectionLevel]="'H'"
                    [colorDark]="'#000000'"
                    [colorLight]="'#ffffff'"
                    class="flex items-center justify-center max-w-full">
                  </qrcode>
                  
                  <!-- Stylistic Overlay Image -->
                  <div class="absolute bg-white flex items-center justify-center px-1 py-0.5"
                       [style.width.%]="32">
                    <img 
                      src="assets/images/qourn-png.png" 
                      class="w-full h-auto object-contain" 
                      alt="Quorn Logo" />
                  </div>
                </div>
              </div>
              
              <!-- Connection Lip (85% of QR Frame) -->
              <div *ngIf="config.showLabel" class="w-[85%] h-3 bg-[#F4A261] -mt-1 z-0 shrink-0 relative"></div>
              
              <!-- Absolute Decoupled Label Capsule (110% of QR Frame) -->
              <div *ngIf="config.showLabel" 
                   class="absolute top-[calc(100%-4px)] left-1/2 -translate-x-1/2 w-[110%] bg-[#E56A14] text-white py-3.5 rounded-xl font-normal text-center tracking-wide shadow-md z-10 whitespace-nowrap overflow-hidden flex flex-col items-center justify-center px-4"
                   style="container-type: inline-size;">
                <span class="overflow-hidden text-ellipsis w-full block" style="font-size: clamp(0.7rem, 8cqw, 1.1rem);">
                  {{ board.name }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @media screen {
      /* Restricts the preview to stay within the dialog container regardless of large sizes */
      .qr-preview-box {
        max-width: 250px;
        width: 100%;
      }
      /* Allows the canvas/image generated by qrcode to scale dynamically inside the preview box */
      .qr-code-wrapper ::ng-deep canvas,
      .qr-code-wrapper ::ng-deep img {
        width: 100% !important;
        height: auto !important;
      }
    }
  `]
})
export class QrCustomizerDialogComponent implements OnInit {
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);

  config: QrConfig = {
    size: 300,
    showLabel: true
  };

  qrPayload: string = '';

  constructor(
    public dialogRef: MatDialogRef<QrCustomizerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public board: Board
  ) {
    // Since users strictly use the in-app scanner, the payload is purely the raw board ID.
    this.qrPayload = board.id;
  }

  ngOnInit(): void {
    if (this.board.qrConfig) {
      try {
        const parsed = JSON.parse(this.board.qrConfig);
        this.config = { ...this.config, ...parsed };
      } catch (e) {
        console.error('Failed to parse board QrConfig', e);
      }
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  saveAndPrint(): void {
    // Save config via API
    this.api.updateBoardQrConfig(this.board.id, this.config).subscribe({
      next: () => {
        // Trigger print dialog
        window.print();
        this.dialogRef.close(this.config);
      },
      error: (err) => {
        console.error('Failed to save QR config', err);
        this.snackBar.open('Failed to save configuration before printing.', 'Close', { duration: 3000 });
      }
    });
  }
}
