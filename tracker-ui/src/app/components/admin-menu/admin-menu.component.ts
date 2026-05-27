import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-menu',
  standalone: true,
  imports: [CommonModule, MatListModule, MatIconModule],
  template: `
    <div class="pb-4">
      <!-- Header -->
      <div class="px-6 py-4 flex items-center border-b border-gray-100">
        <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl mr-4 flex-shrink-0">
          QA
        </div>
        <div>
          <h2 class="text-lg font-bold text-gray-800 m-0 leading-tight">QA Inspector</h2>
          <p class="text-sm text-gray-500 m-0">nairbharathofficial&#64;gmail.com</p>
        </div>
      </div>

      <!-- Menu List -->
      <mat-nav-list class="mt-2">
        <a mat-list-item (click)="goToWorkers()">
          <mat-icon matListItemIcon class="text-gray-500">group</mat-icon>
          <span matListItemTitle class="font-medium text-gray-700">Manage Workers</span>
        </a>
        
        <a mat-list-item (click)="closeMenu()">
          <mat-icon matListItemIcon class="text-gray-500">insights</mat-icon>
          <span matListItemTitle class="font-medium text-gray-700">DataPoints</span>
        </a>
        
        <a mat-list-item (click)="closeMenu()">
          <mat-icon matListItemIcon class="text-gray-500">person</mat-icon>
          <span matListItemTitle class="font-medium text-gray-700">Profile Info</span>
        </a>
        
        <div class="my-2 border-t border-gray-100"></div>
        
        <a mat-list-item (click)="signOut()">
          <mat-icon matListItemIcon class="text-red-500">logout</mat-icon>
          <span matListItemTitle class="font-bold text-red-600">Sign Out</span>
        </a>
      </mat-nav-list>
    </div>
  `
})
export class AdminMenuComponent {
  private bottomSheetRef = inject(MatBottomSheetRef<AdminMenuComponent>);
  private router = inject(Router);
  private authService = inject(AuthService);

  closeMenu(): void {
    this.bottomSheetRef.dismiss();
  }

  goToWorkers(): void {
    this.router.navigate(['/workers']);
    this.closeMenu();
  }

  signOut(): void {
    this.authService.clearToken();
    this.closeMenu();
    this.router.navigate(['/login']);
  }
}
