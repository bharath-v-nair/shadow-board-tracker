import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { AuthService } from '../../services/auth.service';
import { SettingsSheetComponent } from '../settings-sheet/settings-sheet.component';

@Component({
  selector: 'app-admin-menu',
  standalone: true,
  imports: [CommonModule, MatListModule, MatIconModule],
  template: `
    <div class="pb-4 sb-surface">
      <!-- Header — the signed-in user (read from the JWT) -->
      <div class="px-6 py-4 flex items-center border-b sb-border">
        <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl mr-4 flex-shrink-0 sb-brand-text" style="background: var(--sb-brand-soft);">
          {{ auth.getInitials() }}
        </div>
        <div class="min-w-0">
          <h2 class="text-lg font-bold sb-text-strong m-0 leading-tight truncate">{{ auth.getName() || roleLabel() }}</h2>
          <p class="text-sm sb-text-subtle m-0 truncate">{{ auth.getEmail() || roleLabel() }}</p>
        </div>
      </div>

      <!-- Menu List -->
      <mat-nav-list class="mt-2">
        <a mat-list-item (click)="goToWorkers()">
          <mat-icon matListItemIcon class="sb-text-subtle">group</mat-icon>
          <span matListItemTitle class="font-medium sb-text-muted">Manage Workers</span>
        </a>

        <a mat-list-item (click)="closeMenu()">
          <mat-icon matListItemIcon class="sb-text-subtle">insights</mat-icon>
          <span matListItemTitle class="font-medium sb-text-muted">DataPoints</span>
        </a>

        <a mat-list-item (click)="goToProfile()">
          <mat-icon matListItemIcon class="sb-text-subtle">person</mat-icon>
          <span matListItemTitle class="font-medium sb-text-muted">Profile Info</span>
        </a>

        <a mat-list-item (click)="openSettings()">
          <mat-icon matListItemIcon class="sb-text-subtle">settings</mat-icon>
          <span matListItemTitle class="font-medium sb-text-muted">Settings</span>
        </a>

        <div class="my-2 border-t sb-border"></div>

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
  private bottomSheet = inject(MatBottomSheet);
  private router = inject(Router);
  auth = inject(AuthService);

  roleLabel(): string {
    const role = this.auth.getRole();
    if (role === 'QA') return 'QA Inspector';
    if (role === 'DemoViewer') return 'Demo Viewer';
    if (role === 'Worker') return 'Floor Worker';
    return 'Account';
  }

  closeMenu(): void {
    this.bottomSheetRef.dismiss();
  }

  goToWorkers(): void {
    this.router.navigate(['/workers']);
    this.closeMenu();
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
    this.closeMenu();
  }

  openSettings(): void {
    this.closeMenu();
    this.bottomSheet.open(SettingsSheetComponent, { panelClass: 'rounded-t-2xl' });
  }

  signOut(): void {
    this.auth.clearToken();
    this.closeMenu();
    this.router.navigate(['/login']);
  }
}
