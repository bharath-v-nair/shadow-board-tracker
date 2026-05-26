import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-scanner',
  standalone: true,
  imports: [CommonModule, ZXingScannerModule, MatButtonModule, MatIconModule],
  template: `
    <div class="flex flex-col items-center justify-center h-full min-h-screen p-4 bg-gray-50">
      <div class="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden relative">
        <div class="p-4 bg-primary text-white flex justify-between items-center">
          <h2 class="text-xl font-semibold m-0">Scan Board QR</h2>
          <button mat-icon-button (click)="goBack()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        
        <div class="relative bg-black aspect-square flex items-center justify-center">
          <zxing-scanner 
            [enable]="true"
            (scanSuccess)="onCodeResult($event)"
            class="w-full h-full object-cover">
          </zxing-scanner>
          
          <!-- Overlay guide -->
          <div class="absolute inset-0 border-2 border-primary border-opacity-50 pointer-events-none m-8 rounded-lg"></div>
        </div>
        
        <div class="p-4 text-center text-gray-600">
          <p>Point your camera at a board's QR code</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bg-primary { background-color: var(--mat-sys-primary); color: var(--mat-sys-on-primary); }
    .border-primary { border-color: var(--mat-sys-primary); }
  `]
})
export class ScannerComponent {
  private router = inject(Router);

  onCodeResult(resultString: string) {
    // Bulletproof extraction: 
    // If the scanned QR code is an older one containing the full URL (http://localhost...), extract just the ID.
    // If it's the new format (just the ID), it uses it as is.
    let boardId = resultString;
    if (resultString.includes('/board/')) {
      boardId = resultString.split('/board/').pop() || resultString;
    }
    
    this.router.navigate(['/board', boardId]);
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
