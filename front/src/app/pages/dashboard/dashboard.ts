// dashboard.ts
import { Component } from '@angular/core';
import { DropdownMenuComponent } from "./drop-menu/drop-menu";
import { HeaderDashboard } from './header-dashboard/header-dashboard';
import { GatewayComponent } from "./gateway/gateway";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DropdownMenuComponent, HeaderDashboard, GatewayComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard {
  isSidebarOpen = true; // Estado del sidebar

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
  gateways = [1]; // lista de compuertas
}
