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
      <nav class="absolute bottom-0 w-full bg-white border-t border-slate-100 shadow-[0_-8px_24px_-4px_rgba(0,0,0,0.08)] flex items-end z-20" style="height: 68px; padding-bottom: env(safe-area-inset-bottom);">
        
        <!-- Left: Home -->
        <button class="group relative flex flex-col items-center justify-center focus:outline-none transition-all duration-200 flex-1 h-full pb-2"
                routerLink="/dashboard"
                routerLinkActive #homeLink="routerLinkActive">
          <mat-icon class="transition-all duration-200 text-[26px] w-[26px] h-[26px]"
                    [ngClass]="homeLink.isActive ? 'text-blue-600 scale-110' : 'text-slate-400 group-hover:text-slate-600'">
            home
          </mat-icon>
          <span class="text-[10px] mt-0.5 font-semibold tracking-wide transition-colors duration-200"
                [ngClass]="homeLink.isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'">
            Home
          </span>
          <span class="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600 transition-all duration-300"
                [ngClass]="homeLink.isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'">
          </span>
        </button>

        <!-- Center spacer for FAB -->
        <div class="flex-1"></div>

        <!-- Right: Boards -->
        <button class="group relative flex flex-col items-center justify-center focus:outline-none transition-all duration-200 flex-1 h-full pb-2"
                routerLink="/boards"
                routerLinkActive #boardsLink="routerLinkActive">
          <mat-icon class="transition-all duration-200 text-[26px] w-[26px] h-[26px]"
                    [ngClass]="boardsLink.isActive ? 'text-blue-600 scale-110' : 'text-slate-400 group-hover:text-slate-600'">
            grid_view
          </mat-icon>
          <span class="text-[10px] mt-0.5 font-semibold tracking-wide transition-colors duration-200"
                [ngClass]="boardsLink.isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'">
            Boards
          </span>
          <span class="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600 transition-all duration-300"
                [ngClass]="boardsLink.isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'">
          </span>
        </button>
      </nav>

      <!-- Center FAB (glowing gradient) -->
      <div class="absolute bottom-5 left-1/2 transform -translate-x-1/2 z-30">
        <a routerLink="/scan"
           class="w-[60px] h-[60px] rounded-full flex items-center justify-center text-white
                  transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none
                  focus:ring-4 focus:ring-blue-300/60"
           style="background: linear-gradient(135deg, #6366f1 0%, #2563eb 100%);
                  box-shadow: 0 8px 24px -4px rgba(99,102,241,0.6), 0 4px 12px -2px rgba(37,99,235,0.4);">
          <mat-icon style="font-size: 26px; width: 26px; height: 26px;">qr_code_scanner</mat-icon>
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
