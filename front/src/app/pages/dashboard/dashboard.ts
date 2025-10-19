import { Component } from '@angular/core';
import { HeaderDashboard } from './header-dashboard/header-dashboard';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [HeaderDashboard],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard {

}
