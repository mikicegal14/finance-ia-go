import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { ConfigService } from './config.service';
import { GoogleApiService } from './google-api.service';
import { SocialAuthService, SocialUser } from '@abacritt/angularx-social-login';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { of, ReplaySubject, throwError, Observable } from 'rxjs';
import { AppConfig, S3Credentials, StorageProvider } from '../models/app-config.model';

// --- Mocks ---
class MockSocialAuthService {
  authState = new ReplaySubject<SocialUser | null>(1);
  constructor() {
    this.authState.next(null); // Default to no user
  }
}

class MockGoogleApiService {
  gapiInitialized$ = new ReplaySubject<boolean>(1);
  drive = {
    files: {
      list: jasmine.createSpy('list').and.returnValue(Promise.resolve({ result: { files: [] } })),
      get: jasmine.createSpy('get').and.returnValue(Promise.resolve({ body: '{}' })), // Default to empty config
      create: jasmine.createSpy('create').and.returnValue(Promise.resolve({ result: { id: 'newFileId' } })),
      update: jasmine.createSpy('update').and.returnValue(Promise.resolve({ result: { id: 'updatedFileId' } }))
    }
  };
  constructor() {
    this.gapiInitialized$.next(false); // Default to GAPI not initialized
  }
}

const mockS3Send = jasmine.createSpy('s3Send');

