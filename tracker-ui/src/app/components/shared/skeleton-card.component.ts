import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Content-shaped placeholder shown while data loads. Beats a bare spinner because it
 * previews the layout (perceived-performance win) and prevents layout shift on arrival.
 * Render `count` of them inside a list container.
 */
@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    @for (row of rows(); track $index) {
      <div class="sb-card p-5 mb-4" aria-hidden="true">
        <div class="flex justify-between items-start mb-4">
          <div class="sb-skeleton h-5 w-2/5"></div>
          <div class="sb-skeleton h-5 w-20 rounded-full"></div>
        </div>
        <div class="sb-skeleton h-3.5 w-1/3 mb-4"></div>
        <div class="space-y-2 pt-3 border-t sb-border">
          <div class="sb-skeleton h-3 w-full"></div>
          <div class="sb-skeleton h-3 w-4/5"></div>
        </div>
      </div>
    }
  `,
})
export class SkeletonCardComponent {
  /** How many placeholder cards to render. */
  count = input<number>(3);
  rows() {
    return Array.from({ length: this.count() });
  }
}
