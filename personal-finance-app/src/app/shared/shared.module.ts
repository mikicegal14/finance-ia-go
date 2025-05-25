import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { CurrencyFormatPipe } from './pipes/currency-format.pipe';

// PrimeNG Modules that might be shared (example)
// import { ButtonModule } from 'primeng/button';
// import { InputTextModule } from 'primeng/inputtext';

@NgModule({
  declarations: [
    CurrencyFormatPipe
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    // ButtonModule,
    // InputTextModule
  ],
  exports: [
    CurrencyFormatPipe,
    CommonModule, // Export CommonModule as it's used by feature modules for directives like *ngIf, *ngFor
    FormsModule,
    ReactiveFormsModule,
    // ButtonModule,
    // InputTextModule
  ]
})
export class SharedModule { }
