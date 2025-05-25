import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // Import FormsModule and ReactiveFormsModule

import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsComponent } from './components/settings/settings.component'; // Ensure SettingsComponent is imported

// PrimeNG Modules and FormsModule/ReactiveFormsModule are now imported by SettingsComponent directly.
// MessageService is provided in SettingsComponent.

@NgModule({
  declarations: [
    // SettingsComponent removed
  ],
  imports: [
    CommonModule,
    SettingsRoutingModule,
    SettingsComponent // Add SettingsComponent here
    // FormsModule, ReactiveFormsModule, and PrimeNG modules removed
  ],
  providers: [
    // MessageService removed
  ]
})
export class SettingsModule { }
