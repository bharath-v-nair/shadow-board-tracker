import { Injectable, computed, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'sb-theme';

/**
 * Owns the app's light/dark mode. Source of truth is a signal; the chosen mode is
 * mirrored onto <html> two ways so both worlds follow it:
 *   - `color-scheme` style  → Material's `--mat-sys-*` tokens + native form controls
 *   - `.dark` class         → our own `--sb-*` token overrides (and Tailwind `dark:`)
 *
 * Initial value: persisted choice in localStorage, else the OS `prefers-color-scheme`.
 * An inline script in index.html applies the same logic before first paint (no flash);
 * this service keeps it in sync at runtime.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<ThemeMode>(this.resolveInitial());

  readonly theme = this._theme.asReadonly();
  readonly isDark = computed(() => this._theme() === 'dark');

  constructor() {
    // Apply once at construction so runtime state matches the pre-paint inline script.
    this.apply(this._theme());
  }

  /** Flip between light and dark. */
  toggle(): void {
    this.setTheme(this._theme() === 'dark' ? 'light' : 'dark');
  }

  setDark(dark: boolean): void {
    this.setTheme(dark ? 'dark' : 'light');
  }

  setTheme(mode: ThemeMode): void {
    this._theme.set(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* storage unavailable (private mode) — degrade to in-memory only */
    }
    this.apply(mode);
  }

  private resolveInitial(): ThemeMode {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      /* ignore */
    }
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  private apply(mode: ThemeMode): void {
    if (typeof document === 'undefined') {
      return;
    }
    const html = document.documentElement;
    html.classList.toggle('dark', mode === 'dark');
    html.style.colorScheme = mode;
  }
}
