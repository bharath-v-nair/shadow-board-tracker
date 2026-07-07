import { ThemeService } from './theme.service';

/**
 * ThemeService is a plain injectable with no Angular DI deps, so we exercise it by
 * newing it directly (no TestBed) and asserting on localStorage + <html> side effects.
 */
describe('ThemeService', () => {
  const STORAGE_KEY = 'sb-theme';

  function mockPrefersDark(matches: boolean) {
    (window as any).matchMedia = (query: string) => ({
      matches: query.includes('dark') ? matches : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
    // jsdom has no matchMedia by default; start from "prefers light".
    mockPrefersDark(false);
  });

  it('defaults to light when nothing is persisted and OS prefers light', () => {
    const svc = new ThemeService();
    expect(svc.theme()).toBe('light');
    expect(svc.isDark()).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('initializes from prefers-color-scheme when no saved choice', () => {
    mockPrefersDark(true);
    const svc = new ThemeService();
    expect(svc.theme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('persisted choice overrides the OS preference', () => {
    mockPrefersDark(true); // OS says dark...
    localStorage.setItem(STORAGE_KEY, 'light'); // ...but the user chose light
    const svc = new ThemeService();
    expect(svc.theme()).toBe('light');
  });

  it('toggle flips the mode, persists it, and updates <html>', () => {
    const svc = new ThemeService();
    expect(svc.theme()).toBe('light');

    svc.toggle();
    expect(svc.theme()).toBe('dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');

    svc.toggle();
    expect(svc.theme()).toBe('light');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('setDark(true) enables dark mode', () => {
    const svc = new ThemeService();
    svc.setDark(true);
    expect(svc.isDark()).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });
});
