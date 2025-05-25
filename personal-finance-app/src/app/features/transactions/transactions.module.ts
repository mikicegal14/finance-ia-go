import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TransactionsRoutingModule } from './transactions-routing.module';
import { TransactionListComponent } from './components/transaction-list/transaction-list.component';
import { SharedModule } from '../../shared/shared.module'; // Import SharedModule
import { TableModule } from 'primeng/table'; // Import TableModule
import { TagModule } from 'primeng/tag'; // Import TagModule
import { ButtonModule } from 'primeng/button'; // For potential buttons
import { InputTextModule } from 'primeng/inputtext'; // For potential filters

@NgModule({
  declarations: [
    TransactionListComponent
  ],
  imports: [
    CommonModule,
    TransactionsRoutingModule,
    SharedModule,    // Add SharedModule
    TableModule,     // Add TableModule
    TagModule,       // Add TagModule
    ButtonModule,
    InputTextModule
  ]
})
export class TransactionsModule { }
