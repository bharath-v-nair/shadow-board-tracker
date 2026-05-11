import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatButtonModule],
  template: `
    <div class="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div class="w-full max-w-md bg-white rounded-lg shadow-lg p-8 text-center">
        @if (loading()) {
          <div class="flex flex-col items-center">
            <mat-spinner diameter="50" class="mb-6"></mat-spinner>
            <h2 class="text-xl font-semibold text-gray-800">Verifying your secure link...</h2>
            <p class="text-gray-500 mt-2">Please wait while we log you in.</p>
          </div>
        } @else if (error()) {
          <div class="flex flex-col items-center text-red-600">
            <div class="bg-red-100 p-4 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 class="text-xl font-semibold mb-2">Verification Failed</h2>
            <p class="text-gray-600 mb-6">{{ error() }}</p>
            <button mat-flat-button color="primary" (click)="goToDashboard()">
              Return to Dashboard
            </button>
          </div>
        }
      </div>
    </div>
  `
})
export class VerifyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);
  private authService = inject(AuthService);

  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.error.set('No token provided in the URL.');
      this.loading.set(false);
      return;
    }

    this.apiService.verifyMagicLink(token).subscribe({
      next: (response) => {
        this.authService.setToken(response.token);
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Magic link verification failed', err);
        this.error.set('The magic link is invalid or has expired.');
        this.loading.set(false);
      }
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/']);
  }
}
