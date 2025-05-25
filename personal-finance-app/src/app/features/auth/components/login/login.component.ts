import { Component, OnInit } from '@angular/core';
import { SocialAuthService, GoogleLoginProvider, SocialUser } from '@abacritt/angularx-social-login';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common'; // Added CommonModule
import { ButtonModule } from 'primeng/button'; // Added ButtonModule

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'], // Corrected styleUrl to styleUrls
  standalone: true, // Added standalone: true
  imports: [
    CommonModule,
    ButtonModule
  ]
})
export class LoginComponent implements OnInit {
  user: SocialUser | null = null;

  constructor(public authService: SocialAuthService, private router: Router) {} // Made authService public for template access

  ngOnInit() {
    this.authService.authState.subscribe((user) => {
      this.user = user;
      if (user) {
        console.log('User logged in: ', user);
        // You can redirect the user to another page or store user info
        // For now, just logging to console.
      }
    });
  }

  signInWithGoogle(): void {
    this.authService.signIn(GoogleLoginProvider.PROVIDER_ID)
      .then((user) => {
        // In a real app, you might navigate or handle the user object here
        // but authState subscription already handles the user object.
        console.log('Sign-in process started');
      })
      .catch(error => {
        console.error('Error during sign in: ', error);
      });
  }
}
