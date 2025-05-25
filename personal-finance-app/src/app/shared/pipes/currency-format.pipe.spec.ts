import { ChangeDetectorRef } from '@angular/core';
import { CurrencyFormatPipe } from './currency-format.pipe';
import { ConfigService } from '../../core/services/config.service';
import { BehaviorSubject } from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';

describe('CurrencyFormatPipe', () => {
  let pipe: CurrencyFormatPipe;
  let mockConfigService: Partial<ConfigService>; // Use Partial for easier mocking
  let mockCdRef: Partial<ChangeDetectorRef>;
  let currencySymbolSubject: BehaviorSubject<string>;

  beforeEach(() => {
    currencySymbolSubject = new BehaviorSubject<string>('S/'); // Default for tests

    mockConfigService = {
      // getCurrencySymbol: () => currencySymbolSubject.asObservable(), // Original
      // Updated to match actual ConfigService method signature
      getCurrencySymbol: jasmine.createSpy('getCurrencySymbol').and.returnValue(currencySymbolSubject.asObservable()),
    };

    mockCdRef = {
      markForCheck: jasmine.createSpy('markForCheck')
    };

    pipe = new CurrencyFormatPipe(mockConfigService as ConfigService, mockCdRef as ChangeDetectorRef);
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should format a positive number with default "S/" symbol', () => {
    expect(pipe.transform(123.45)).toBe('S/123.45');
  });

  it('should format a positive integer with default "S/" symbol and default decimals', () => {
    expect(pipe.transform(123)).toBe('S/123.00');
  });
  
  it('should format a positive integer with 0 decimal places when specified', () => {
    expect(pipe.transform(123, 0, 0)).toBe('S/123');
  });


  it('should format zero with default "S/" symbol', () => {
    expect(pipe.transform(0)).toBe('S/0.00');
  });

  it('should format a negative number with default "S/" symbol', () => {
    expect(pipe.transform(-123.45)).toBe('S/-123.45');
  });

  it('should handle null input by returning an empty string', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should handle undefined input by returning an empty string', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should handle NaN input by returning an empty string', () => {
    expect(pipe.transform(NaN)).toBe('');
  });

  it('should format with a different currency symbol ($) when ConfigService emits it', fakeAsync(() => {
    currencySymbolSubject.next('$');
    tick(); // Allow the subscription in the pipe to process the new symbol
    expect(pipe.transform(123.45)).toBe('$123.45');
    expect(mockCdRef.markForCheck).toHaveBeenCalled();
  }));

  it('should format with a different currency symbol (€) when ConfigService emits it', fakeAsync(() => {
    currencySymbolSubject.next('€');
    tick();
    expect(pipe.transform(50.00)).toBe('€50.00');
    expect(mockCdRef.markForCheck).toHaveBeenCalled();
  }));
  
  it('should use fallback symbol "S/" if ConfigService emits null or undefined symbol initially', fakeAsync(() => {
    // Test case for initial load with null/undefined if that's a possible scenario from ConfigService
    // Pipe's constructor initializes the subscription.
    // If ConfigService's BehaviorSubject could start with null/undefined before a real value.
    currencySymbolSubject.next(null as any);
    tick();
    // Recreate pipe to pick up new initial value if constructor logic is key
    // pipe = new CurrencyFormatPipe(mockConfigService as ConfigService, mockCdRef as ChangeDetectorRef);
    expect(pipe.transform(100)).toBe('S/100.00'); // Check against pipe's internal default or fallback logic

    currencySymbolSubject.next(undefined as any);
    tick();
    expect(pipe.transform(200)).toBe('S/200.00');
  }));

  describe('Fraction Digits', () => {
    it('should format with specified minimumFractionDigits (default max)', () => {
      // toLocaleString's default maximumFractionDigits is the greater of minimumFractionDigits and 3.
      expect(pipe.transform(123, 3)).toBe('S/123.000'); 
    });
    
    it('should format with specified minimumFractionDigits (explicit higher max)', () => {
       // If you want to ensure it *only* pads to min, max must also be set to min.
       // Otherwise, toLocaleString might use more if number has more significant digits.
       expect(pipe.transform(123.4, 3, 3)).toBe('S/123.400');
    });


    it('should format with specified minimum and maximumFractionDigits', () => {
      expect(pipe.transform(123.4567, 2, 3)).toBe('S/123.457'); // Rounds
      expect(pipe.transform(123.4, 2, 4)).toBe('S/123.40');   // Pads
    });
    
    it('should format with 0 minimum and maximumFractionDigits', () => {
        expect(pipe.transform(123.789, 0, 0)).toBe('S/124'); // Rounds to nearest integer
    });
  });

  it('should unsubscribe from currencySymbol observable on ngOnDestroy', () => {
    // Access the private property using bracket notation for testing
    const symbolSubscription = pipe['symbolSubscription'];
    spyOn(symbolSubscription, 'unsubscribe');
    pipe.ngOnDestroy();
    expect(symbolSubscription.unsubscribe).toHaveBeenCalled();
  });
});
