import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { ConfigService } from '../../../../core/services/config.service';
import { BehaviorSubject, of } from 'rxjs'; // Import `of` for ConfigService mock if needed

// PrimeNG Modules used in DashboardComponent template
import { CardModule } from 'primeng/card';
import { NoopAnimationsModule } from '@angular/platform-browser/animations'; // For animations

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockConfigService: Partial<ConfigService>; // Use Partial for easier mocking
  let currencySymbolSubject: BehaviorSubject<string>;

  beforeEach(async () => {
    currencySymbolSubject = new BehaviorSubject<string>('S/'); // Default for pipe

    mockConfigService = {
      getCurrencySymbol: jasmine.createSpy('getCurrencySymbol').and.returnValue(currencySymbolSubject.asObservable()),
      // Mock config$ if the component directly subscribes to it for other reasons
      // config$: new BehaviorSubject<AppConfig>({ storageProvider: null, s3Credentials: null, currencySymbol: 'S/' }),
    };

    await TestBed.configureTestingModule({
      declarations: [
        DashboardComponent,
        CurrencyFormatPipe // Declare the pipe as it's used in the template
      ],
      imports: [
        NoopAnimationsModule, // If Dashboard uses animated PrimeNG components
        CardModule 
      ],
      providers: [
        { provide: ConfigService, useValue: mockConfigService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges(); 
    expect(component).toBeTruthy();
  });

  it('should display amounts formatted with default currency symbol "S/" after OnInit and pipe processing', fakeAsync(() => {
    fixture.detectChanges(); // ngOnInit + initial pipe setup
    tick(); // Allow pipe to subscribe and get initial symbol
    fixture.detectChanges(); // Re-render with the symbol

    const compiled = fixture.nativeElement as HTMLElement;
    const amountElements = compiled.querySelectorAll('.item-value');
    
    // Adjust expected values based on how toLocaleString formats in test env (e.g. with or without comma)
    // For consistency, let's assume simple formatting for tests or normalize if needed.
    // The pipe uses `value.toLocaleString(undefined, { minimumFractionDigits, maximumFractionDigits })`
    // Default for toLocaleString in Node might differ from browser.
    // Using includes to be more flexible with comma.
    expect(amountElements[0]?.textContent).toContain('S/'); 
    expect(amountElements[0]?.textContent).toContain('12,345.67'); // component.someAmount
    expect(amountElements[1]?.textContent).toContain('S/765.43');   // component.anotherAmount
    expect(amountElements[2]?.textContent).toContain('S/-250.99');  // component.expenseAmount
  }));
  
  it('should display amounts formatted with a different currency symbol "$" when changed', fakeAsync(() => {
    currencySymbolSubject.next('$');
    fixture.detectChanges(); 
    tick(); 
    fixture.detectChanges(); 

    const compiled = fixture.nativeElement as HTMLElement;
    const amountElements = compiled.querySelectorAll('.item-value');
    expect(amountElements[0]?.textContent).toContain('$');
    expect(amountElements[0]?.textContent).toContain('12,345.67');
    expect(amountElements[1]?.textContent).toContain('$765.43');
  }));

  it('should display zeroAmount formatted', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const amountElements = compiled.querySelectorAll('.item-value');
    // Assuming zeroAmount is the 5th .item-value based on the template
    expect(amountElements[4]?.textContent).toContain('S/0.00');
  }));
  
  it('should display largeAmount formatted', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const amountElements = compiled.querySelectorAll('.item-value');
    // Assuming largeAmount is the 4th .item-value
    expect(amountElements[3]?.textContent).toContain('S/1,000,000.50');
  }));

  // Example of testing specific pipe arguments if used in template
  it('should display amount with 0 decimal places if pipe is used with :0:0', fakeAsync(() => {
    // Modify component data or template for this specific test if needed, or add a new property
    component.testAmountForZeroDecimals = 123.789;
    // Assume template has: <span class="zero-decimal-test">{{ testAmountForZeroDecimals | currencyFormat:0:0 }}</span>
    // For this test, we'll check the pipe directly as it's easier than modifying template for one case
    const pipe = new CurrencyFormatPipe(mockConfigService as ConfigService, fixture.changeDetectorRef);
    fixture.detectChanges(); // Ensure pipe is initialized with config
    tick();
    expect(pipe.transform(component.testAmountForZeroDecimals, 0, 0)).toBe('S/124');
  }));
});
