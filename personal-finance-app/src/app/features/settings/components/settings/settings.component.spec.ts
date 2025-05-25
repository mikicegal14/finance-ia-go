import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SettingsComponent } from './settings.component';
import { ConfigService } from '../../../../core/services/config.service';
import { MessageService } from 'primeng/api';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AppConfig, S3Credentials, StorageProvider } from '../../../../core/models/app-config.model';

// PrimeNG Modules for the template
import { CardModule } from 'primeng/card';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { NoopAnimationsModule } from '@angular/platform-browser/animations'; // To prevent animation errors

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let mockConfigService: any;
  let mockMessageService: any;
  let configSubject: BehaviorSubject<AppConfig>;

  const defaultConfig: AppConfig = {
    storageProvider: null,
    s3Credentials: null,
    currencySymbol: 'S/'
  };
  
  const s3CredsMock: S3Credentials = {
    accessKeyId: 'testAccessKey',
    secretAccessKey: 'testSecretKey',
    region: 'us-east-1',
    bucketName: 'test-bucket'
  };

  beforeEach(async () => {
    configSubject = new BehaviorSubject<AppConfig>({...defaultConfig});

    mockConfigService = {
      config$: configSubject.asObservable(),
      getCurrentConfig: jasmine.createSpy('getCurrentConfig').and.callFake(() => configSubject.value),
      setCurrencySymbol: jasmine.createSpy('setCurrencySymbol').and.returnValue(of({})), // Default to success
      setStorageProvider: jasmine.createSpy('setStorageProvider').and.returnValue(of({})) // Default to success
    };

    mockMessageService = {
      add: jasmine.createSpy('add')
    };

    await TestBed.configureTestingModule({
      declarations: [SettingsComponent],
      imports: [
        ReactiveFormsModule,
        NoopAnimationsModule, 
        CardModule,
        SelectButtonModule,
        InputTextModule,
        DropdownModule,
        ButtonModule,
        ToastModule
      ],
      providers: [
        FormBuilder,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MessageService, useValue: mockMessageService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    // fixture.detectChanges(); // ngOnInit is triggered here
  });

  it('should create', () => {
    fixture.detectChanges(); // Manually trigger ngOnInit
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values from ConfigService on ngOnInit', fakeAsync(() => {
    const initialConf: AppConfig = { storageProvider: null, s3Credentials: null, currencySymbol: '$' };
    configSubject.next(initialConf); // Emit initial config
    
    fixture.detectChanges(); // Trigger ngOnInit
    tick(); // Settle subscriptions
    
    expect(component.settingsForm.get('currencySymbol')?.value).toBe('$');
    expect(component.settingsForm.get('storageProvider')?.value).toBeNull();
  }));
  
  it('should update form when configService emits new values after initialization', fakeAsync(() => {
    fixture.detectChanges(); // Initial ngOnInit
    tick();

    const updatedConf: AppConfig = { storageProvider: 's3', s3Credentials: s3CredsMock, currencySymbol: '€' };
    configSubject.next(updatedConf);
    tick();
    fixture.detectChanges(); // Reflect change in component properties bound to form

    expect(component.settingsForm.get('currencySymbol')?.value).toBe('€');
    expect(component.settingsForm.get('storageProvider')?.value).toBe('s3');
    expect(component.settingsForm.get('s3AccessKeyId')?.value).toBe(s3CredsMock.accessKeyId);
  }));


  describe('Currency Symbol Change', () => {
    it('should call ConfigService.setCurrencySymbol on saveSettings', fakeAsync(() => {
      fixture.detectChanges(); // ngOnInit
      tick();

      component.settingsForm.get('currencySymbol')?.setValue('€');
      component.saveSettings();
      tick(); // For async operations within saveSettings

      expect(mockConfigService.setCurrencySymbol).toHaveBeenCalledWith('€');
      expect(mockMessageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    }));
  });

  describe('Storage Provider Change and S3 Credentials', () => {
    beforeEach(fakeAsync(() => {
        fixture.detectChanges(); // ngOnInit
        tick();
    }));

    it('should make S3 fields visible and required when S3 is selected from dropdown', fakeAsync(() => {
      component.settingsForm.get('storageProvider')?.setValue('s3');
      // component.onStorageProviderChange(); // This is key for reactive forms
      fixture.detectChanges(); // For the component's selectedStorageProvider to update if it was bound directly
      tick(); // Allow UI to settle if there were async operations tied to this (e.g. valueChanges)

      // Manually call onStorageProviderChange because p-selectButton's (onChange) event triggers it.
      // In tests, we need to simulate this if not directly testing the p-selectButton interaction.
      component.onStorageProviderChange();
      fixture.detectChanges();


      expect(component.settingsForm.get('s3AccessKeyId')?.hasValidator(Validators.required)).toBeTrue();
      expect(component.settingsForm.get('s3SecretAccessKey')?.hasValidator(Validators.required)).toBeTrue();
      
      // Check template visibility (more of an integration test aspect, but good for sanity)
      component.selectedStorageProvider = 's3'; // Ensure this is set for *ngIf
      fixture.detectChanges();
      const s3FormElement = fixture.debugElement.nativeElement.querySelector('.s3-credentials-form');
      expect(s3FormElement).not.toBeNull();
    }));

    it('should clear S3 fields and remove validators when provider is changed from S3 to null', fakeAsync(() => {
      // First, set to S3 and populate
      component.settingsForm.get('storageProvider')?.setValue('s3');
      component.onStorageProviderChange();
      component.settingsForm.get('s3AccessKeyId')?.setValue('test-key');
      fixture.detectChanges();
      tick();

      // Then, change to null
      component.settingsForm.get('storageProvider')?.setValue(null);
      component.onStorageProviderChange(); // Crucial for validator update
      fixture.detectChanges();
      tick();
      
      expect(component.settingsForm.get('s3AccessKeyId')?.value).toBe('');
      expect(component.settingsForm.get('s3AccessKeyId')?.hasValidator(Validators.required)).toBeFalse();
    }));

    it('should call ConfigService.setStorageProvider on saveSettings with S3 details', fakeAsync(() => {
      component.settingsForm.patchValue({
        storageProvider: 's3',
        s3AccessKeyId: 's3key',
        s3SecretAccessKey: 's3secret',
        s3Region: 'us-west-2',
        s3BucketName: 'mybucket',
        currencySymbol: '$'
      });
      component.onStorageProviderChange(); // Ensure validators are correct

      component.saveSettings();
      tick();

      const expectedS3Creds: S3Credentials = {
        accessKeyId: 's3key',
        secretAccessKey: 's3secret',
        region: 'us-west-2',
        bucketName: 'mybucket'
      };
      expect(mockConfigService.setStorageProvider).toHaveBeenCalledWith('s3', expectedS3Creds);
      expect(mockMessageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    }));
    
    it('should call ConfigService.setStorageProvider with null for S3 creds if "None" is selected', fakeAsync(() => {
      component.settingsForm.get('storageProvider')?.setValue(null);
      component.onStorageProviderChange();
      component.saveSettings();
      tick();
      expect(mockConfigService.setStorageProvider).toHaveBeenCalledWith(null, null);
    }));
  });

  describe('Save Operation Feedback', () => {
     beforeEach(fakeAsync(() => {
        fixture.detectChanges(); // ngOnInit
        tick();
    }));

    it('should show error message if form is invalid (e.g. currency symbol empty)', () => {
      component.settingsForm.get('currencySymbol')?.setValue(''); // Make it invalid
      component.saveSettings();
      // No tick needed as this path is synchronous before observable calls
      expect(mockMessageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'Please fill in all required fields correctly.' }));
    });
    
    it('should show error message if S3 is selected but S3 fields are empty', () => {
      component.settingsForm.patchValue({
        storageProvider: 's3',
        currencySymbol: '$',
        s3AccessKeyId: '' // Invalid
      });
      component.onStorageProviderChange(); // This will set the required validators
      component.saveSettings();
      expect(mockMessageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'Please fill in all required fields correctly.' }));
    });


    it('should show error message if ConfigService.setStorageProvider (via saveConfig) fails', fakeAsync(() => {
      mockConfigService.setStorageProvider.and.returnValue(throwError(() => new Error('S3 Prov Save Failed')));
      
      component.settingsForm.patchValue({
        storageProvider: 's3', // Assume valid S3 form for this test's focus
        s3AccessKeyId: 's3key',
        s3SecretAccessKey: 's3secret',
        s3Region: 'us-west-2',
        s3BucketName: 'mybucket',
        currencySymbol: '$'
      });
      component.onStorageProviderChange();
      
      component.saveSettings();
      tick(); 
      
      expect(mockMessageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', summary: 'Error Saving Settings', detail: 'S3 Prov Save Failed' }));
    }));

    it('should show error message if ConfigService.setCurrencySymbol (via saveConfig) fails', fakeAsync(() => {
      mockConfigService.setCurrencySymbol.and.returnValue(throwError(() => new Error('Currency Save Failed')));
      
      component.settingsForm.patchValue({
        storageProvider: null, // No storage provider issues for this test
        currencySymbol: '$'
      });
      
      component.saveSettings();
      tick();
      
      expect(mockMessageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', summary: 'Error Saving Settings', detail: 'Currency Save Failed' }));
    }));
  });
  
  it('should load S3 credentials into form if they exist in initial config', fakeAsync(() => {
    const s3Config: AppConfig = {
      storageProvider: 's3',
      s3Credentials: s3CredsMock,
      currencySymbol: 'S/'
    };
    configSubject.next(s3Config);
    fixture.detectChanges(); // ngOnInit
    tick(); // Settle subscriptions
    fixture.detectChanges(); // Settle UI after form patchValue

    expect(component.settingsForm.get('s3AccessKeyId')?.value).toBe(s3CredsMock.accessKeyId);
    expect(component.settingsForm.get('s3SecretAccessKey')?.value).toBe(s3CredsMock.secretAccessKey);
    expect(component.settingsForm.get('s3Region')?.value).toBe(s3CredsMock.region);
    expect(component.settingsForm.get('s3BucketName')?.value).toBe(s3CredsMock.bucketName);
  }));

  it('should correctly update selectedStorageProvider for template *ngIf on init', fakeAsync(() => {
    const s3Config: AppConfig = { ...defaultConfig, storageProvider: 's3', s3Credentials: s3CredsMock };
    configSubject.next(s3Config);
    fixture.detectChanges(); // ngOnInit
    tick();
    fixture.detectChanges(); // UI update

    expect(component.selectedStorageProvider).toBe('s3');
    const s3FormElement = fixture.debugElement.nativeElement.querySelector('.s3-credentials-form');
    expect(s3FormElement).not.toBeNull();
  }));
});
