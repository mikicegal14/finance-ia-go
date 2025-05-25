import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // Import FormsModule and ReactiveFormsModule

import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsComponent } from './components/settings/settings.component';

// PrimeNG Modules
import { CardModule } from 'primeng/card';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DropdownModule } from 'primeng/dropdown'; // Import DropdownModule
import { MessageService } from 'primeng/api';

@NgModule({
  declarations: [
    SettingsComponent
  ],
  imports: [
    CommonModule,
    SettingsRoutingModule,
    FormsModule,          // Add FormsModule
    ReactiveFormsModule,  // Add ReactiveFormsModule
    CardModule,
    SelectButtonModule,
    InputTextModule,
    ButtonModule,
    ToastModule,
    DropdownModule      // Add DropdownModule here
  ],
  providers: [
    MessageService // Provide MessageService if you use p-toast
  ]
})
export class SettingsModule { }
