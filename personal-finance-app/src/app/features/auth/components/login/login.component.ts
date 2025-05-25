import { Component, OnInit } from '@angular/core';
import { SocialAuthService, GoogleLoginProvider, SocialUser } from '@abacritt/angularx-social-login';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'] // Corrected styleUrl to styleUrls
})
export class LoginComponent implements OnInit {
  user: SocialUser | null = null;

  constructor(private authService: SocialAuthService, private router: Router) {}

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
