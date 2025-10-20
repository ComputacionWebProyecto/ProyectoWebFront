// dashboard.ts
import { Component } from '@angular/core';
import { DropdownMenuComponent } from "./drop-menu/drop-menu";
import { HeaderDashboard } from './header-dashboard/header-dashboard';
import { ActivityPanel } from './activity/activity-panel';
import { EdgePanel } from './edge/edge-panel';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DropdownMenuComponent, 
    HeaderDashboard,
    ActivityPanel,
    EdgePanel
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard {
  isSidebarOpen = true; // Estado del sidebar
  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}