/**
 * Locale Switcher Component
 * 
 * Dropdown for selecting language/locale preference.
 * Updates LocaleContext and i18next on change.
 */

import React from 'react';
import { Check, ChevronsUpDown, Globe } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
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

// Flag emoji map for countries
const FLAG_EMOJI: Record<string, string> = {
  'en-US': '🇺🇸',
  'en-GB': '🇬🇧',
  'es-ES': '🇪🇸',
  'es-MX': '🇲🇽',
  'fr-FR': '🇫🇷',
  'de-DE': '🇩🇪',
  'it-IT': '🇮🇹',
  'pt-BR': '🇧🇷',
  'ja-JP': '🇯🇵',
  'zh-CN': '🇨🇳',
  'ar-SA': '🇸🇦',
  'he-IL': '🇮🇱',
};

export function LocaleSwitcher() {
  const { locale, setLocale, availableLocales, direction } = useLocale();
  const [open, setOpen] = React.useState(false);

  const currentLocale = availableLocales.find((l) => l.code === locale);

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
            <span className="text-lg">
              {FLAG_EMOJI[locale] || <Globe className="h-4 w-4" />}
            </span>
            <span>{currentLocale?.name || locale}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align={direction === 'rtl' ? 'end' : 'start'}>
        <Command>
          <CommandInput placeholder="Search language..." />
          <CommandEmpty>No language found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {availableLocales.map((loc) => (
              <CommandItem
                key={loc.code}
                value={loc.code}
                onSelect={(currentValue) => {
                  setLocale(currentValue);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    locale === loc.code ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="mr-2 text-lg">
                  {FLAG_EMOJI[loc.code] || <Globe className="h-4 w-4" />}
                </span>
                <div className="flex flex-col">
                  <span className="font-medium">{loc.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {loc.language} ({loc.country})
                    {loc.direction === 'rtl' && ' • RTL'}
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
