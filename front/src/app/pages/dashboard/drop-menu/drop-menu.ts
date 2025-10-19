import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dropdown-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './drop-menu.html',
  styleUrls: ['./drop-menu.css']
})
export class DropdownMenuComponent {
  isOpen = true; // Agregar esta propiedad

  toggleSidebar() { // Agregar este método
    this.isOpen = !this.isOpen;
  }
}
