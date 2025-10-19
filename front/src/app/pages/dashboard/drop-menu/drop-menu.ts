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
  isOpen = false;

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  onOptionClick(option: string) {
    console.log('Opción seleccionada:', option);
    this.closeDropdown();
  }
}