// --- Test Suite ---
describe('ConfigService', () => {
  let service: ConfigService;
  let mockAuthService: MockSocialAuthService;
  let mockGapiService: MockGoogleApiService;

  const defaultConfig: AppConfig = {
    storageProvider: null,
    s3Credentials: null,
    currencySymbol: 'S/'
  };

  const mockUser: SocialUser = {
    provider: 'GOOGLE', id: '123', email: 'test@example.com', name: 'Test User',
    photoUrl: null, firstName: 'Test', lastName: 'User', authToken: 'mockAuthToken',
    idToken: 'mockIdToken', response: {}, scopes: []
  };

  const s3CredsMock: S3Credentials = {
    accessKeyId: 'testAccessKey',
    secretAccessKey: 'testSecretKey',
    region: 'us-east-1',
    bucketName: 'test-bucket'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ConfigService,
        { provide: SocialAuthService, useClass: MockSocialAuthService },
        { provide: GoogleApiService, useClass: MockGoogleApiService },
      ]
    });
    
    // Override S3Client specifically for tests (cannot use useClass with the actual S3Client)
    // This approach is a bit manual but ensures 'send' is a spy on the S3Client constructor
    // that ConfigService will use.
    const s3ClientProvider = TestBed.inject(S3Client, null!);
    if (s3ClientProvider) { // Check if S3Client was indeed provided/created by Angular's DI
        (s3ClientProvider as any).send = mockS3Send;
    }


    service = TestBed.inject(ConfigService);
    mockAuthService = TestBed.inject(SocialAuthService) as any;
    mockGapiService = TestBed.inject(GoogleApiService) as any;

    localStorage.clear();
    mockS3Send.calls.reset();
    mockGapiService.drive.files.list.calls.reset();
    mockGapiService.drive.files.get.calls.reset();
    mockGapiService.drive.files.create.calls.reset();
    mockGapiService.drive.files.update.calls.reset();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initial Configuration Loading', () => {
    it('should load default config if no localStorage and no user', fakeAsync(() => {
      mockAuthService.authState.next(null);
      tick(); // constructor async operations
      service.config$.subscribe(config => expect(config).toEqual(defaultConfig));
      flush();
    }));

    it('should load from localStorage if available and no user', fakeAsync(() => {
      const storedConfig: AppConfig = { ...defaultConfig, currencySymbol: '$' };
      localStorage.setItem('appConfig', JSON.stringify(storedConfig));
      
      // Reinitialize service to pick up localStorage change in constructor
      service = new ConfigService(TestBed.inject(GoogleApiService), TestBed.inject(SocialAuthService));
      mockAuthService.authState.next(null);
      tick();
      
      service.config$.subscribe(config => expect(config).toEqual(storedConfig));
      flush();
    }));
  });

  describe('localStorage interaction', () => {
    it('setCurrencySymbol should save to localStorage when no cloud provider', fakeAsync(() => {
      mockAuthService.authState.next(null);
      tick();
      service.setCurrencySymbol('€').subscribe();
      flush();
      const conf = JSON.parse(localStorage.getItem('appConfig') || '{}');
      expect(conf.currencySymbol).toBe('€');
    }));

    it('setStorageProvider (to null) should save to localStorage', fakeAsync(() => {
      mockAuthService.authState.next(null);
      tick();
      service.setStorageProvider(null).subscribe();
      flush();
      const conf = JSON.parse(localStorage.getItem('appConfig') || '{}');
      expect(conf.storageProvider).toBeNull();
    }));
  });


  describe('Google Drive Integration', () => {
    beforeEach(fakeAsync(() => {
      // Simulate user login and GAPI initialization
      mockAuthService.authState.next(mockUser);
      mockGapiService.gapiInitialized$.next(true);
      tick(); // process authState and gapiInitialized subscriptions
    }));

    it('setStorageProvider to "googleDrive" should trigger save and attempt GDrive load', fakeAsync(() => {
        const listSpy = mockGapiService.drive.files.list.and.returnValue(Promise.resolve({ result: { files: [] } })); // No file initially
        
        service.setStorageProvider('googleDrive').subscribe();
        flush(); // For setStorageProvider and subsequent saveConfig/loadConfig

        expect(localStorage.getItem('appConfig')).toContain('"storageProvider":"googleDrive"');
        // Expect GDrive load attempt (list files)
        expect(listSpy).toHaveBeenCalledWith(jasmine.objectContaining({ q: "name='config.json'" }));
    }));


    it('saveConfig to Google Drive should create file if not exists', fakeAsync(() => {
        mockGapiService.drive.files.list.and.returnValue(Promise.resolve({ result: { files: [] } })); // No file
        const createSpy = mockGapiService.drive.files.create.and.returnValue(Promise.resolve({ result: { id: 'newFileId' } }));
        
        const configToSave: AppConfig = { ...defaultConfig, storageProvider: 'googleDrive', currencySymbol: 'DRV$' };
        service.saveConfig(configToSave).subscribe();
        flush();

        expect(mockGapiService.drive.files.list).toHaveBeenCalled();
        expect(createSpy).toHaveBeenCalled();
        expect(mockGapiService.drive.files.update).not.toHaveBeenCalled();
    }));

    it('saveConfig to Google Drive should update file if exists', fakeAsync(() => {
        const existingFile = { id: 'driveFileId', name: 'config.json' };
        mockGapiService.drive.files.list.and.returnValue(Promise.resolve({ result: { files: [existingFile] } }));
        const updateSpy = mockGapiService.drive.files.update.and.returnValue(Promise.resolve({ result: { id: existingFile.id } }));

        const configToSave: AppConfig = { ...defaultConfig, storageProvider: 'googleDrive', currencySymbol: 'DRV_UPDATED$' };
        service.saveConfig(configToSave).subscribe();
        flush();
        
        expect(mockGapiService.drive.files.list).toHaveBeenCalled();
        expect(mockGapiService.drive.files.update).toHaveBeenCalled();
        expect(mockGapiService.drive.files.create).not.toHaveBeenCalled();
    }));

    it('loadConfig from Google Drive should parse and apply config', fakeAsync(() => {
        const driveConfig: AppConfig = { ...defaultConfig, storageProvider: 'googleDrive', currencySymbol: 'GD$' };
        const driveFile = { id: 'driveFileId', name: 'config.json' };
        mockGapiService.drive.files.list.and.returnValue(Promise.resolve({ result: { files: [driveFile] } }));
        mockGapiService.drive.files.get.and.returnValue(Promise.resolve({ body: JSON.stringify(driveConfig) }));

        // Set provider to trigger load in constructor/authState switchMap
        localStorage.setItem('appConfig', JSON.stringify({ storageProvider: 'googleDrive', currencySymbol: 'OLD' }));
        service = new ConfigService(mockGapiService, mockAuthService); // Reinitialize
        mockAuthService.authState.next(mockUser); // Trigger auth state
        mockGapiService.gapiInitialized$.next(true); // Trigger GAPI init
        flush();

        service.config$.subscribe(config => expect(config).toEqual(driveConfig));
        flush();
    }));

    it('loadConfig from Google Drive should fallback to defaults if API error', fakeAsync(() => {
        mockGapiService.drive.files.list.and.returnValue(Promise.reject('GAPI List Error'));
        localStorage.setItem('appConfig', JSON.stringify({ storageProvider: 'googleDrive' }));

        service = new ConfigService(mockGapiService, mockAuthService); // Reinitialize
        mockAuthService.authState.next(mockUser);
        mockGapiService.gapiInitialized$.next(true);
        flush();

        service.config$.subscribe(config => expect(config.currencySymbol).toEqual(defaultConfig.currencySymbol)); // Check a default value
        flush();
    }));
  });

  describe('AWS S3 Integration', () => {
    beforeEach(fakeAsync(() => {
      mockAuthService.authState.next(null); // S3 doesn't depend on Google User for auth in this app
      tick();
    }));

    it('setStorageProvider to "s3" should save to localStorage and attempt S3 load', fakeAsync(() => {
        mockS3Send.and.returnValue(mockS3NoSuchKeyError()); // Simulate file not found on S3 for initial load

        service.setStorageProvider('s3', s3CredsMock).subscribe();
        flush();

        expect(localStorage.getItem('appConfig')).toContain('"storageProvider":"s3"');
        // Expect S3 load attempt
        expect(mockS3Send).toHaveBeenCalled(); // GetObjectCommand
        const getCallArgs = mockS3Send.calls.mostRecent().args[0];
        expect(getCallArgs.input.Bucket).toBe(s3CredsMock.bucketName);
        expect(getCallArgs.input.Key).toBe('config.json');
    }));

    it('saveConfig to S3 should call PutObjectCommand', fakeAsync(() => {
        mockS3Send.and.returnValue(mockS3PutObjectResponse());
        const configToSave: AppConfig = { ...defaultConfig, storageProvider: 's3', s3Credentials: s3CredsMock, currencySymbol: 'S3$' };
        
        service.saveConfig(configToSave).subscribe();
        flush();

        expect(mockS3Send).toHaveBeenCalled();
        const sendArgs = mockS3Send.calls.mostRecent().args[0];
        expect(sendArgs.constructor.name).toBe('PutObjectCommand'); // Verify it's a PutObjectCommand
        expect(sendArgs.input.Bucket).toBe(s3CredsMock.bucketName);
        expect(sendArgs.input.Key).toBe('config.json');
        expect(sendArgs.input.Body).toBe(JSON.stringify(configToSave));
    }));

    it('loadConfig from S3 should parse and apply config', fakeAsync(() => {
        const s3Config: AppConfig = { ...defaultConfig, storageProvider: 's3', s3Credentials: s3CredsMock, currencySymbol: 'S3_LOADED$' };
        mockS3Send.and.returnValue(mockS3GetObjectResponse(s3Config));

        localStorage.setItem('appConfig', JSON.stringify({ storageProvider: 's3', s3Credentials: s3CredsMock }));
        service = new ConfigService(mockGapiService, mockAuthService); // Reinitialize
        mockAuthService.authState.next(null); // No Google user needed for S3
        flush();

        service.config$.subscribe(config => expect(config).toEqual(s3Config));
        flush();
    }));

    it('loadConfig from S3 should fallback to defaults if NoSuchKey error', fakeAsync(() => {
        mockS3Send.and.returnValue(mockS3NoSuchKeyError());
        localStorage.setItem('appConfig', JSON.stringify({ storageProvider: 's3', s3Credentials: s3CredsMock }));

        service = new ConfigService(mockGapiService, mockAuthService); // Reinitialize
        mockAuthService.authState.next(null);
        flush();
        
        service.config$.subscribe(config => expect(config.currencySymbol).toEqual(defaultConfig.currencySymbol));
        flush();
    }));
    
    it('loadConfig from S3 should fallback to defaults if other S3 API error', fakeAsync(() => {
        mockS3Send.and.returnValue(Promise.reject(new Error("S3 Generic Error")));
        localStorage.setItem('appConfig', JSON.stringify({ storageProvider: 's3', s3Credentials: s3CredsMock }));

        service = new ConfigService(mockGapiService, mockAuthService); // Reinitialize
        mockAuthService.authState.next(null);
        flush();
        
        service.config$.subscribe(config => expect(config.currencySymbol).toEqual(defaultConfig.currencySymbol));
        flush();
    }));
  });
  
  describe('Error Handling and Fallbacks', () => {
    it('should gracefully handle error when saving to Google Drive and not update config prematurely', fakeAsync(() => {
      mockAuthService.authState.next(mockUser);
      mockGapiService.gapiInitialized$.next(true);
      tick();

      mockGapiService.drive.files.list.and.returnValue(Promise.reject('GAPI Save Error'));
      const configToSave: AppConfig = { ...defaultConfig, storageProvider: 'googleDrive', currencySymbol: 'FAIL_DRV$' };
      
      let errorThrown = false;
      service.saveConfig(configToSave).subscribe({
        error: () => errorThrown = true
      });
      flush();

      expect(errorThrown).toBeTrue();
      // Config in BehaviorSubject should still be the one from localStorage (which was updated)
      // or default if localStorage fails.
      service.config$.subscribe(config => {
        expect(config.currencySymbol).not.toBe('FAIL_DRV$'); // Assuming local save worked before cloud attempt
        expect(config.storageProvider).toBe('googleDrive'); // This part of local save would have happened
      });
      flush();
    }));

    it('should gracefully handle error when saving to S3 and not update config prematurely on S3 error', fakeAsync(() => {
      mockS3Send.and.returnValue(Promise.reject(new Error('S3 Save Error')));
      const configToSave: AppConfig = { ...defaultConfig, storageProvider: 's3', s3Credentials: s3CredsMock, currencySymbol: 'FAIL_S3$' };

      let errorThrown = false;
      service.saveConfig(configToSave).subscribe({
        error: () => errorThrown = true
      });
      flush();

      expect(errorThrown).toBeTrue();
      service.config$.subscribe(config => {
        expect(config.currencySymbol).not.toBe('FAIL_S3$');
        expect(config.storageProvider).toBe('s3');
      });
      flush();
    }));
  });

});

// --- Mock Response Helpers ---
function mockS3GetObjectResponse(config: AppConfig) {
  const stream = new (require('stream').Readable)();
  stream._read = () => {}; // Noop
  stream.push(JSON.stringify(config));
  stream.push(null); // End of stream
  return Promise.resolve({ Body: stream });
}

function mockS3NoSuchKeyError() {
  const error = new Error("Simulated NoSuchKey error") as any;
  error.name = "NoSuchKey";
  return Promise.reject(error);
}

function mockS3PutObjectResponse() {
  return Promise.resolve({ ETag: '"mockEtag"' });
}
