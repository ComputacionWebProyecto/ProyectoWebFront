import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-decision',
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
        stroke-width="2.5" 
        fill="none"
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
export class Decision {
  @Input() size: number = 24;
}