import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ScannerComponent } from './components/scanner/scanner.component';
import { BoardDetailComponent } from './components/board-detail/board-detail.component';
import { VerifyComponent } from './components/verify/verify.component';
import { IncidentDetailComponent } from './components/incident-detail/incident-detail.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent, pathMatch: 'full' },
  { path: 'scan', component: ScannerComponent },
  { path: 'board/:id', component: BoardDetailComponent },
  { path: 'incident/:id', component: IncidentDetailComponent },
  { path: 'auth/verify', component: VerifyComponent },
  { path: '**', redirectTo: '' }
];
