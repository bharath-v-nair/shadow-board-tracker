import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'token';

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  isQA(): boolean {
    return this.getRole() === 'QA';
  }

  isDemoUser(): boolean {
    return this.getRole() === 'DemoViewer';
  }

  /** The signed-in user's display name (from the JWT `name` claim). */
  getName(): string {
    const p = this.decodeToken();
    return this.claim(p, 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name', 'name', 'unique_name') ?? '';
  }

  /** The signed-in user's email (from the JWT `emailaddress` claim). */
  getEmail(): string {
    const p = this.decodeToken();
    return this.claim(p, 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress', 'email') ?? '';
  }

  getRole(): string {
    const p = this.decodeToken();
    return this.claim(p, 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role', 'role') ?? '';
  }

  /** Up-to-two-letter initials for the avatar placeholder (until real photos land in Phase 25). */
  getInitials(): string {
    const parts = this.getName().trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /** Decodes the JWT payload (unverified — display only; the server verifies the signature). */
  private decodeToken(): Record<string, string> | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  private claim(payload: Record<string, string> | null, ...keys: string[]): string | undefined {
    if (!payload) return undefined;
    for (const key of keys) {
      if (payload[key]) return payload[key];
    }
    return undefined;
  }
}
