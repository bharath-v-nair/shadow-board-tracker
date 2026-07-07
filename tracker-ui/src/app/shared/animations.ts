import { animate, query, stagger, style, transition, trigger } from '@angular/animations';

/**
 * Reusable Angular animation triggers.
 *
 * Motion here is deliberate and fast (150–250ms): it explains state changes
 * (a card entering a list, an incident moving between tabs on a SignalR push),
 * never decorates for its own sake. CSS-driven motion is disabled for users who
 * prefer reduced motion via a media query in styles.scss; JS animations below are
 * additionally gated per-component with `[@.disabled]="reducedMotion"`.
 */

/** Staggered enter for list items — each new card fades/slides in just after the last. */
export const listStagger = trigger('listStagger', [
  transition('* => *', [
    query(
      ':enter',
      [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        stagger(55, [
          animate('220ms cubic-bezier(0.22, 1, 0.36, 1)', style({ opacity: 1, transform: 'none' })),
        ]),
      ],
      { optional: true }
    ),
  ]),
]);

/** Single-element enter/leave — used for tab panels and overlays. */
export const fadeSlide = trigger('fadeSlide', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(8px)' }),
    animate('200ms cubic-bezier(0.22, 1, 0.36, 1)', style({ opacity: 1, transform: 'none' })),
  ]),
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-6px)' })),
  ]),
]);

/** True when the OS/browser is set to reduce motion — bind to `[@.disabled]`. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
