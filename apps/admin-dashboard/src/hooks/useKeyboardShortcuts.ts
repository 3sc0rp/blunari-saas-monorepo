import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

/**
 * Hook to register keyboard shortcuts
 * 
 * @example
 * useKeyboardShortcuts([
 *   { key: 'Escape', description: 'Close modal', action: closeModal },
 *   { key: 's', ctrl: true, description: 'Save changes', action: handleSave },
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const matchesShift = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const matchesAlt = shortcut.alt ? event.altKey : !event.altKey;

        if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
          // Don't prevent default for Escape key (allows closing dialogs naturally)
          if (shortcut.key.toLowerCase() !== 'escape') {
            event.preventDefault();
          }
          
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  const showShortcutsHelp = useCallback(() => {
    const shortcutList = shortcuts
      .map((s) => {
        const keys: string[] = [];
        if (s.ctrl) keys.push('Ctrl');
        if (s.shift) keys.push('Shift');
        if (s.alt) keys.push('Alt');
        keys.push(s.key.toUpperCase());
        
        return `${keys.join('+')} - ${s.description}`;
      })
      .join('\n');

    toast({
      title: 'Keyboard Shortcuts',
      description: shortcutList,
    });
  }, [shortcuts, toast]);

  return { showShortcutsHelp };
}

/**
 * Common keyboard shortcuts for admin pages
 */
export function useCommonShortcuts(options: {
  onSave?: () => void;
  onRefresh?: () => void;
  onBack?: () => void;
  onHelp?: () => void;
}) {
  const navigate = useNavigate();

  const shortcuts: KeyboardShortcut[] = [];

  if (options.onBack) {
    shortcuts.push({
      key: 'Escape',
      description: 'Go back',
      action: options.onBack,
    });
  }

  if (options.onSave) {
    shortcuts.push({
      key: 's',
      ctrl: true,
      description: 'Save changes',
      action: options.onSave,
    });
  }

  if (options.onRefresh) {
    shortcuts.push({
      key: 'r',
      ctrl: true,
      description: 'Refresh data',
      action: options.onRefresh,
    });
  }

  if (options.onHelp) {
    shortcuts.push({
      key: '?',
      shift: true,
      description: 'Show shortcuts',
      action: options.onHelp,
    });
  }

  return useKeyboardShortcuts(shortcuts);
}
