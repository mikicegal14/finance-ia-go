import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import { SocialAuthService, SocialUser } from '@abacritt/angularx-social-login';
import { environment } from '../../../environments/environment'; // Assuming you have an environment file

// Define gapi types for TypeScript, or install @types/gapi
declare let gapi: any;
declare let google: any;

const GAPI_SCRIPT_ID = 'gapi-script';
const GIS_SCRIPT_ID = 'gis-script';

@Injectable({
  providedIn: 'root'
})
export class GoogleApiService {
  private gapiInitialized = new ReplaySubject<boolean>(1);
  private gisInitialized = new ReplaySubject<boolean>(1);
  private tokenClient: any; // google.accounts.oauth2.TokenClient

  public gapiInitialized$: Observable<boolean> = this.gapiInitialized.asObservable();

  constructor(private zone: NgZone, private socialAuthService: SocialAuthService) {
    this.loadGapiScript();
    this.loadGisScript();

    // Subscribe to user state to initialize gapi client when user logs in
    this.socialAuthService.authState.subscribe((user: SocialUser | null) => {
      if (user && user.authToken) { // authToken is the access_token for Google
        this.initializeGapiClient(user.authToken);
      } else {
        // User logged out or token not available
        this.gapiInitialized.next(false);
      }
    });
  }

  private loadGapiScript(): void {
    if (document.getElementById(GAPI_SCRIPT_ID)) {
      return; // Script already loaded or being loaded
    }
    const script = document.createElement('script');
    script.id = GAPI_SCRIPT_ID;
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.zone.run(() => {
        gapi.load('client', () => {
          // GAPI client is loaded, but not yet initialized with token or API discovery docs
          // Initialization will happen once user logs in and provides an access token
          console.log('GAPI client script loaded.');
        });
      });
    };
    script.onerror = () => this.gapiInitialized.next(false); // Or handle error
    document.head.appendChild(script);
  }

  private loadGisScript(): void {
    if (document.getElementById(GIS_SCRIPT_ID)) {
      return;
    }
    const script = document.createElement('script');
    script.id = GIS_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.zone.run(() => {
        this.gisInitialized.next(true);
        console.log('GIS script loaded.');
        // Initialize token client if needed for further token operations (e.g. refresh)
        // this.tokenClient = google.accounts.oauth2.initTokenClient(...);
      });
    };
    script.onerror = () => this.gisInitialized.next(false);
    document.head.appendChild(script);
  }


  private initializeGapiClient(accessToken: string): void {
    gapi.client.init({
      apiKey: environment.googleApiKey, // Add your Google API Key to environment
      // clientId: 'YOUR_GOOGLE_CLIENT_ID', // Already configured in SocialLoginModule
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      // scope: 'https://www.googleapis.com/auth/drive.appdata', // Already handled by SocialLoginModule
    }).then(() => {
      gapi.client.setToken({ access_token: accessToken });
      this.zone.run(() => {
        this.gapiInitialized.next(true);
        console.log('GAPI client initialized with Drive API.');
      });
    }).catch((error: any) => {
      console.error('Error initializing GAPI client:', error);
      this.zone.run(() => this.gapiInitialized.next(false));
    });
  }

  // Expose gapi.client directly or wrap specific drive functions
  get drive() {
    return gapi.client.drive;
  }
}
