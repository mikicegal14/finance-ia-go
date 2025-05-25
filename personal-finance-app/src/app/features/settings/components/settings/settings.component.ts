import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms'; // Import
import { Subscription } from 'rxjs';
import { ConfigService } from '../../../../core/services/config.service';
import { AppConfig, StorageProvider, S3Credentials } from '../../../../core/models/app-config.model';
import { MessageService } from 'primeng/api'; // For Toast messages

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  providers: [MessageService] // Add MessageService here if not provided globally
})
export class SettingsComponent implements OnInit, OnDestroy {
  settingsForm: FormGroup; // Use FormGroup for better form management
  storageOptions = [
    { name: 'None', value: null },
    { name: 'Google Drive', value: 'googleDrive' },
    { name: 'AWS S3', value: 's3' }
  ];
  // Define common currencies for the dropdown
  commonCurrencies = [
    { label: 'S/ (Sol)', value: 'S/' },
    { label: '$ (Dollar)', value: '$' },
    { label: '€ (Euro)', value: '€' },
    { label: '£ (Pound)', value: '£' },
    { label: '¥ (Yen)', value: '¥' }
  ];
  selectedStorageProvider: StorageProvider = null;
  s3Credentials: S3Credentials = { accessKeyId: '', secretAccessKey: '', region: '', bucketName: '' };
  // currencySymbol class property is not strictly needed as form control handles it.
  // It can be kept if direct binding [(ngModel)] was used, but with reactive forms, it's less critical.

  private configSubscription!: Subscription;

  constructor(
    private configService: ConfigService,
    private fb: FormBuilder, // Inject FormBuilder
    private messageService: MessageService
  ) {
    // Initialize the form
    this.settingsForm = this.fb.group({
      storageProvider: [null],
      s3AccessKeyId: [''],
      s3SecretAccessKey: [''],
      s3Region: [''],
      s3BucketName: [''],
      currencySymbol: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.configSubscription = this.configService.config$.subscribe(config => {
      this.selectedStorageProvider = config.storageProvider;
      this.s3Credentials = config.s3Credentials ? { ...config.s3Credentials } : { accessKeyId: '', secretAccessKey: '', region: '', bucketName: '' };
      // this.currencySymbol = config.currencySymbol; // Value now primarily managed by form

      // Update form values
      this.settingsForm.patchValue({
        storageProvider: this.selectedStorageProvider,
        s3AccessKeyId: this.s3Credentials.accessKeyId,
        s3SecretAccessKey: this.s3Credentials.secretAccessKey,
        s3Region: this.s3Credentials.region,
        s3BucketName: this.s3Credentials.bucketName,
        currencySymbol: config.currencySymbol // Directly use config value here
      });

      this.onStorageProviderChange(); // To set validators based on initial value
    });
  }

  onStorageProviderChange(): void {
    const s3Controls = [
      this.settingsForm.get('s3AccessKeyId'),
      this.settingsForm.get('s3SecretAccessKey'),
      this.settingsForm.get('s3Region'),
      this.settingsForm.get('s3BucketName')
    ];

    if (this.settingsForm.get('storageProvider')?.value === 's3') {
      s3Controls.forEach(control => {
        control?.setValidators([Validators.required]);
      });
    } else {
      s3Controls.forEach(control => {
        control?.clearValidators();
        control?.setValue(''); // Optionally clear values when S3 is not selected
      });
    }
    s3Controls.forEach(control => control?.updateValueAndValidity());
  }

  saveSettings(): void {
    if (this.settingsForm.invalid) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Please fill in all required fields correctly.' });
      // Mark all fields as touched to show validation errors
      this.settingsForm.markAllAsTouched();
      return;
    }

    const formValues = this.settingsForm.value;
    let saveObservable = of(null); // Default to an observable that completes immediately

    // Chain the observables for setting currency and storage provider
    saveObservable = this.configService.setCurrencySymbol(formValues.currencySymbol).pipe(
      switchMap(() => {
        const s3Creds: S3Credentials | null = formValues.storageProvider === 's3' ? {
          accessKeyId: formValues.s3AccessKeyId,
          secretAccessKey: formValues.s3SecretAccessKey,
          region: formValues.s3Region,
          bucketName: formValues.s3BucketName
        } : null;
        return this.configService.setStorageProvider(formValues.storageProvider, s3Creds);
      })
    );

    saveObservable.subscribe({
      next: () => {
        // Update local component state from potentially modified config
        const currentConfig = this.configService.getCurrentConfig();
        this.selectedStorageProvider = currentConfig.storageProvider;
        this.s3Credentials = currentConfig.s3Credentials ? { ...currentConfig.s3Credentials } : { accessKeyId: '', secretAccessKey: '', region: '', bucketName: '' };
        
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Settings saved successfully!' });
        console.log('Settings saved:', currentConfig);
      },
      error: (err) => {
        console.error('Failed to save settings:', err);
        let detail = 'An error occurred while saving settings.';
        if (err && err.message) {
          detail = err.message;
        }
        this.messageService.add({ severity: 'error', summary: 'Error Saving Settings', detail: detail });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.configSubscription) {
      this.configSubscription.unsubscribe();
    }
  }

  // Helper to get form controls in the template easily (optional)
  get f() { return this.settingsForm.controls; }
}
