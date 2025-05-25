import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { SharedModule } from '../../shared/shared.module'; // Import SharedModule
import { CardModule } from 'primeng/card'; // Import CardModule

@NgModule({
  declarations: [
    DashboardComponent
  ],
  imports: [
    CommonModule,
    DashboardRoutingModule,
    SharedModule, // Add SharedModule here
    CardModule    // Add CardModule here
  ]
})
export class DashboardModule { }
