import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'; // Import BrowserAnimationsModule
import { HttpClientModule } from '@angular/common/http'; // Import HttpClientModule for SocialLoginModule

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
// CurrencyFormatPipe is now declared in SharedModule, no longer here.

// PrimeNG UI Modules that might be used in AppComponent template (e.g., Button for nav)
import { ButtonModule } from 'primeng/button';


import { AppComponent } from './app.component'; // Ensure AppComponent is imported

@NgModule({
  declarations: [
    // CurrencyFormatPipe removed
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule, // Keep one instance
    HttpClientModule,       // Keep one instance
    AppRoutingModule,
    // ButtonModule removed as it's now in AppComponent's imports
    AppComponent // Add AppComponent here
  ],
  providers: [], // SocialAuthServiceConfig is provided in AuthModule
  bootstrap: [AppComponent] // AppComponent is still bootstrapped
})
export class AppModule { }
