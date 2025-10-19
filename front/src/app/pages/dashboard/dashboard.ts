import { Component } from '@angular/core';
import { DropdownMenuComponent } from "./drop-menu/drop-menu";
import { HeaderDashboard } from './header-dashboard/header-dashboard';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DropdownMenuComponent, HeaderDashboard], // Los dos aquí
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard {

}