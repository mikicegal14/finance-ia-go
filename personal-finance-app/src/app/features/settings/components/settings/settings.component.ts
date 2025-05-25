import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms'; // Import ReactiveFormsModule, FormsModule
import { Subscription, of } from 'rxjs'; // Added 'of'
import { switchMap } from 'rxjs/operators'; // Added 'switchMap'
import { ConfigService } from '../../../../core/services/config.service';
import { AppConfig, StorageProvider, S3Credentials } from '../../../../core/models/app-config.model';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common'; // Added CommonModule
import { CardModule } from 'primeng/card';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  providers: [MessageService],
  standalone: true, // Added standalone: true
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule, // Added FormsModule for [(ngModel)]
    CardModule,
    SelectButtonModule,
    InputTextModule,
    DropdownModule,
    ButtonModule,
    ToastModule
  ]
})
export class SettingsComponent implements OnInit, OnDestroy {
  settingsForm!: FormGroup; // Use definite assignment assertion
  storageOptions: { name: string, value: StorageProvider }[] = [ // Typed the array
    { name: 'None', value: null },
    { name: 'Google Drive', value: 'googleDrive' as StorageProvider }, // Cast to StorageProvider
    { name: 'AWS S3', value: 's3' as StorageProvider } // Cast to StorageProvider
  ];
  commonCurrencies = [
    { label: 'S/ (Sol)', value: 'S/' },
    { label: '$ (Dollar)', value: '$' },
    { label: '€ (Euro)', value: '€' },
    { label: '£ (Pound)', value: '£' },
    { label: '¥ (Yen)', value: '¥' }
  ];
  selectedStorageProvider: StorageProvider = null;
  s3Credentials: S3Credentials = { accessKeyId: '', secretAccessKey: '', region: '', bucketName: '' };

  private configSubscription!: Subscription;

  constructor(
    private configService: ConfigService,
    private fb: FormBuilder,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // Initialize the form in ngOnInit as FormBuilder is injected
    this.settingsForm = this.fb.group({
      storageProvider: [null as StorageProvider], // Initialize with type
      s3AccessKeyId: [''],
      s3SecretAccessKey: [''],
      s3Region: [''],
      s3BucketName: [''],
      currencySymbol: ['', Validators.required]
    });

    this.configSubscription = this.configService.config$.subscribe(config => {
      this.selectedStorageProvider = config.storageProvider;
      this.s3Credentials = config.s3Credentials ? { ...config.s3Credentials } : { accessKeyId: '', secretAccessKey: '', region: '', bucketName: '' };

      this.settingsForm.patchValue({
        storageProvider: this.selectedStorageProvider,
        s3AccessKeyId: this.s3Credentials.accessKeyId,
        s3SecretAccessKey: this.s3Credentials.secretAccessKey,
        s3Region: this.s3Credentials.region,
        s3BucketName: this.s3Credentials.bucketName,
        currencySymbol: config.currencySymbol
      });
      // Trigger onStorageProviderChange after patching value from config
      this.onStorageProviderChange(this.selectedStorageProvider);
    });
  }

  onStorageProviderChange(provider?: StorageProvider | null): void { // Accept optional provider argument
    const currentProvider = provider !== undefined ? provider : this.settingsForm.get('storageProvider')?.value;
    const s3Controls = [
      this.settingsForm.get('s3AccessKeyId'),
      this.settingsForm.get('s3SecretAccessKey'),
      this.settingsForm.get('s3Region'),
      this.settingsForm.get('s3BucketName')
    ];

    if (currentProvider === 's3') {
      s3Controls.forEach(control => control?.setValidators([Validators.required]));
    } else {
      s3Controls.forEach(control => {
        control?.clearValidators();
        control?.setValue('');
      });
    }
    s3Controls.forEach(control => control?.updateValueAndValidity());
  }

  saveSettings(): void {
    if (this.settingsForm.invalid) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Please fill in all required fields correctly.' });
      this.settingsForm.markAllAsTouched();
      return;
    }

    const formValues = this.settingsForm.value;

    // Directly use the values from form for storage provider and S3 credentials
    const providerToSave = formValues.storageProvider as StorageProvider;
    const s3CredsToSave: S3Credentials | null = providerToSave === 's3' ? {
      accessKeyId: formValues.s3AccessKeyId,
      secretAccessKey: formValues.s3SecretAccessKey,
      region: formValues.s3Region,
      bucketName: formValues.s3BucketName
    } : null;

    this.configService.setCurrencySymbol(formValues.currencySymbol).pipe(
      switchMap(() => this.configService.setStorageProvider(providerToSave, s3CredsToSave))
    ).subscribe({
      next: () => {
        const currentConfig = this.configService.getCurrentConfig();
        this.selectedStorageProvider = currentConfig.storageProvider; // Update local state if needed
        this.s3Credentials = currentConfig.s3Credentials ? { ...currentConfig.s3Credentials } : { accessKeyId: '', secretAccessKey: '', region: '', bucketName: '' };
        this.settingsForm.patchValue({ // Re-patch form to reflect saved state, especially if S3 was deselected
            storageProvider: this.selectedStorageProvider,
            s3AccessKeyId: this.s3Credentials.accessKeyId,
            s3SecretAccessKey: this.s3Credentials.secretAccessKey,
            s3Region: this.s3Credentials.region,
            s3BucketName: this.s3Credentials.bucketName,
        });
        this.onStorageProviderChange(this.selectedStorageProvider); // Ensure validators are correct after save

        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Settings saved successfully!' });
        console.log('Settings saved:', currentConfig);
      },
      error: (err: any) => { // Explicitly type err as any
        console.error('Failed to save settings:', err);
        this.messageService.add({ severity: 'error', summary: 'Error Saving Settings', detail: err.message || 'An error occurred' });
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
