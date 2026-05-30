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
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role === 'QA' || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] === 'QA';
    } catch (e) {
      return false;
    }
  }

  isDemoUser(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role === 'DemoViewer' || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] === 'DemoViewer';
    } catch (e) {
      return false;
    }
  }
}
