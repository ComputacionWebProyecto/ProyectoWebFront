import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-parallel',
  standalone: true,
  template: `
    <svg 
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 40 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M20 2L38 20L20 38L2 20L20 2Z" 
        stroke="currentColor" 
        stroke-width="2" 
        fill="none"
      />
      <path 
        d="M20 8V32M8 20H32" 
        stroke="currentColor" 
        stroke-width="2.5" 
        stroke-linecap="round"
      />
    </svg>
  `,
  styles: [`
    :host { 
      display: inline-block; 
      line-height: 0; 
    }
    svg { 
      display: block; 
    }
  `]
})
export class Parallel {
  @Input() size: number = 24;
}