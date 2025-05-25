import { Component, OnInit } from '@angular/core';

interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

@Component({
  selector: 'app-transaction-list',
  templateUrl: './transaction-list.component.html',
  styleUrls: ['./transaction-list.component.css']
})
export class TransactionListComponent implements OnInit {
  mockTransactions: Transaction[] = [];

  constructor() { }

  ngOnInit(): void {
    this.mockTransactions = [
      { id: '1', date: new Date('2024-05-20'), description: 'Salary Deposit', amount: 5000, type: 'income' },
      { id: '2', date: new Date('2024-05-21'), description: 'Groceries', amount: -75.50, type: 'expense' },
      { id: '3', date: new Date('2024-05-22'), description: 'Freelance Project Payment', amount: 1200, type: 'income' },
      { id: '4', date: new Date('2024-05-22'), description: 'Dinner Out', amount: -45.00, type: 'expense' },
      { id: '5', date: new Date('2024-05-23'), description: 'Utility Bill', amount: -120.00, type: 'expense' },
      { id: '6', date: new Date('2024-05-24'), description: 'Book Purchase', amount: -22.99, type: 'expense' },
    ];
  }
}
