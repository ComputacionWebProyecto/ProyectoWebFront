// dashboard.ts
import { Component } from '@angular/core';
import { DropdownMenuComponent } from "./drop-menu/drop-menu";
import { HeaderDashboard } from './header-dashboard/header-dashboard';
import { ProcessPanel } from './process-panel/process-panel';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DropdownMenuComponent, HeaderDashboard, ProcessPanel],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard {
  isSidebarOpen = true; // Estado del sidebar
  isProcessPanelOpen = false;

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  toggleProcessPanel() { 
    this.isProcessPanelOpen = !this.isProcessPanelOpen;
  }
}