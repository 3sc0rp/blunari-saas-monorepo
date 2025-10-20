/**
 * Internationalization Settings Component
 * 
 * Settings section for currency, language, and timezone preferences.
 */

import React from 'react';
import { Globe, DollarSign, Clock, RefreshCw } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLocale } from '@/contexts/LocaleContext';
import { CurrencySwitcher } from '@/components/currency/CurrencySwitcher';
import { LocaleSwitcher } from '@/components/locale/LocaleSwitcher';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatExchangeRate } from '@/utils/currency';

export function InternationalizationSettings() {
  const { 
    currency, 
    exchangeRates, 
    isLoadingRates, 
    refreshRates 
  } = useCurrency();
  const { locale, direction, t } = useLocale();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Internationalization</h3>
        <p className="text-sm text-muted-foreground">
          Customize your language, currency, and regional settings.
        </p>
      </div>

      <Separator />

      {/* Currency Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Currency
          </CardTitle>
          <CardDescription>
            Select your preferred currency for displaying prices and amounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Preferred Currency</label>
            <CurrencySwitcher />
          </div>

          {/* Exchange Rate Info */}
          {exchangeRates && exchangeRates.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Exchange Rates</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshRates}
                  disabled={isLoadingRates}
                >
                  <RefreshCw className={cn(
                    "h-4 w-4 mr-2",
                    isLoadingRates && "animate-spin"
                  )} />
                  Refresh
                </Button>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {exchangeRates.slice(0, 5).map((rate) => (
                  <div key={`${rate.from_currency}-${rate.to_currency}`}>
                    {formatExchangeRate(
                      rate.from_currency,
                      rate.to_currency,
                      rate.rate
                    )}
                  </div>
                ))}
                {exchangeRates.length > 5 && (
                  <div className="italic">
                    +{exchangeRates.length - 5} more rates available
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Language & Locale
          </CardTitle>
          <CardDescription>
            Select your preferred language for the interface.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Preferred Language</label>
            <LocaleSwitcher />
          </div>

          {/* Current Locale Info */}
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Current locale: <code className="text-xs">{locale}</code></div>
            <div>Text direction: <code className="text-xs">{direction}</code></div>
          </div>
        </CardContent>
      </Card>

      {/* Timezone Settings (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timezone
          </CardTitle>
          <CardDescription>
            Set your timezone for scheduling and date/time displays.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Timezone selection will be implemented in a future update.
            Currently using browser timezone: <code className="text-xs">
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}
