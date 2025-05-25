import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TransactionsRoutingModule } from './transactions-routing.module';
import { TransactionListComponent } from './components/transaction-list/transaction-list.component'; // Ensure TransactionListComponent is imported
// SharedModule, TableModule, TagModule are now imported by TransactionListComponent directly.
import { ButtonModule } from 'primeng/button'; // For potential buttons
import { InputTextModule } from 'primeng/inputtext'; // For potential filters

@NgModule({
  declarations: [
    // TransactionListComponent removed
  ],
  imports: [
    CommonModule,
    TransactionsRoutingModule,
    ButtonModule, // Keep ButtonModule
    InputTextModule, // Keep InputTextModule
    TransactionListComponent // Add TransactionListComponent here
  ]
})
export class TransactionsModule { }
