import { Pipe, PipeTransform, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';

@Pipe({
  name: 'currencyFormat',
  standalone: false, // Set to false as it's declared in a module
  pure: false // Mark as impure because it depends on external state (currency symbol)
})
export class CurrencyFormatPipe implements PipeTransform, OnDestroy {
  private currencySymbol: string = 'S/'; // Default symbol
  private symbolSubscription!: Subscription;

  constructor(
    private configService: ConfigService,
    private cdRef: ChangeDetectorRef // Inject ChangeDetectorRef for impure pipes
  ) {
    // Initial load of the symbol and subscribe for changes
    this.symbolSubscription = this.configService.getCurrencySymbol().subscribe(symbol => {
      this.currencySymbol = symbol || 'S/'; // Fallback to default if symbol is null/undefined
      this.cdRef.markForCheck(); // Notify Angular that the pipe needs to be re-evaluated
    });
  }

  transform(value: number | null | undefined, minimumFractionDigits: number = 2, maximumFractionDigits: number = 2): string {
    if (value === null || value === undefined || isNaN(value)) {
      return ''; // Or handle as per requirement, e.g., return 'N/A' or the symbol with 0.00
    }

    const formattedValue = value.toLocaleString(undefined, {
      minimumFractionDigits: minimumFractionDigits,
      maximumFractionDigits: maximumFractionDigits
    });

    return `${this.currencySymbol}${formattedValue}`;
  }

  ngOnDestroy(): void {
    if (this.symbolSubscription) {
      this.symbolSubscription.unsubscribe();
    }
  }
}
