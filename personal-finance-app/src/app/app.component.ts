import { Component, OnInit, OnDestroy } from '@angular/core';
import { SocialAuthService, SocialUser } from '@abacritt/angularx-social-login';
import { Router, RouterModule } from '@angular/router'; // Added RouterModule
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common'; // Added CommonModule
import { ButtonModule } from 'primeng/button'; // Added ButtonModule

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true, // Added standalone: true
  imports: [
    CommonModule,
    RouterModule, // Imported RouterModule
    ButtonModule   // Imported ButtonModule
  ]
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'personal-finance-app';
  user: SocialUser | null = null;
  private authSubscription!: Subscription;

  constructor(public authService: SocialAuthService, public router: Router) {} // Made router public for template access

  ngOnInit() {
    this.authSubscription = this.authService.authState.subscribe((user) => {
      this.user = user;
      if (!user) {
        // Optional: Redirect to login if user is not logged in and not already on auth page
        // Consider the case where the app is just loading or on public pages
        // For simplicity, this is commented out but can be enabled if strict auth is needed everywhere
        // if (!this.router.url.includes('/auth')) {
        //   this.router.navigate(['/auth/login']);
        // }
      }
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  signOut(): void {
    this.authService.signOut().then(() => {
      this.router.navigate(['/auth/login']); // Redirect to login after sign out
    });
  }
}
