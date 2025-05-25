import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TransactionListComponent } from './transaction-list.component';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { ConfigService } from '../../../../core/services/config.service';
import { BehaviorSubject } from 'rxjs';

// PrimeNG Modules used in TransactionListComponent template
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('TransactionListComponent', () => {
  let component: TransactionListComponent;
  let fixture: ComponentFixture<TransactionListComponent>;
  let mockConfigService: Partial<ConfigService>;
  let currencySymbolSubject: BehaviorSubject<string>;

  beforeEach(async () => {
    currencySymbolSubject = new BehaviorSubject<string>('S/'); // Default for pipe

    mockConfigService = {
      getCurrencySymbol: jasmine.createSpy('getCurrencySymbol').and.returnValue(currencySymbolSubject.asObservable()),
    };

    await TestBed.configureTestingModule({
      declarations: [
        TransactionListComponent,
        CurrencyFormatPipe // Declare the pipe
      ],
      imports: [
        NoopAnimationsModule,
        TableModule,
        TagModule
      ],
      providers: [
        { provide: ConfigService, useValue: mockConfigService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionListComponent);
    component = fixture.componentInstance;
    // ngOnInit is called by fixture.detectChanges()
  });

  it('should create', () => {
    fixture.detectChanges(); // Call ngOnInit
    expect(component).toBeTruthy();
  });

  it('should display transactions with amounts formatted with default currency symbol "S/"', fakeAsync(() => {
    fixture.detectChanges(); // ngOnInit, populates mockTransactions
    tick(); // Pipe subscription for currency symbol
    fixture.detectChanges(); // Update view with formatted amounts

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('p-table table tbody tr');
    expect(rows.length).toBe(component.mockTransactions.length);

    const firstTransactionAmountCell = rows[0].querySelectorAll('td')[2]; // 3rd column is Amount
    expect(firstTransactionAmountCell?.textContent).toContain('S/');
    expect(firstTransactionAmountCell?.textContent).toContain('5,000.00');

    const secondTransactionAmountCell = rows[1].querySelectorAll('td')[2];
    expect(secondTransactionAmountCell?.textContent).toContain('S/');
    expect(secondTransactionAmountCell?.textContent).toContain('-75.50');
  }));

  it('should update currency symbol in displayed amounts when ConfigService emits new symbol', fakeAsync(() => {
    fixture.detectChanges(); 
    tick();
    fixture.detectChanges();

    currencySymbolSubject.next('$');
    tick(); 
    fixture.detectChanges(); 

    const compiled = fixture.nativeElement as HTMLElement;
    const firstTransactionAmountCell = compiled.querySelectorAll('p-table table tbody tr')[0].querySelectorAll('td')[2];
    expect(firstTransactionAmountCell?.textContent).toContain('$');
    expect(firstTransactionAmountCell?.textContent).toContain('5,000.00');
  }));
  
  it('should display correct date format (yyyy-MM-dd)', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const firstTransactionDateCell = compiled.querySelectorAll('p-table table tbody tr')[0].querySelectorAll('td')[0];
    // mockTransactions[0].date: new Date('2024-05-20')
    expect(firstTransactionDateCell?.textContent?.trim()).toBe('2024-05-20'); 
  }));
  
  it('should display correct tag severity for income and expense types', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    
    // First transaction: income
    const firstTransactionTypeCell = compiled.querySelectorAll('p-table table tbody tr')[0].querySelectorAll('td')[3];
    const firstTagElement = firstTransactionTypeCell?.querySelector('p-tag .p-tag');
    expect(firstTagElement).toBeTruthy();
    expect(firstTagElement?.classList).toContain('p-tag-success');
    expect(firstTagElement?.textContent?.trim()).toBe('income');

    // Second transaction: expense
    const secondTransactionTypeCell = compiled.querySelectorAll('p-table table tbody tr')[1].querySelectorAll('td')[3];
    const secondTagElement = secondTransactionTypeCell?.querySelector('p-tag .p-tag');
    expect(secondTagElement).toBeTruthy();
    expect(secondTagElement?.classList).toContain('p-tag-danger');
    expect(secondTagElement?.textContent?.trim()).toBe('expense');
  }));

  it('should display "No transactions found." when mockTransactions is empty', fakeAsync(() => {
    component.mockTransactions = [];
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const emptyMessageRow = compiled.querySelector('p-table table tbody tr td[colspan="4"]');
    expect(emptyMessageRow).toBeTruthy();
    expect(emptyMessageRow?.textContent?.trim()).toBe('No transactions found.');
  }));
});
