import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-gateway',
  imports: [],
  templateUrl: './gateway.html',
  styleUrls: ['./gateway.css']
})
export class GatewayComponent {

  x = 200; // posición inicial en el tablero
  y = 150;
  dragging = false;
  offsetX = 0;
  offsetY = 0;

  startDrag(event: MouseEvent) {
    this.dragging = true;
    this.offsetX = event.clientX - this.x;
    this.offsetY = event.clientY - this.y;
  }

  @HostListener('document:mouseup')
  stopDrag() {
    this.dragging = false;
  }

  @HostListener('document:mousemove', ['$event'])
  onDrag(event: MouseEvent) {
    if (this.dragging) {
      this.x = event.clientX - this.offsetX;
      this.y = event.clientY - this.offsetY;
    }
  }
}
