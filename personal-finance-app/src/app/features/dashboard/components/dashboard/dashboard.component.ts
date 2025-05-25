import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  someAmount: number = 12345.67;
  anotherAmount: number = 765.43;
  expenseAmount: number = -250.99; // Example of a negative value
  zeroAmount: number = 0;
  largeAmount: number = 1000000.50;

  constructor() { }
}
