import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './components/dashboard/dashboard.component'; // Ensure DashboardComponent is imported
import { SharedModule } from '../../shared/shared.module'; // Import SharedModule
import { CardModule } from 'primeng/card'; // Import CardModule

@NgModule({
  declarations: [
    // DashboardComponent removed
  ],
  imports: [
    CommonModule,
    DashboardRoutingModule,
    SharedModule, // Keep SharedModule here
    CardModule,    // Keep CardModule here
    DashboardComponent // Add DashboardComponent here
  ]
})
export class DashboardModule { }
