import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

type LoginStatus = 'enter-email' | 'loading' | 'enter-code' | 'verifying' | 'error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 p-4">
      <div class="max-w-sm w-full">
        <div class="bg-white rounded-2xl shadow-xl overflow-hidden">

          <!-- Shared Header -->
          <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8 text-center">
            <div class="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
              <mat-icon class="text-white text-3xl">lock</mat-icon>
            </div>
            <h1 class="text-2xl font-extrabold text-white tracking-tight m-0">QA Access</h1>
            <p class="text-blue-100 text-sm mt-1">
              @if (status() === 'enter-code' || status() === 'verifying') {
                Check your email for the 6-digit code
              } @else {
                Enter your email to receive a secure code
              }
            </p>
          </div>

          <div class="p-8">

            <!-- STEP 1: Email Input -->
            @if (status() === 'enter-email' || status() === 'loading' || status() === 'error') {
              <div class="space-y-4">
                <div>
                  <label for="emailInput" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                  <input
                    id="emailInput"
                    type="email"
                    [(ngModel)]="email"
                    placeholder="you@company.com"
                    [disabled]="status() === 'loading'"
                    class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                    (keyup.enter)="onSendCode()"
                  />
                </div>

                @if (status() === 'error') {
                  <div class="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                    <mat-icon class="text-red-500 text-[18px] w-[18px] h-[18px]">error_outline</mat-icon>
                    <p class="text-xs text-red-600 font-medium">Something went wrong. Please try again.</p>
                  </div>
                }

                <button
                  id="sendCodeBtn"
                  (click)="onSendCode()"
                  [disabled]="status() === 'loading' || !email"
                  class="w-full h-12 rounded-xl bg-blue-600 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-200/60">
                  @if (status() === 'loading') {
                    <mat-spinner diameter="20" color="accent"></mat-spinner>
                    <span>Sending Code...</span>
                  } @else {
                    <mat-icon>send</mat-icon>
                    <span>Send Login Code</span>
                  }
                </button>
              </div>
            }

            <!-- STEP 2: OTP Code Input -->
            @if (status() === 'enter-code' || status() === 'verifying') {
              <div class="space-y-5">
                <div class="text-center bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                  <p class="text-xs text-blue-600 font-semibold">Code sent to</p>
                  <p class="font-bold text-slate-800 text-sm mt-0.5 truncate">{{ email }}</p>
                </div>

                <div>
                  <label for="otpInput" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">6-Digit Code</label>
                  <input
                    id="otpInput"
                    type="text"
                    inputmode="numeric"
                    maxlength="6"
                    [(ngModel)]="otpCode"
                    placeholder="000000"
                    [disabled]="status() === 'verifying'"
                    class="w-full px-4 py-4 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 text-center text-3xl font-mono font-bold tracking-[0.5em] placeholder-slate-300 placeholder:text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all disabled:opacity-50"
                    (keyup.enter)="onVerifyCode()"
                  />
                </div>

                @if (otpError()) {
                  <div class="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                    <mat-icon class="text-red-500 text-[18px] w-[18px] h-[18px]">error_outline</mat-icon>
                    <p class="text-xs text-red-600 font-medium">{{ otpError() }}</p>
                  </div>
                }

                <button
                  id="verifyBtn"
                  (click)="onVerifyCode()"
                  [disabled]="status() === 'verifying' || otpCode.length !== 6"
                  class="w-full h-12 rounded-xl bg-blue-600 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-200/60">
                  @if (status() === 'verifying') {
                    <mat-spinner diameter="20" color="accent"></mat-spinner>
                    <span>Verifying...</span>
                  } @else {
                    <mat-icon>verified</mat-icon>
                    <span>Verify Code</span>
                  }
                </button>

                <button
                  class="w-full text-center text-xs text-slate-400 hover:text-blue-500 transition-colors py-1 flex items-center justify-center gap-1"
                  (click)="resetToEmail()">
                  <mat-icon class="text-[14px] w-[14px] h-[14px]">arrow_back</mat-icon>
                  Change email address
                </button>
              </div>
            }

          </div>
        </div>
        <p class="text-center text-xs text-slate-400 mt-5">Klipspringer Shadow Board Tracker &mdash; QA Portal</p>
      </div>
    </div>
  `
})
export class LoginComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  email: string = '';
  otpCode: string = '';
  status = signal<LoginStatus>('enter-email');
  otpError = signal<string | null>(null);

  onSendCode() {
    if (!this.email || this.status() === 'loading') return;
    this.status.set('loading');

    this.api.requestMagicLink(this.email).subscribe({
      next: () => {
        this.otpCode = '';
        this.otpError.set(null);
        this.status.set('enter-code');
      },
      error: (err) => {
        console.error('Code request failed', err);
        this.status.set('error');
      }
    });
  }

  onVerifyCode() {
    if (this.otpCode.length !== 6 || this.status() === 'verifying') return;
    this.otpError.set(null);
    this.status.set('verifying');

    this.api.verifyMagicLink(this.email, this.otpCode).subscribe({
      next: (response) => {
        this.auth.setToken(response.token);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('OTP verification failed', err);
        this.otpError.set('Invalid or expired code. Please try again.');
        this.status.set('enter-code');
      }
    });
  }

  resetToEmail() {
    this.otpCode = '';
    this.otpError.set(null);
    this.status.set('enter-email');
  }
}
