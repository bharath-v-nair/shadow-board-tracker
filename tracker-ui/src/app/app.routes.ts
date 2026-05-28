import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ScannerComponent } from './components/scanner/scanner.component';
import { BoardDetailComponent } from './components/board-detail/board-detail.component';
import { WorkersListComponent } from './components/workers-list/workers-list.component';
import { IncidentDetailComponent } from './components/incident-detail/incident-detail.component';
import { BoardsListComponent } from './components/boards-list/boards-list.component';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'boards', component: BoardsListComponent },
      { path: 'board/:id', component: BoardDetailComponent },
      { path: 'workers', component: WorkersListComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: 'scan', component: ScannerComponent, canActivate: [authGuard] },
  { path: 'incident/:id', component: IncidentDetailComponent },
  { path: 'login', component: LoginComponent },
  { path: '**', redirectTo: '' }
];
