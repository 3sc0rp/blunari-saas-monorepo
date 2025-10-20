/**
 * Currency Context
 * 
 * Provides currency state management and conversion functionality
 * across the application.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, CURRENCIES, type Currency } from '@/utils/currency';
import { toast } from 'sonner';

interface ExchangeRate {
  from_currency: string;
  to_currency: string;
  rate: number;
  fetched_at: string;
}

interface CurrencyContextType {
  // Current currency
  currency: string;
  setCurrency: (code: string) => void;
  
  // Available currencies
  availableCurrencies: Currency[];
  
  // Exchange rates
  exchangeRates: ExchangeRate[];
  isLoadingRates: boolean;
  
  // Conversion
  convertAmount: (amount: number, fromCurrency: string, toCurrency?: string) => number;
  
  // Formatting
  format: (amount: number, currencyCode?: string) => string;
  
  // Refresh rates
  refreshRates: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
  tenantId?: string;
  defaultCurrency?: string;
}

export function CurrencyProvider({ 
  children, 
  tenantId,
  defaultCurrency = 'USD' 
}: CurrencyProviderProps) {
  const [currency, setCurrencyState] = useState<string>(() => {
    // Try to get from localStorage first
    const stored = localStorage.getItem('preferred-currency');
    return stored || defaultCurrency;
  });

  // Fetch exchange rates
  const { 
    data: exchangeRates = [], 
    isLoading: isLoadingRates,
    refetch: refetchRates 
  } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currency_exchange_rates')
        .select('*')
        .gte('fetched_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('fetched_at', { ascending: false });

      if (error) {
        console.error('Error fetching exchange rates:', error);
        throw error;
      }

      return data as ExchangeRate[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  // Update localStorage when currency changes
  useEffect(() => {
    localStorage.setItem('preferred-currency', currency);
  }, [currency]);

  // Set currency with validation
  const setCurrency = (code: string) => {
    if (code in CURRENCIES) {
      setCurrencyState(code);
    } else {
      console.warn(`Invalid currency code: ${code}`);
      toast.error('Invalid currency selected');
    }
  };

  // Convert amount between currencies
  const convertAmount = (
    amount: number, 
    fromCurrency: string, 
    toCurrency?: string
  ): number => {
    const targetCurrency = toCurrency || currency;
    
    // Same currency, no conversion needed
    if (fromCurrency === targetCurrency) {
      return amount;
    }

    // Find exchange rate
    const rate = exchangeRates.find(
      r => r.from_currency === fromCurrency && r.to_currency === targetCurrency
    );

    if (rate) {
      return amount * rate.rate;
    }

    // Try inverse rate
    const inverseRate = exchangeRates.find(
      r => r.from_currency === targetCurrency && r.to_currency === fromCurrency
    );

    if (inverseRate) {
      return amount / inverseRate.rate;
    }

    // Try converting through USD
    if (fromCurrency !== 'USD' && targetCurrency !== 'USD') {
      const fromToUSD = exchangeRates.find(
        r => r.from_currency === fromCurrency && r.to_currency === 'USD'
      );
      const usdToTarget = exchangeRates.find(
        r => r.from_currency === 'USD' && r.to_currency === targetCurrency
      );

      if (fromToUSD && usdToTarget) {
        return amount * fromToUSD.rate * usdToTarget.rate;
      }
    }

    // No conversion available, return original amount
    console.warn(`No exchange rate found for ${fromCurrency} -> ${targetCurrency}`);
    return amount;
  };

  // Format currency
  const format = (amount: number, currencyCode?: string): string => {
    return formatCurrency(amount, currencyCode || currency);
  };

  // Refresh exchange rates
  const refreshRates = async () => {
    try {
      toast.info('Updating exchange rates...');
      
      // Call Edge Function to update rates
      const { data, error } = await supabase.functions.invoke('update-exchange-rates');
      
      if (error) throw error;
      
      // Refetch rates from database
      await refetchRates();
      
      toast.success('Exchange rates updated successfully');
    } catch (error) {
      console.error('Error refreshing rates:', error);
      toast.error('Failed to update exchange rates');
    }
  };

  const value: CurrencyContextType = {
    currency,
    setCurrency,
    availableCurrencies: Object.values(CURRENCIES),
    exchangeRates,
    isLoadingRates,
    convertAmount,
    format,
    refreshRates,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
