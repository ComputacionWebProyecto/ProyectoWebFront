import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { Auth } from './pages/auth/auth'

export const routes: Routes = [
  { path: '', redirectTo: 'auth', pathMatch: 'full'},
  { path: 'auth', component: Auth},
  { path: 'dashboard', component: Dashboard },
];


