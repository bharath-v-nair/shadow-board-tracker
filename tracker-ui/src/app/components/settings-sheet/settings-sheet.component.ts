import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { ThemeService } from '../../services/theme.service';

/**
 * Lightweight settings pane, opened as a bottom sheet from the profile menu.
 * Currently hosts the dark-mode toggle; a natural home for future preferences.
 */
@Component({
  selector: 'app-settings-sheet',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatSlideToggleModule],
  template: `
    <div class="pb-6 sb-surface">
      <div class="px-6 py-4 border-b sb-border">
        <h2 class="text-lg font-bold sb-text-strong m-0">Settings</h2>
      </div>

      <div class="flex items-center gap-4 px-6 py-5">
        <div class="sb-surface-2 p-2.5 rounded-xl flex items-center justify-center">
          <mat-icon class="sb-brand-text">{{ theme.isDark() ? 'dark_mode' : 'light_mode' }}</mat-icon>
        </div>
        <div class="flex-1">
          <p class="font-semibold sb-text-strong m-0">Dark mode</p>
          <p class="text-xs sb-text-subtle m-0 mt-0.5">{{ theme.isDark() ? 'On' : 'Off' }} · follows your choice on this device</p>
        </div>
        <mat-slide-toggle
          color="primary"
          [checked]="theme.isDark()"
          (change)="onToggle($event.checked)"
          aria-label="Toggle dark mode">
        </mat-slide-toggle>
      </div>
    </div>
  `
})
export class SettingsSheetComponent {
  theme = inject(ThemeService);
  private ref = inject(MatBottomSheetRef<SettingsSheetComponent>);

  onToggle(checked: boolean): void {
    this.theme.setDark(checked);
  }
}
