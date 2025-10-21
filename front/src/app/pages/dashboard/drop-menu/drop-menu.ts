// drop-menu.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-drop-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './drop-menu.html',
  styleUrls: ['./drop-menu.css']
})
export class DropdownMenuComponent {
  @Input() isOpen = true;
  @Output() componentSelected = new EventEmitter<{ type: string; category: string }>();

  constructor(private authService: AuthService, private router: Router){}

  logout(){
    this.authService.logout();
    this.router.navigate(['auth/login']);
  }

  // Estado de los submenús
  isGatewayOpen = false;
  isTasksOpen = false;
  isEventsOpen = false;

  // Toggle para cada submenú
  toggleGateway() { this.isGatewayOpen = !this.isGatewayOpen; }
  toggleTasks() { this.isTasksOpen = !this.isTasksOpen; }
  toggleEvents() { this.isEventsOpen = !this.isEventsOpen; }

  onDragStart(event: DragEvent, componentType: string, category: string) {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('component-type', componentType);
      event.dataTransfer.setData('component-category', category);

      const componentData = {
        type: componentType,
        category: category,
        label: category === 'gateway' ? 'Decisión' : 'Componente'
      };
      event.dataTransfer.setData('component', JSON.stringify(componentData));

      const target = event.target as HTMLElement;
      target.classList.add('opacity-50');

      console.log('Iniciando drag:', componentData);
    }
  }


  onDragEnd(event: DragEvent) {
    const target = event.target as HTMLElement;
    target.classList.remove('opacity-50');
    console.log('Drag terminado');
  }

  onSelectComponent(componentType: string, category: string) {
    console.log('Componente seleccionado:', componentType, 'Categoría:', category);
    this.componentSelected.emit({ type: componentType, category: category });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['auth']);
  }
}
