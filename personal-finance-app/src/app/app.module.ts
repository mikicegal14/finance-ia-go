import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'; // Import BrowserAnimationsModule
import { HttpClientModule } from '@angular/common/http'; // Import HttpClientModule for SocialLoginModule

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
// CurrencyFormatPipe is now declared in SharedModule, no longer here.

// PrimeNG UI Modules that might be used in AppComponent template (e.g., Button for nav)
import { ButtonModule } from 'primeng/button';


@NgModule({
  declarations: [
    AppComponent
    // CurrencyFormatPipe removed
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule, // Keep one instance
    HttpClientModule,       // Keep one instance
    AppRoutingModule,
    ButtonModule            // Add ButtonModule for p-button in AppComponent template
  ],
  providers: [], // SocialAuthServiceConfig is provided in AuthModule
  bootstrap: [AppComponent]
})
export class AppModule { }
