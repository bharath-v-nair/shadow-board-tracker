import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-incident-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div class="w-full max-w-md">
        @if (loading()) {
          <div class="flex justify-center my-12">
            <mat-spinner diameter="50"></mat-spinner>
          </div>
        } @else if (error()) {
          <div class="bg-red-50 text-red-600 p-6 rounded-lg text-center shadow">
            <h2 class="text-lg font-semibold">Error</h2>
            <p>{{ error() }}</p>
          </div>
        } @else if (isResolved()) {
          <mat-card class="text-center p-8 shadow-lg">
            <div class="mb-6 flex justify-center text-green-500">
              <mat-icon style="transform: scale(3); width: 72px; height: 72px;">check_circle</mat-icon>
            </div>
            <h2 class="text-2xl font-bold text-gray-800 mb-2">Task Resolved!</h2>
            <p class="text-gray-600">Thank you for keeping the floor safe. You may now close this tab.</p>
          </mat-card>
        } @else if (incident()) {
          <mat-card class="shadow-lg">
            <mat-card-header class="bg-gray-100 p-4 border-b">
              <mat-card-title class="text-xl font-bold">Resolve Incident</mat-card-title>
              <mat-card-subtitle class="mt-1">Please confirm you have returned this tool.</mat-card-subtitle>
            </mat-card-header>
            
            <mat-card-content class="p-6">
              <div class="mb-4">
                <p class="text-sm text-gray-500 uppercase tracking-wider font-semibold">Tool Name</p>
                <p class="text-lg font-medium text-gray-900">{{ incident().toolName || 'Unknown Tool' }}</p>
              </div>
              
              <div class="mb-4">
                <p class="text-sm text-gray-500 uppercase tracking-wider font-semibold">Board</p>
                <p class="text-lg font-medium text-gray-900">{{ incident().boardName || 'Unknown Board' }}</p>
              </div>

              <div class="mb-6">
                <p class="text-sm text-gray-500 uppercase tracking-wider font-semibold">Reported At</p>
                <p class="text-md text-gray-800">{{ incident().reportedAt | date:'medium' }}</p>
              </div>

              <button 
                mat-flat-button 
                color="primary" 
                class="w-full py-2 text-lg" 
                (click)="resolveIncident()"
                [disabled]="resolving()">
                @if (resolving()) {
                  <mat-spinner diameter="24" class="mx-auto"></mat-spinner>
                } @else {
                  MARK AS RESOLVED
                }
              </button>
            </mat-card-content>
          </mat-card>
        }
      </div>
    </div>
  `
})
export class IncidentDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private apiService = inject(ApiService);

  incidentId = signal<string | null>(null);
  incident = signal<any>(null);
  loading = signal<boolean>(true);
  resolving = signal<boolean>(false);
  isResolved = signal<boolean>(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('No incident ID provided.');
      this.loading.set(false);
      return;
    }

    this.incidentId.set(id);
    this.fetchIncident(id);
  }

  fetchIncident(id: string): void {
    this.apiService.getIncident(id).subscribe({
      next: (data) => {
        // Status enum is serialized as string by the backend ('Open', 'PendingReview', 'Resolved')
        // We check for both the string and the integer representation just to be safe.
        if (data.status !== 'Open' && data.status !== 0) {
          this.isResolved.set(true); // Already resolved edge case
        } else {
          this.incident.set(data);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching incident', err);
        this.error.set('Failed to load incident details. It may not exist.');
        this.loading.set(false);
      }
    });
  }

  resolveIncident(): void {
    const id = this.incidentId();
    if (!id) return;

    this.resolving.set(true);
    this.apiService.resolveIncident(id).subscribe({
      next: () => {
        this.isResolved.set(true);
        this.resolving.set(false);
      },
      error: (err) => {
        console.error('Error resolving incident', err);
        this.error.set('Failed to resolve task. Please try again.');
        this.resolving.set(false);
      }
    });
  }
}
