import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActiveProcessService } from '../../../services/active-process.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header-dashboard.html',
  styleUrls: ['./header-dashboard.css']
})
export class HeaderDashboard implements OnInit, OnDestroy {
  @Input() isSidebarOpen = true;

  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() toggleProcesses = new EventEmitter<void>();
  @Output() toggleUsers = new EventEmitter<void>();
  @Output() toggleRoles = new EventEmitter<void>();

  activeProcessName: string | null = null;
  private processNameSubscription?: Subscription;

  constructor(private activeProcessService: ActiveProcessService) {}

  ngOnInit(): void {
    this.processNameSubscription = this.activeProcessService.activeProcessName$.subscribe(
      name => {
        this.activeProcessName = name;
      }
    );
  }

  ngOnDestroy(): void {
    this.processNameSubscription?.unsubscribe();
  }

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  toggleProcessPanel() {
    this.toggleProcesses.emit();
  }

  toggleUserPanel(){
    this.toggleUsers.emit();
  }
  toggleRolesPanel() {
    this.toggleRoles.emit();
  }
}

