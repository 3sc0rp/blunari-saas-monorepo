/**
 * Currency Switcher Component
 * 
 * Dropdown for selecting currency preference.
 * Updates CurrencyContext on change.
 */

import React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function CurrencySwitcher() {
  const { currency, setCurrency, availableCurrencies } = useCurrency();
  const [open, setOpen] = React.useState(false);

  const currentCurrency = availableCurrencies.find((c) => c.code === currency);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <span className="text-lg">{currentCurrency?.symbol}</span>
            <span>{currency}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search currency..." />
          <CommandEmpty>No currency found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {availableCurrencies.map((curr) => (
              <CommandItem
                key={curr.code}
                value={curr.code}
                onSelect={(currentValue) => {
                  setCurrency(currentValue.toUpperCase());
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    currency === curr.code ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="mr-2 text-lg">{curr.symbol}</span>
                <div className="flex flex-col">
                  <span className="font-medium">{curr.code}</span>
                  <span className="text-sm text-muted-foreground">
                    {curr.name}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
