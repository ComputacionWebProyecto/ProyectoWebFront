import { Routes } from '@angular/router';
import { Home} from './pages/home/home';
import { Dashboard } from './pages/dashboard/dashboard';
import { Login} from './pages/home/login/login';
import { Register } from './pages/home/register/register';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'dashboard', component: Dashboard },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
];


