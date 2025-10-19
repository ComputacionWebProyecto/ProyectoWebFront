import { Component } from '@angular/core';
import { DropdownMenuComponent } from "./drop-menu/drop-menu";

@Component({
  selector: 'app-dashboard',
  imports: [DropdownMenuComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard {

}
