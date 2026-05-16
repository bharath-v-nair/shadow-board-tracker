import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBottomSheetModule, MatBottomSheet } from '@angular/material/bottom-sheet';
import { AdminMenuComponent } from '../admin-menu/admin-menu.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatBottomSheetModule],
  template: `
    <div class="max-w-md mx-auto h-screen flex flex-col bg-gray-50 relative overflow-hidden">
      <!-- Top App Bar -->
      <header class="bg-white px-4 py-3 flex items-center shadow-sm z-10">
        <!-- Avatar Touch Target -->
        <button (click)="openProfileMenu()" class="w-12 h-12 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0 border bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors">
          <mat-icon class="text-gray-500">person</mat-icon>
        </button>
        
        <!-- AI Search Pill -->
        <div class="rounded-full bg-gray-100 flex-1 ml-3 px-4 py-3 flex items-center justify-between text-gray-500 cursor-text">
          <span class="text-sm font-medium">Ask AI or Search...</span>
          <mat-icon class="text-blue-500" style="font-size: 20px; width: 20px; height: 20px;">auto_awesome</mat-icon>
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="flex-1 overflow-y-auto p-4 pb-24">
        <router-outlet></router-outlet>
      </main>

      <!-- Bottom Navigation -->
      <nav class="absolute bottom-0 w-full h-16 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex justify-between items-center px-8 z-20">
        
        <!-- Left: Home -->
        <button class="flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 focus:outline-none w-16" routerLink="/dashboard" routerLinkActive="text-blue-600">
          <mat-icon>home</mat-icon>
          <span class="text-[10px] mt-1 font-medium">Home</span>
        </button>

        <!-- Right: Boards -->
        <button class="flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 focus:outline-none w-16" routerLink="/boards" routerLinkActive="text-blue-600">
          <mat-icon>grid_view</mat-icon>
          <span class="text-[10px] mt-1 font-medium">Boards</span>
        </button>
      </nav>

      <!-- Center FAB -->
      <div class="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30">
        <a routerLink="/scan" class="w-16 h-16 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-blue-700 hover:shadow-xl transition-all focus:outline-none focus:ring-4 focus:ring-blue-300">
          <mat-icon style="font-size: 28px; width: 28px; height: 28px;">qr_code_scanner</mat-icon>
        </a>
      </div>
    </div>
  `
})
export class LayoutComponent {
  private bottomSheet = inject(MatBottomSheet);

  openProfileMenu() {
    this.bottomSheet.open(AdminMenuComponent);
  }
}
