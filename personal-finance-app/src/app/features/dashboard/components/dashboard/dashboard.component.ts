import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Added CommonModule for basic directives
import { CardModule } from 'primeng/card'; // Added CardModule for p-card
import { SharedModule } from '../../../../shared/shared.module'; // Added SharedModule for CurrencyFormatPipe

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true, // Added standalone: true
  imports: [
    CommonModule,
    CardModule,
    SharedModule
  ]
})
export class DashboardComponent {
  someAmount: number = 12345.67;
  anotherAmount: number = 765.43;
  expenseAmount: number = -250.99; // Example of a negative value
  zeroAmount: number = 0;
  largeAmount: number = 1000000.50;

  constructor() { }
}
