import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
import { map, switchMap, catchError, tap, filter, first } from 'rxjs/operators';
import { Buffer } from 'buffer';
import { AppConfig, StorageProvider, S3Credentials } from '../models/app-config.model';
import { GoogleApiService } from './google-api.service';
import { SocialAuthService, SocialUser } from '@abacritt/angularx-social-login';
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"; // AWS SDK v3 imports

const CONFIG_FILE_NAME = 'config.json'; // Used for Google Drive and S3
const LOCAL_STORAGE_KEY = 'appConfig';

// Helper function to convert S3 GetObjectCommand's Body (ReadableStream) to string
const streamToString = (stream: any): Promise<string> => // Type 'any' for stream for broader compatibility
  new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => {
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const combinedChunks = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combinedChunks.set(chunk, offset);
        offset += chunk.length;
      }
      resolve(Buffer.from(combinedChunks).toString("utf-8"));
    });
  });


@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private defaultConfig: AppConfig = {
    storageProvider: null,
    s3Credentials: null,
    currencySymbol: 'S/'
  };

  private configSubject: BehaviorSubject<AppConfig>;
  public config$: Observable<AppConfig>;
  private currentUser: SocialUser | null = null;

  constructor(
    private googleApiService: GoogleApiService,
    private socialAuthService: SocialAuthService
  ) {
    this.configSubject = new BehaviorSubject<AppConfig>(this.defaultConfig);
    this.config$ = this.configSubject.asObservable();

    this.socialAuthService.authState.pipe(
      tap(user => {
        this.currentUser = user;
      }),
      switchMap(user => {
        const localConf = this.getLocalConfig();
        if (user && localConf?.storageProvider === 'googleDrive') {
          return this.googleApiService.gapiInitialized$.pipe(
            filter(initialized => initialized),
            first(),
            switchMap(() => this.loadFromGoogleDrive()),
            catchError(err => this.handleLoadError(err, 'Google Drive'))
          );
        } else if (localConf?.storageProvider === 's3' && localConf.s3Credentials) {
          return this.loadFromS3(localConf.s3Credentials).pipe(
            catchError(err => this.handleLoadError(err, 'S3'))
          );
        } else if (localConf) {
          this.configSubject.next(localConf);
          return of(localConf);
        }
        this.loadFromLocalStorageOrDefault();
        return of(this.configSubject.value);
      }),
      catchError(error => { // Catch errors from the outer switchMap/authState sequence
        console.error('Error during initial config load sequence based on authState:', error);
        this.loadFromLocalStorageOrDefault();
        return of(this.configSubject.value);
      })
    ).subscribe();

    if (!this.currentUser) {
      this.loadFromLocalStorageOrDefault(); // Initial load if no user yet
    }
  }

  private handleLoadError(error: any, providerName: string): Observable<AppConfig> {
    console.error(`Error loading configuration from ${providerName}:`, error);
    this.loadFromLocalStorageOrDefault(); // Fallback to local
    return of(this.configSubject.value); // Continue the stream with current value
  }

  private getLocalConfig(): AppConfig | null {
    const savedConfig = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig) as AppConfig;
        if (parsedConfig && typeof parsedConfig.currencySymbol !== 'undefined') {
          return parsedConfig;
        }
      } catch (e) {
        console.error("Error parsing local config", e);
        return null;
      }
    }
    return null;
  }

  private loadFromLocalStorageOrDefault(): void {
    const localConfig = this.getLocalConfig();
    if (localConfig) {
      this.configSubject.next(localConfig);
      console.log('Configuration loaded from localStorage:', localConfig);
    } else {
      this.configSubject.next(this.defaultConfig);
      console.log('No valid configuration found in localStorage. Initialized with defaults:', this.defaultConfig);
    }
  }

  public loadConfig(): void { // Explicit call, typically from settings
    const currentConfig = this.configSubject.value; // Use the current (possibly S3-selected) config
    if (currentConfig.storageProvider === 'googleDrive' && this.currentUser) {
      this.googleApiService.gapiInitialized$.pipe(
        filter(initialized => initialized),
        first(),
        switchMap(() => this.loadFromGoogleDrive()),
        catchError(err => this.handleLoadError(err, 'Google Drive'))
      ).subscribe();
    } else if (currentConfig.storageProvider === 's3' && currentConfig.s3Credentials) {
      this.loadFromS3(currentConfig.s3Credentials).pipe(
        catchError(err => this.handleLoadError(err, 'S3'))
      ).subscribe();
    } else {
      this.loadFromLocalStorageOrDefault();
    }
  }

  private loadFromGoogleDrive(): Observable<AppConfig> {
    // ... (Google Drive loading logic remains the same)
    return from(
      this.googleApiService.drive.files.list({
        spaces: 'appDataFolder',
        fields: 'files(id, name)',
        q: `name='${CONFIG_FILE_NAME}'`
      })
    ).pipe(
      switchMap((response: any) => {
        const files = response.result.files;
        if (files && files.length > 0) {
          const fileId = files[0].id;
          return from(this.googleApiService.drive.files.get({ fileId: fileId, alt: 'media' }));
        } else {
          console.log(`${CONFIG_FILE_NAME} not found in Google Drive appDataFolder. Using defaults.`);
          this.configSubject.next(this.defaultConfig);
          return of(null);
        }
      }),
      map((response: any) => {
        if (response && response.body) {
          const loadedConfig = JSON.parse(response.body) as AppConfig;
          this.configSubject.next(loadedConfig);
          console.log('Configuration loaded from Google Drive:', loadedConfig);
          return loadedConfig;
        }
        return this.defaultConfig;
      }),
      catchError(error => {
        console.error('Error loading config from Google Drive:', error);
        this.configSubject.next(this.defaultConfig);
        return throwError(() => new Error('Failed to load config from Google Drive'));
      })
    );
  }

  private loadFromS3(credentials: S3Credentials): Observable<AppConfig> {
    const s3Client = new S3Client({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      }
    });
    const command = new GetObjectCommand({
      Bucket: credentials.bucketName,
      Key: CONFIG_FILE_NAME
    });

    return from(s3Client.send(command)).pipe(
      switchMap(async (response: any) => {
        if (response.Body) {
          const bodyString = await streamToString(response.Body);
          const loadedConfig = JSON.parse(bodyString) as AppConfig;
          this.configSubject.next(loadedConfig);
          console.log('Configuration loaded from S3:', loadedConfig);
          return loadedConfig;
        } else {
          console.warn(`${CONFIG_FILE_NAME} not found or empty in S3 bucket. Using defaults.`);
          this.configSubject.next(this.defaultConfig);
          return this.defaultConfig;
        }
      }),
      catchError(error => {
        console.error('Error loading config from S3:', error);
        if (error.name === 'NoSuchKey') {
            console.warn(`${CONFIG_FILE_NAME} not found in S3 bucket. Using defaults.`);
        }
        this.configSubject.next(this.defaultConfig); // Fallback to default on error
        return throwError(() => new Error(`Failed to load config from S3: ${error.message || error.name}`));
      })
    );
  }


  public saveConfig(configToSave: AppConfig): Observable<any> {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(configToSave));
      this.configSubject.next(configToSave);
      console.log('Configuration saved to localStorage:', configToSave);
    } catch (error) {
      console.error('Error saving configuration to localStorage.', error);
      return throwError(() => new Error('Failed to save to localStorage'));
    }

    if (configToSave.storageProvider === 'googleDrive') {
      // ... (Google Drive saving logic remains the same)
      if (!this.currentUser) {
        console.warn('User not logged in. Cannot save to Google Drive.');
        return throwError(() => new Error('User not logged in for Google Drive operation.'));
      }
      return this.googleApiService.gapiInitialized$.pipe(
        filter(initialized => initialized),
        first(),
        switchMap(() => {
          return from(
            this.googleApiService.drive.files.list({
              spaces: 'appDataFolder',
              fields: 'files(id, name)',
              q: `name='${CONFIG_FILE_NAME}'`
            })
          ).pipe(
            switchMap((response: any) => {
              const files = response.result.files;
              const content = JSON.stringify(configToSave);
              const metadata = {
                name: CONFIG_FILE_NAME,
                mimeType: 'application/json',
                parents: ['appDataFolder']
              };

              if (files && files.length > 0) {
                const fileId = files[0].id;
                return from(this.googleApiService.drive.files.update({
                  fileId: fileId,
                  resource: metadata,
                  media: { mimeType: 'application/json', body: content }
                }));
              } else {
                return from(this.googleApiService.drive.files.create({
                  resource: metadata,
                  media: { mimeType: 'application/json', body: content },
                  fields: 'id'
                }));
              }
            }),
            tap(() => console.log('Configuration saved to Google Drive.')),
            catchError(error => {
              console.error('Error saving config to Google Drive:', error);
              return throwError(() => new Error('Failed to save config to Google Drive'));
            })
          );
        }),
        catchError(error => {
             console.error('Error in Google Drive save sequence:', error);
             return throwError(() => error);
        })
      );
    } else if (configToSave.storageProvider === 's3' && configToSave.s3Credentials) {
      const s3Client = new S3Client({
        region: configToSave.s3Credentials.region,
        credentials: {
          accessKeyId: configToSave.s3Credentials.accessKeyId,
          secretAccessKey: configToSave.s3Credentials.secretAccessKey,
        }
      });
      const command = new PutObjectCommand({
        Bucket: configToSave.s3Credentials.bucketName,
        Key: CONFIG_FILE_NAME,
        Body: JSON.stringify(configToSave),
        ContentType: 'application/json'
      });
      return from(s3Client.send(command)).pipe(
        tap(() => console.log('Configuration saved to S3.')),
        catchError(error => {
          console.error('Error saving config to S3:', error);
          return throwError(() => new Error(`Failed to save config to S3: ${error.message || error.name}`));
        })
      );
    }
    return of({ message: 'Saved to local storage only.' });
  }

  public getCurrencySymbol(): Observable<string> {
    return this.config$.pipe(map(config => config.currencySymbol));
  }

  public setCurrencySymbol(symbol: string): Observable<any> {
    const currentConfig = this.configSubject.value;
    const newConfig: AppConfig = { ...currentConfig, currencySymbol: symbol };
    return this.saveConfig(newConfig).pipe(
      tap(() => console.log('Currency symbol updated and config saved.')),
      catchError(err => {
        console.error('Failed to save config after setting currency symbol:', err);
        return throwError(() => err); // Re-throw the error for the component to handle
      })
    );
  }

  public getStorageProvider(): Observable<StorageProvider> {
    return this.config$.pipe(map(config => config.storageProvider));
  }

  public setStorageProvider(provider: StorageProvider, s3CredentialsInput?: S3Credentials | null): Observable<any> {
    const currentConfig = this.configSubject.value;
    let newS3Credentials = currentConfig.s3Credentials;

    if (provider === 's3') {
      if (s3CredentialsInput) {
        newS3Credentials = s3CredentialsInput;
      } else if (!currentConfig.s3Credentials) { // If S3 is selected, but no new creds provided, and no old creds exist
        console.warn('S3 storage provider selected but no S3 credentials provided.');
        // Keep existing s3Credentials if any, otherwise set to null.
        // This case should ideally be validated in the component to ensure creds are provided if S3 is chosen.
        newS3Credentials = currentConfig.s3Credentials || null;
      }
      // If S3 is selected and s3CredentialsInput is null/undefined, but currentConfig.s3Credentials exist,
      // it implies we want to continue using the existing S3 credentials.
    } else { // Clear S3 credentials if provider is not S3
        newS3Credentials = null;
    }

    const newConfig: AppConfig = {
      ...currentConfig,
      storageProvider: provider,
      s3Credentials: newS3Credentials
    };
    return this.saveConfig(newConfig).pipe(
      tap(() => console.log('Storage provider updated and config saved.')),
      catchError(err => {
        console.error('Failed to save config after setting storage provider:', err);
        return throwError(() => err); // Re-throw the error for the component to handle
      })
    );
  }

  public getCurrentConfig(): AppConfig {
    return this.configSubject.value;
  }
}
