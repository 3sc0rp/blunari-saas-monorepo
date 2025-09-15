import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { safeStorage, inSandboxedIframe } from '@/utils/safeStorage';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Settings2 as Settings,
  Calendar,
  ChefHat,
  Eye,
  BarChart3,
  Code2 as Code,
  Copy,
  Loader2,
  Save,
  RotateCcw,
  Download,
  Upload,
  Palette,
  Type,
  Layout,
  Zap,
  Monitor,
  Smartphone,
  Tablet,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Check,
  ExternalLink,
  Mail,
  Camera,
} from 'lucide-react';
import { useWidgetConfig } from '@/widgets/management/useWidgetConfig';
import { 
  WidgetConfig, 
  WidgetAnalytics, 
  WidgetFontFamily, 
  BookingSource 
} from '@/widgets/management/types';
import { getDefaultConfig } from '@/widgets/management/defaults';
import { validateConfig } from '@/widgets/management/validation';
import { createWidgetToken } from '@/widgets/management/tokenUtils';
import { useWidgetAnalytics, formatAnalyticsValue, analyticsFormatters } from '@/widgets/management/useWidgetAnalytics';
import { WIDGET_CONFIG_LIMITS } from '@/widgets/management/types';
import { TenantStatusCard } from '@/widgets/management/components/TenantStatusCard';
import { WidgetHeader } from '@/widgets/management/components/WidgetHeader';
import { ValidationErrorAlert } from '@/widgets/management/components/ValidationErrorAlert';
import { 
  ALIGNMENT_MAP, 
  FONT_WEIGHT_MAP, 
  TEXT_ALIGNMENT_MAP,
  ANIMATION_MAP,
  DEVICE_STYLES,
  DEVICE_FRAME_STYLES,
  DEVICE_SCREEN_STYLES,
  WIDGET_SCALE_MAP,
  createWidgetContainerStyle,
  createCustomProperties,
  getSpacingStyle 
} from '@/widgets/management/styleUtils';
import { copyText } from '@/utils/clipboard';

// Types now imported from widgets/management/types

// --- Small utility component: contrast calculation & warnings ---
const ColorContrastDiagnostics: React.FC<{primary: string; background: string; text: string;}> = ({ primary, background, text }) => {
  // Utility functions for contrast (WCAG)
  const parseHex = (h: string) => {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h.trim());
    if (!m) return null;
    let hex = m[1];
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const int = parseInt(hex, 16);
    return [ (int >> 16) & 255, (int >> 8) & 255, int & 255 ];
  };
  const rel = (c: number) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const contrast = (a: string, b: string) => {
    const ca = parseHex(a); const cb = parseHex(b);
    if (!ca || !cb) return null;
    const La = 0.2126 * rel(ca[0]) + 0.7152 * rel(ca[1]) + 0.0722 * rel(ca[2]);
    const Lb = 0.2126 * rel(cb[0]) + 0.7152 * rel(cb[1]) + 0.0722 * rel(cb[2]);
    const ratio = (Math.max(La, Lb) + 0.05) / (Math.min(La, Lb) + 0.05);
    return Number(ratio.toFixed(2));
  };
  const ratios = {
    primaryText: contrast(primary, text),
    backgroundText: contrast(background, text),
    primaryBackground: contrast(primary, background)
  };
  const warn = (r: number | null, min: number) => r !== null && r < min;
  const issues = [
    warn(ratios.primaryText, 4.5) && 'Primary ↔ Text contrast low',
    warn(ratios.backgroundText, 4.5) && 'Background ↔ Text contrast low',
    warn(ratios.primaryBackground, 3) && 'Primary ↔ Background contrast weak'
  ].filter(Boolean) as string[];
  return (
    <div className="mt-2 border rounded-md p-3 bg-white dark:bg-gray-900 text-xs space-y-1" aria-live="polite">
      <div className="flex flex-wrap gap-3">
        <span className="font-medium">Contrast:</span>
        <span>Primary/Text: {ratios.primaryText ?? '—'}</span>
        <span>Background/Text: {ratios.backgroundText ?? '—'}</span>
        <span>Primary/Background: {ratios.primaryBackground ?? '—'}</span>
      </div>
      {issues.length > 0 ? (
        <ul className="text-amber-600 list-disc list-inside">
          {issues.map(i => <li key={i}>{i}</li>)}
        </ul>
      ) : (
        <p className="text-green-600">All key contrast ratios pass baseline guidelines.</p>
      )}
    </div>
  );
};

const WidgetManagement: React.FC = () => {
  const { tenant, tenantSlug, loading: tenantLoading, error: tenantError } = useTenant();
  const { toast } = useToast();
  
  const [activeWidgetType, setActiveWidgetType] = useState<'booking' | 'catering'>('booking');
  const debugWM = (...args: any[]) => {
    if (import.meta.env.VITE_ANALYTICS_DEBUG === '1') {
      // eslint-disable-next-line no-console
      console.log('[WidgetManagement]', ...args);
    }
  };

  const [selectedTab, setSelectedTab] = useState(() => {
    try {
      const url = new URL(window.location.href);
      const qp = url.searchParams.get('tab');
      if (qp === 'configure' || qp === 'preview' || qp === 'analytics' || qp === 'embed') return qp;
      const key = `wm.tab.${tenantSlug || tenant?.slug || 'default'}`;
      return safeStorage.get(key) || 'configure';
    } catch { return 'configure'; }
  });
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>(() => {
    try {
      const key = `wm.preview.device.${tenantSlug || tenant?.slug || 'default'}`;
      const v = safeStorage.get(key) as 'desktop' | 'tablet' | 'mobile' | null;
      return v || 'desktop';
    } catch { return 'desktop'; }
  });
  const [deviceScale, setDeviceScale] = useState<number>(() => {
    try { return parseFloat(safeStorage.get(`wm.preview.scale.${tenantSlug || tenant?.slug || 'default'}`) || '1'); } catch { return 1; }
  });
  const [showGrid, setShowGrid] = useState<boolean>(() => {
    try { return safeStorage.get(`wm.preview.grid.${tenantSlug || tenant?.slug || 'default'}`) === '1'; } catch { return false; }
  });
  const [showSafeArea, setShowSafeArea] = useState<boolean>(() => {
    try { return safeStorage.get(`wm.preview.safe.${tenantSlug || tenant?.slug || 'default'}`) !== '0'; } catch { return true; }
  });
  // Live data preview toggle (renders real widget iframe instead of static mock)
  // Live preview only mode – always true
  const livePreview = true;
  const [isLoading, setIsLoading] = useState(false); // generic spinner (saving etc.)
  const [copyBusy, setCopyBusy] = useState(false); // copy-to-clipboard only
  // Deploy tab state
  const [embedType, setEmbedType] = useState<'script' | 'iframe' | 'react'>(() => {
    try { return (safeStorage.get(`wm.deploy.format.${tenantSlug || tenant?.slug || 'default'}`) as 'script'|'iframe'|'react') || 'script'; } catch { return 'script'; }
  });
  const [allowedOriginInput, setAllowedOriginInput] = useState<string>(() => {
    try { return safeStorage.get(`wm.deploy.origin.${tenantSlug || tenant?.slug || 'default'}`) || (typeof window !== 'undefined' ? window.location.origin : ''); } catch { return typeof window !== 'undefined' ? window.location.origin : ''; }
  });
  const [iframeSandbox, setIframeSandbox] = useState<boolean>(() => {
    try { return safeStorage.get(`wm.deploy.sandbox.${tenantSlug || tenant?.slug || 'default'}`) !== '0'; } catch { return true; }
  });
  const [iframeLazy, setIframeLazy] = useState<boolean>(() => {
    try { return safeStorage.get(`wm.deploy.lazy.${tenantSlug || tenant?.slug || 'default'}`) !== '0'; } catch { return true; }
  });
  const [analyticsRange, setAnalyticsRange] = useState<'1d' | '7d' | '30d'>('7d');
  // Server-signed widget token used for embed URLs (generated asynchronously)
  const [widgetToken, setWidgetToken] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!resolvedTenantSlug) { setWidgetToken(null); return; }
        const t = await createWidgetToken(resolvedTenantSlug, '2.0', activeWidgetType);
        if (!cancelled) setWidgetToken(t);
      } catch {
        if (!cancelled) setWidgetToken(null);
      }
    })();
    return () => { cancelled = true; };
  }, [resolvedTenantSlug, activeWidgetType]);
  // Focus preview after device change
  useEffect(() => {
    const el = document.querySelector('[data-widget-preview]') as HTMLElement | null;
    if (el) {
      el.setAttribute('tabindex', '-1');
      el.focus();
    }
    try { safeStorage.set(`wm.preview.device.${tenantSlug || tenant?.slug || 'default'}`, previewDevice); } catch (e) {
      // Non-critical persistence error (e.g., private mode); safe to ignore.
    }
  }, [previewDevice]);

  useEffect(() => {
    try { safeStorage.set(`wm.preview.scale.${tenantSlug || tenant?.slug || 'default'}`, String(deviceScale)); } catch (e) {
      // Ignore storage write failures.
    }
  }, [deviceScale, tenantSlug, tenant?.slug]);

  useEffect(() => {
    try { safeStorage.set(`wm.preview.grid.${tenantSlug || tenant?.slug || 'default'}`, showGrid ? '1' : '0'); } catch (e) {
      // Ignore storage write failures.
    }
  }, [showGrid, tenantSlug, tenant?.slug]);

  useEffect(() => {
    try { safeStorage.set(`wm.preview.safe.${tenantSlug || tenant?.slug || 'default'}`, showSafeArea ? '1' : '0'); } catch (e) {
      // Ignore storage write failures.
    }
  }, [showSafeArea, tenantSlug, tenant?.slug]);

  useEffect(() => { try { safeStorage.set(`wm.deploy.format.${tenantSlug || tenant?.slug || 'default'}`, embedType); } catch {} }, [embedType, tenantSlug, tenant?.slug]);
  useEffect(() => { try { safeStorage.set(`wm.deploy.origin.${tenantSlug || tenant?.slug || 'default'}`, allowedOriginInput || ''); } catch {} }, [allowedOriginInput, tenantSlug, tenant?.slug]);
  useEffect(() => { try { safeStorage.set(`wm.deploy.sandbox.${tenantSlug || tenant?.slug || 'default'}`, iframeSandbox ? '1' : '0'); } catch {} }, [iframeSandbox, tenantSlug, tenant?.slug]);
  useEffect(() => { try { safeStorage.set(`wm.deploy.lazy.${tenantSlug || tenant?.slug || 'default'}`, iframeLazy ? '1' : '0'); } catch {} }, [iframeLazy, tenantSlug, tenant?.slug]);

  useEffect(() => {
    const keyBase = `wm.tab.${tenantSlug || tenant?.slug || 'default'}`;
  try { safeStorage.set(keyBase, selectedTab); } catch (e) { /* ignore */ }
    // Avoid redundant history updates (can trigger downstream listeners)
    try {
      const url = new URL(window.location.href);
      const current = url.searchParams.get('tab');
      if (current !== selectedTab) {
        url.searchParams.set('tab', selectedTab);
        window.history.replaceState(null, '', url.toString());
        debugWM('Tab URL sync', { from: current, to: selectedTab });
      } else {
        debugWM('Tab URL sync skipped (no change)', { tab: selectedTab });
      }
    } catch (e) {
      debugWM('Tab URL sync error', e);
    }
  }, [selectedTab, tenantSlug, tenant?.slug]);

  // Memoized preview styles to avoid unnecessary recalcs (declared after currentConfig below)
  let widgetContainerStyle = {} as React.CSSProperties;
  let widgetComputedProps: React.CSSProperties = {};

  const handleScreenshot = useCallback(async () => {
    try {
      const node = document.querySelector('[data-widget-preview]') as HTMLElement | null;
      if (!node) return;
  // Dynamic import to keep bundle lean; requires html2canvas in app deps
  const mod: any = await import('html2canvas');
      const html2canvas = (mod.default || mod) as (el: HTMLElement, opts?: any) => Promise<HTMLCanvasElement>;
      const canvas = await html2canvas(node, { scale: window.devicePixelRatio * deviceScale, backgroundColor: null });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const slug = (tenantSlug || tenant?.slug || 'tenant');
      a.href = url;
      a.download = `${slug}-${activeWidgetType}-preview.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Screenshot failed - ensure html2canvas is installed', err);
    }
  }, [activeWidgetType, deviceScale, tenantSlug, tenant?.slug]);

  // Tenant slug resolution - no demo fallbacks
  const resolvedTenantSlug = useMemo(() => {
    // Priority order for slug resolution:
    // 1. URL slug parameter (from useTenant)
    // 2. Tenant object slug
    // No fallbacks - require real tenant data
    return tenantSlug || tenant?.slug;
  }, [tenantSlug, tenant?.slug]);

  // Use centralized widget config hook for robustness
  const {
    bookingConfig,
    cateringConfig,
    currentConfig,
    setCurrentConfig,
    hasUnsavedChanges,
    validationErrors,
    lastSavedTimestamp,
    updateConfig,
    saveConfiguration,
    resetToDefaults: resetDefaultsFromHook,
    safeParseInt,
    setActiveWidgetType: setTypeFromHook,
    tenantIdentifier,
    getTenantConfigurations,
    exportTenantConfiguration,
    saving,
    changedKeysCount,
    isDraft
  } = useWidgetConfig('booking', tenant?.id ?? null, resolvedTenantSlug ?? null, tenantLoading);

  // Floating status ribbon for autosave/draft state
  const StatusRibbon = () => {
    if (!hasUnsavedChanges && !saving) return null;
    const label = saving
      ? 'Saving…'
      : isDraft
        ? `Draft (${changedKeysCount} change${changedKeysCount===1?'':'s'})`
        : `Unsaved (${changedKeysCount} change${changedKeysCount===1?'':'s'})`;
    return (
      <div className="fixed top-0 left-1/2 -translate-x-1/2 z-40 px-3 py-1 rounded-b-md text-xs font-medium tracking-wide text-white bg-indigo-600/90 border border-indigo-400 shadow-sm backdrop-blur" role="status" aria-live="polite">
        {label}
      </div>
    );
  };

  // Ephemeral session banner (only if storage is not persistent – sandboxed preview context)
  const EphemeralBanner = () => {
    if (safeStorage.persistent) return null;
    return (
      <div className="mb-4 rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2" role="note" aria-live="polite">
        <span className="font-medium">Sandboxed Preview:</span>
        <span>Sessions & widget config drafts are ephemeral here{inSandboxedIframe ? ' (iframe isolated)' : ''}. Persistence is disabled for security.</span>
      </div>
    );
  };

  // Now that currentConfig exists, finalize memoized preview styles
  widgetContainerStyle = useMemo(() => {
    try {
      const base = createWidgetContainerStyle(currentConfig, previewDevice) as Record<string, any>;
      return { ...base, transformOrigin: 'top center', transform: `scale(${deviceScale})` } as React.CSSProperties;
    } catch {
      return { transform: `scale(${deviceScale})`, transformOrigin: 'top center' } as React.CSSProperties;
    }
  }, [currentConfig, previewDevice, deviceScale]);

  widgetComputedProps = useMemo(() => ({
    padding: currentConfig.padding,
    ...createCustomProperties(currentConfig),
    ...getSpacingStyle(currentConfig.spacing)
  }), [currentConfig]);

  // Keep local activeWidgetType in sync with hook state
  useEffect(() => {
    setTypeFromHook(activeWidgetType);
    debugWM('Active widget type effect', { activeWidgetType });
  }, [activeWidgetType, setTypeFromHook]);

  // Local saving spinner state wrapping hook save
  const [isSaving, setIsSaving] = useState(false);
  const resetToDefaults = useCallback(() => {
    resetDefaultsFromHook();
  }, [resetDefaultsFromHook]);
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveConfiguration();
    } finally {
      setIsSaving(false);
    }
  }, [saveConfiguration]);

  // Debounced autosave (toggleable flag inside configuration)
  const [autosaveEnabled, setAutosaveEnabled] = useState<boolean>(true);
  const autosaveRef = useRef<number | null>(null);
  useEffect(() => {
    if (!autosaveEnabled) return;
    if (!hasUnsavedChanges) return;
    if (validationErrors.length > 0) return;
    if (autosaveRef.current) window.clearTimeout(autosaveRef.current);
    autosaveRef.current = window.setTimeout(() => {
      handleSave();
    }, 1500);
    return () => {
      if (autosaveRef.current) window.clearTimeout(autosaveRef.current);
    };
  }, [autosaveEnabled, hasUnsavedChanges, validationErrors.length, handleSave, currentConfig]);

  // Defaults now centralized in widgets/management/defaults

  // Additional component state
  const realWidgetId = `${resolvedTenantSlug || 'tenant'}_${activeWidgetType}_${tenantIdentifier?.slice(-8) || 'widget'}`;
  // Diagnostic render counter (dev / debug only)
  const renderCountRef = useRef(0);
  renderCountRef.current++;
  if (import.meta.env.VITE_ANALYTICS_DEBUG === '1' && renderCountRef.current % 25 === 0) {
    // eslint-disable-next-line no-console
    console.log('[WidgetManagement] Render count', renderCountRef.current);
  }

  // Configuration management now handled by useWidgetConfig

  // Generate embed code based on current config and real tenant data
  const embedCode = `<iframe src="https://yourdomain.com/widget/${realWidgetId}" width="${currentConfig.width}" height="${currentConfig.height}" frameborder="0"></iframe>`;

  // Validation now centralized in widgets/management/validation

  // Update configuration with validation
  // updateConfig provided by hook

  // Enhanced save configuration with better error handling
  // saveConfiguration provided by hook

  // Enhanced configuration loading with better error handling
  // loading/saving now handled by hook on mount and when identifiers change

  // Widget URL and embed code generation with enhanced error handling
  const generateWidgetUrl = useCallback(async (type: 'booking' | 'catering'): Promise<string | null> => {
    // Gracefully handle loading states instead of throwing noisy errors
      const effectiveSlug = resolvedTenantSlug;
      if (!effectiveSlug) {
      // Slug not yet resolved; caller should treat as unavailable
      return null;
      }
      
      const config = type === 'booking' ? bookingConfig : cateringConfig;
    if (!config) return null;

  const baseUrl = window.location.origin;
  // New standalone public widget bundle path (served by public-widget.html)
  const widgetPath = type === 'booking' ? '/public-widget/book' : '/public-widget/catering';
      const widgetToken = await createWidgetToken(effectiveSlug, '2.0', type);
      
    const params = new URLSearchParams();
    params.set('slug', effectiveSlug);
    params.set('token', widgetToken);
    params.set('widget_version', '2.0');

    if (tenant?.timezone) params.set('timezone', tenant.timezone);
    if (tenant?.currency) params.set('currency', tenant.currency);

    params.set('theme', config.theme || 'light');
    params.set('primaryColor', config.primaryColor || '#3b82f6');
    params.set('secondaryColor', config.secondaryColor || '#1e40af');
    params.set('backgroundColor', config.backgroundColor || '#ffffff');
    params.set('textColor', config.textColor || '#1f2937');

    params.set('borderRadius', String(config.borderRadius || 8));
    params.set('width', String(config.width || 400));
    params.set('height', String(config.height || 600));

    if (config.welcomeMessage) params.set('welcomeMessage', config.welcomeMessage);
    if (config.buttonText) params.set('buttonText', config.buttonText);

    params.set('showLogo', String(config.showLogo ?? true));
    params.set('showDescription', String(config.showDescription ?? true));
    params.set('showFooter', String(config.showFooter ?? true));
    params.set('enableAnimations', String(config.enableAnimations ?? true));
    params.set('animationType', config.animationType || 'fade');

      if (type === 'booking') {
      if (config.enableTableOptimization !== undefined) params.set('enableTableOptimization', String(config.enableTableOptimization));
      if (config.maxPartySize) params.set('maxPartySize', String(config.maxPartySize));
      if (config.requireDeposit !== undefined) params.set('requireDeposit', String(config.requireDeposit));
      if (config.enableSpecialRequests !== undefined) params.set('enableSpecialRequests', String(config.enableSpecialRequests));
    }

    return `${baseUrl}${widgetPath}/${effectiveSlug}?${params.toString()}`;
  }, [bookingConfig, cateringConfig, resolvedTenantSlug, tenant?.timezone, tenant?.currency]);

  const escapeAttr = (val: string) => (val || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const generateEmbedCode = useCallback((type: 'booking' | 'catering') => {
    try {
      const url = (window as any).__wm_url_cache?.[type] || null;
      // generate asynchronously once to avoid blocking
      if (!url) {
        (async () => {
          try {
            const u = await generateWidgetUrl(type);
            (window as any).__wm_url_cache = (window as any).__wm_url_cache || {};
            (window as any).__wm_url_cache[type] = u;
            setTimeout(() => setPreviewVersion(v => v + 1), 0);
          } catch {}
        })();
      }
      
      if (!url) {
        return '<!-- Error: Unable to generate widget URL. Please check your configuration. -->';
      }
      
      const config = type === 'booking' ? bookingConfig : cateringConfig;
      
      if (!config) {
        return '<!-- Error: Widget configuration not found -->';
      }
      
  const widgetId = `blunari-${type}-widget-${Date.now()}`;
  const safeWelcome = escapeAttr(config.welcomeMessage || '');
  // Origin validation and sanitization
  let allowedOrigin = '';
  try {
    const raw = allowedOriginInput || (typeof window !== 'undefined' ? window.location.origin : '');
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) {
      allowedOrigin = new URL(url).origin;
    } else {
      allowedOrigin = u.origin;
    }
  } catch { allowedOrigin = new URL(url).origin; }
  const sandboxAttr = iframeSandbox ? " sandbox=\"allow-scripts allow-same-origin allow-forms allow-popups\"" : '';
  const lazyAttr = iframeLazy ? " loading=\"lazy\"" : '';
  const referrerAttr = " referrerpolicy=\"strict-origin-when-cross-origin\"";

      if (embedType === 'iframe') {
        return `<!-- Simple iframe embed (standalone bundle) -->\n<!-- Uses /public-widget entry for smaller isolated runtime -->\n<iframe\n  src="${url}&embed=1"\n  width="${config.width || 400}"\n  height="${config.height || 600}"\n  style="border:0;max-width:100%;border-radius:${config.borderRadius || 8}px;box-shadow:0 ${(config.shadowIntensity || 2) * 2}px ${(config.shadowIntensity || 2) * 4}px rgba(0,0,0,.1)"\n  title="${safeWelcome || 'Blunari widget'}"\n  loading="${iframeLazy ? 'lazy' : 'eager'}"${iframeSandbox ? '\n  sandbox="allow-scripts allow-forms allow-popups"' : ''}\n  referrerpolicy="strict-origin-when-cross-origin"\n  data-widget-type="${type}"\n></iframe>`;
      }
      if (embedType === 'react') {
        return `{/* React iframe embed (standalone /public-widget bundle) */}\n<iframe\n  src={"${url}&embed=1"}\n  width={${config.width || 400}}\n  height={${config.height || 600}}\n  style={{border:0, maxWidth:'100%', borderRadius:${config.borderRadius || 8}, boxShadow:'0 ${(config.shadowIntensity || 2) * 2}px ${(config.shadowIntensity || 2) * 4}px rgba(0,0,0,.1)'}}\n  title={'${safeWelcome || 'Blunari widget'}'}\n  loading="${iframeLazy ? 'lazy' : 'eager'}"${iframeSandbox ? '\n  sandbox="allow-scripts allow-forms allow-popups"' : ''}\n  referrerPolicy="strict-origin-when-cross-origin"\n  data-widget-type={'${type}'}\n/>`;
      }

      // Script embed (advanced) – creates container, injects iframe, handles resize + token handshake
      const tokenParam = new URL(url).searchParams.get('token') || '';
      const slugParam = new URL(url).searchParams.get('slug') || '';
    return `<!-- Blunari ${type} widget script embed -->\n<div id="${widgetId}" data-widget-slug="${slugParam}" data-widget-type="${type}" style="width:${config.width || 400}px;height:${config.height || 600}px;max-width:100%;margin:0 auto;border-radius:${config.borderRadius || 8}px;overflow:hidden;box-shadow:0 ${(config.shadowIntensity || 2) * 2}px ${(config.shadowIntensity || 2) * 4}px rgba(0,0,0,.1)"></div>\n<script defer>(function(){
  if(window.__blunariInit && window.__blunariInit['${widgetId}']) return;
  window.__blunariInit = window.__blunariInit||{};
  window.__blunariInit['${widgetId}']=true;
  var host='${new URL(url).origin}';
  var container=document.getElementById('${widgetId}');
  if(!container) return;
  var cid='cid-'+Math.random().toString(36).slice(2)+Date.now().toString(36);
  var src='${url}&embed=1&parent_origin='+encodeURIComponent(window.location.origin)+'&cid='+encodeURIComponent(cid);
  var iframe=document.createElement('iframe');
  iframe.src=src;
  iframe.title='${safeWelcome || 'Blunari widget'}';
  iframe.loading='${iframeLazy ? 'lazy' : 'eager'}';
  iframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
  ${iframeSandbox ? "iframe.setAttribute('sandbox','allow-scripts allow-forms allow-popups');" : ''}
  iframe.style.cssText='width:100%;height:100%;border:0;display:block;background:#fff';
  container.appendChild(iframe);
  var allowed='${allowedOrigin}';
  function onMsg(e){
    if(allowed && e.origin!==allowed) return;
    var d=e.data;
    if(!d||d.widgetId!=='${widgetId}') return;
    if(d.type==='widget_resize' && d.height){ iframe.style.height=d.height+'px'; container.style.height=d.height+'px'; }
    if(d.type==='widget_loaded'){ container.classList.add('blunari-loaded'); }
    if(d.type==='widget_error'){ console.error('Widget error',{error:d.error,requestId:d.requestId,cid:cid}); }
  }
  window.addEventListener('message',onMsg,false);
  // parent_ready handshake once iframe is attached
  try {
    iframe.contentWindow && iframe.contentWindow.postMessage({ type:'parent_ready', widgetId:'${widgetId}', correlationId: cid }, '*');
  } catch {}
})();</script>
<noscript>Enable JavaScript to load the Blunari ${type} widget.</noscript>`;
    } catch (error) {
      console.error('Error generating embed code:', error);
      return '<!-- Error: Unable to generate embed code. Please check your configuration and try again. -->';
    }
  }, [generateWidgetUrl, bookingConfig, cateringConfig, allowedOriginInput, iframeSandbox, iframeLazy, embedType]);

  // Compute live widget URL only when live preview enabled to avoid throwing during slug resolution
  // Track a stable iframe key to avoid React remounting it unless slug/type change
  const iframeKeyRef = useRef<string>('');
  const lastConfigSignatureRef = useRef<string>('');
  const liveWidgetBaseUrl = useMemo(() => {
    if (!livePreview) return null;
    const url = generateWidgetUrl(activeWidgetType);
    if (!url) return null;
    const slug = resolvedTenantSlug || 'tenant';
    const nextKey = `${slug}:${activeWidgetType}`;
    if (iframeKeyRef.current !== nextKey) {
      iframeKeyRef.current = nextKey;
    }
    return url + '&preview=1';
  }, [livePreview, activeWidgetType, generateWidgetUrl, resolvedTenantSlug]);

  // Compute a lightweight signature of config values that materially affect widget rendering.
  const currentConfigSignature = useMemo(() => {
    const c = currentConfig;
    if (!c) return 'none';
    return [
      c.theme, c.primaryColor, c.secondaryColor, c.backgroundColor, c.textColor,
      c.borderRadius, c.width, c.height, c.animationType, c.enableAnimations,
      c.showLogo, c.showDescription, c.showFooter
    ].join('|');
  }, [currentConfig]);

  // Device-specific URL with conditional cache-busting only when config signature changes.
  const liveWidgetUrl = useMemo(() => {
    if (!liveWidgetBaseUrl) return null;
    const deviceParam = `&device=${previewDevice}`;
    // Only append a cache-buster if config signature changed (prevents constant reload loops)
    if (lastConfigSignatureRef.current !== currentConfigSignature) {
      lastConfigSignatureRef.current = currentConfigSignature;
      return `${liveWidgetBaseUrl}${deviceParam}&cfg=${encodeURIComponent(currentConfigSignature)}`;
    }
    return `${liveWidgetBaseUrl}${deviceParam}`;
  }, [liveWidgetBaseUrl, previewDevice, currentConfigSignature]);

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      setCopyBusy(true);
      await copyText(text);
      toast({ title: 'Copied!', description: `${label} copied to clipboard` });
    } catch (error) {
      toast({ title: 'Copy Failed', description: 'Failed to copy to clipboard', variant: 'destructive' });
    } finally {
      setCopyBusy(false);
    }
  }, [toast]);

  // Use real analytics hook instead of mock data
  const { 
    data: analyticsData, 
    loading: analyticsLoading, 
    error: analyticsError,
    refresh: refreshAnalytics,
    isAvailable: analyticsAvailable,
    meta: analyticsMeta
  } = useWidgetAnalytics({
    tenantId: tenant?.id || null,
    tenantSlug: resolvedTenantSlug || null,
    widgetType: activeWidgetType,
  });

  // Re-fetch analytics when range changes or widget type changes
  useEffect(() => {
    if (!analyticsAvailable) { debugWM('Analytics fetch skipped: not available'); return; }
    if (analyticsRange === '7d' && !analyticsData) { debugWM('Analytics fetch skipped default initial'); return; }
    debugWM('Analytics fetch trigger', { range: analyticsRange, widgetType: activeWidgetType });
    refreshAnalytics(analyticsRange);
  }, [analyticsAvailable, analyticsRange, activeWidgetType, refreshAnalytics, analyticsData]);

  // Reset to defaults handled by hook via resetToDefaults

  // Keyboard shortcuts and focus management
  useEffect(() => {
    const handleKeyboardShortcuts = (event: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            if (!isSaving && validationErrors.length === 0) {
              handleSave();
            }
            break;
          case 'r':
            event.preventDefault();
            resetToDefaults();
            break;
          case '1':
            event.preventDefault();
            setSelectedTab('configure');
            // Focus on first heading when switching tabs
            setTimeout(() => {
              const heading = document.querySelector('[role="tabpanel"][data-state="active"] h3, [role="tabpanel"][data-state="active"] h4');
              if (heading instanceof HTMLElement) {
                heading.focus();
              }
            }, 100);
            break;
          case '2':
            event.preventDefault();
            setSelectedTab('preview');
            setTimeout(() => {
              const heading = document.querySelector('[role="tabpanel"][data-state="active"] h3');
              if (heading instanceof HTMLElement) {
                heading.focus();
              }
            }, 100);
            break;
          case '3':
            event.preventDefault();
            setSelectedTab('analytics');
            setTimeout(() => {
              const heading = document.querySelector('[role="tabpanel"][data-state="active"] h3');
              if (heading instanceof HTMLElement) {
                heading.focus();
              }
            }, 100);
            break;
          case '4':
            event.preventDefault();
            setSelectedTab('embed');
            setTimeout(() => {
              const heading = document.querySelector('[role="tabpanel"][data-state="active"] h3');
              if (heading instanceof HTMLElement) {
                heading.focus();
              }
            }, 100);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [isSaving, validationErrors.length, handleSave, resetToDefaults, setSelectedTab]);

  // Warn about unsaved changes before page unload
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Allowed origin validation state
  const originState = useMemo(() => {
    try {
      const raw = allowedOriginInput || '';
      const u = new URL(raw);
      if (!/^https?:$/.test(u.protocol)) return { valid: false, error: 'Must start with http:// or https://', sanitized: '' };
      return { valid: true, error: '', sanitized: u.origin };
    } catch { return { valid: false, error: 'Enter a valid origin like https://yourdomain.com', sanitized: '' }; }
  }, [allowedOriginInput]);

  return (
    <div className="container mx-auto p-6 space-y-6" role="main" aria-label="Widget Management Dashboard">
      <StatusRibbon />
      {/* Sticky global action bar for key widget actions */}
      {!tenantLoading && !tenantError && (
        <div className="sticky top-0 z-30 -mt-6 -mx-6 mb-4 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-gray-900/70 bg-white/90 dark:bg-gray-900/90 border-b flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 mr-auto">
            <h2 className="text-base font-semibold flex items-center gap-2"><Code className="w-4 h-4"/>Widget Manager</h2>
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="animate-pulse">Unsaved</Badge>
            )}
          </div>
            <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="w-3 h-3"/> Live Preview</span>
            <Separator orientation="vertical" className="h-4" />
            <span>{activeWidgetType === 'booking' ? 'Booking' : 'Catering'} widget</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Live toggle removed - always live */}
            <Button variant="outline" size="sm" disabled={isSaving || !hasUnsavedChanges || validationErrors.length>0} onClick={handleSave}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
              <span className="ml-1 hidden sm:inline">Save</span>
            </Button>
            <Button variant="ghost" size="sm" disabled={isSaving} onClick={resetToDefaults}>
              <RotateCcw className="w-4 h-4"/>
            </Button>
          </div>
        </div>
      )}
      {/* Loading state while tenant information is being fetched */}
      {tenantLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading tenant information...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state if tenant loading failed */}
      {tenantError && !tenantLoading && (
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>Error loading tenant information: {tenantError || 'Unknown error'}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content - only show when not loading and no error */}
      {!tenantLoading && !tenantError && (
        <>
          {/* Tenant Status */}
          <TenantStatusCard
            tenant={tenant}
            tenantSlug={resolvedTenantSlug}
            tenantIdentifier={tenantIdentifier}
            activeWidgetType={activeWidgetType}
            hasUnsavedChanges={hasUnsavedChanges}
            onExportConfig={exportTenantConfiguration}
            tenantLoading={tenantLoading}
            tenantError={tenantError}
          />

          {/* Header */}
          <WidgetHeader
            activeWidgetType={activeWidgetType}
            onWidgetTypeChange={setActiveWidgetType}
            hasUnsavedChanges={hasUnsavedChanges}
            validationErrors={validationErrors}
            isSaving={isSaving}
            onSave={handleSave}
            onReset={resetToDefaults}
          />

          {/* Validation errors */}
          <ValidationErrorAlert errors={validationErrors} />

      {/* Main Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configure" className="flex items-center gap-2" title="Configure content, appearance, and features">
            <Settings className="w-4 h-4" />
            Configure
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2" title="Live widget preview">
            <Eye className="w-4 h-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2" title="Analytics & performance">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="embed" className="flex items-center gap-2" title="Generate embed code & test URLs">
            <Code className="w-4 h-4" />
            Deploy
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="configure" className="space-y-6">
          {/* Tenant-Specific Configuration Info */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <Settings className="w-5 h-5" />
                Tenant-Specific Widget Configuration
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                Each restaurant has its own customized widget settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border">
                    <p className="text-sm font-medium text-muted-foreground">Current Tenant</p>
                    <p className="font-semibold">{tenant?.name || 'Loading...'}</p>
                    <p className="text-xs text-muted-foreground">Slug: {resolvedTenantSlug}</p>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border">
                    <p className="text-sm font-medium text-muted-foreground">Configuration ID</p>
                    <p className="font-mono text-sm">{tenantIdentifier}</p>
                    <p className="text-xs text-muted-foreground">Unique identifier</p>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border">
                    <p className="text-sm font-medium text-muted-foreground">Storage Namespace</p>
                    <p className="font-mono text-sm">blunari-widget-{activeWidgetType}</p>
                    <p className="text-xs text-muted-foreground">Local storage key</p>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">How Tenant-Specific Customization Works:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Each tenant has completely isolated widget configurations</li>
                    <li>Changes you make here only affect <strong>{tenant?.name || 'this tenant'}</strong>'s widgets</li>
                    <li>Colors, text, layout, and features are tenant-specific</li>
                    <li>Widget URLs automatically include the tenant identifier: <code>/{activeWidgetType === 'booking' ? 'book' : 'catering'}/{resolvedTenantSlug}</code></li>
                    <li>Configurations are saved locally and can be exported/imported</li>
                  </ul>
                </div>
                
                {getTenantConfigurations().length > 0 && (
                  <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3 rounded-lg">
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">
                        {getTenantConfigurations().length} saved configuration(s)
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Last saved: {lastSavedTimestamp ? new Date(lastSavedTimestamp).toLocaleString() : 'Never'}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={exportTenantConfiguration}
                      className="border-green-300 text-green-700 hover:bg-green-100"
                      aria-label="Export all saved configurations"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export All
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Content Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Content & Text
                </CardTitle>
                <CardDescription>
                  Configure the text content and messaging
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="welcome-message">Welcome Message</Label>
                  <Input
                    id="welcome-message"
                    value={currentConfig.welcomeMessage}
                    maxLength={WIDGET_CONFIG_LIMITS.welcomeMessage.max}
                    onChange={(e) => updateConfig({ welcomeMessage: e.target.value.slice(0, WIDGET_CONFIG_LIMITS.welcomeMessage.max) })}
                    placeholder="Enter welcome message"
                    aria-invalid={validationErrors.find(e => e.field === 'welcomeMessage') ? 'true' : 'false'}
                    aria-describedby={validationErrors.find(e => e.field === 'welcomeMessage') ? 'welcome-message-error' : undefined}
                    className={validationErrors.find(e => e.field === 'welcomeMessage') ? 'border-red-500' : ''}
                  />
                  <div className="text-xs text-muted-foreground text-right">{currentConfig.welcomeMessage.length}/{WIDGET_CONFIG_LIMITS.welcomeMessage.max}</div>
                  {validationErrors.find(e => e.field === 'welcomeMessage') && (
                    <p id="welcome-message-error" className="text-sm text-red-600" role="alert">
                      {validationErrors.find(e => e.field === 'welcomeMessage')?.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={currentConfig.description}
                    maxLength={WIDGET_CONFIG_LIMITS.description.max}
                    onChange={(e) => updateConfig({ description: e.target.value.slice(0, WIDGET_CONFIG_LIMITS.description.max) })}
                    placeholder="Enter widget description"
                    rows={2}
                    aria-describedby="description-help"
                  />
                  <div className="text-xs text-muted-foreground text-right">{currentConfig.description.length}/{WIDGET_CONFIG_LIMITS.description.max}</div>
                  <p id="description-help" className="text-sm text-muted-foreground">
                    Brief description of your widget for accessibility
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="button-text">Button Text</Label>
                  <Input
                    id="button-text"
                    value={currentConfig.buttonText}
                    maxLength={WIDGET_CONFIG_LIMITS.buttonText.max}
                    onChange={(e) => updateConfig({ buttonText: e.target.value.slice(0, WIDGET_CONFIG_LIMITS.buttonText.max) })}
                    placeholder="Enter button text"
                    aria-invalid={validationErrors.find(e => e.field === 'buttonText') ? 'true' : 'false'}
                    aria-describedby={validationErrors.find(e => e.field === 'buttonText') ? 'button-text-error' : undefined}
                    className={validationErrors.find(e => e.field === 'buttonText') ? 'border-red-500' : ''}
                  />
                  <div className="text-xs text-muted-foreground text-right">{currentConfig.buttonText.length}/{WIDGET_CONFIG_LIMITS.buttonText.max}</div>
                  {validationErrors.find(e => e.field === 'buttonText') && (
                    <p id="button-text-error" className="text-sm text-red-600" role="alert">
                      {validationErrors.find(e => e.field === 'buttonText')?.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="footer-text">Footer Text</Label>
                  <Input
                    id="footer-text"
                    value={currentConfig.footerText}
                    maxLength={WIDGET_CONFIG_LIMITS.footerText.max}
                    onChange={(e) => updateConfig({ footerText: e.target.value.slice(0, WIDGET_CONFIG_LIMITS.footerText.max) })}
                    placeholder="Enter footer text"
                    aria-describedby="footer-text-help"
                  />
                  <div className="text-xs text-muted-foreground text-right">{currentConfig.footerText.length}/{WIDGET_CONFIG_LIMITS.footerText.max}</div>
                  <p id="footer-text-help" className="text-sm text-muted-foreground">
                    Optional footer text (e.g., "Powered by YourBrand")
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Appearance Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Appearance & Colors
                </CardTitle>
                <CardDescription>
                  Customize the visual appearance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick color presets */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Brand', p: '#3b82f6', s: '#1e40af', bg: '#ffffff', text: '#1f2937' },
                    { name: 'Dark', p: '#6366f1', s: '#4338ca', bg: '#111827', text: '#F9FAFB' },
                    { name: 'Emerald', p: '#10b981', s: '#047857', bg: '#ffffff', text: '#064e3b' },
                    { name: 'Rose', p: '#e11d48', s: '#9f1239', bg: '#ffffff', text: '#1f2937' },
                    { name: 'Slate', p: '#0f172a', s: '#334155', bg: '#ffffff', text: '#0f172a' }
                  ].map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => updateConfig({
                        primaryColor: preset.p,
                        secondaryColor: preset.s,
                        backgroundColor: preset.bg,
                        textColor: preset.text
                      })}
                      className="group relative rounded-md border px-2 py-1 text-xs font-medium hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label={`Apply ${preset.name} color preset`}
                    >
                      <span className="pr-3">{preset.name}</span>
                      <span className="absolute right-1 top-1 flex gap-0.5">
                        <span style={{ background: preset.p }} className="w-2 h-2 rounded" />
                        <span style={{ background: preset.s }} className="w-2 h-2 rounded" />
                        <span style={{ background: preset.bg, border: '1px solid rgba(0,0,0,0.1)' }} className="w-2 h-2 rounded" />
                      </span>
                    </button>
                  ))}
                </div>

                {/* Contrast diagnostics */}
                <ColorContrastDiagnostics 
                  primary={currentConfig.primaryColor}
                  background={currentConfig.backgroundColor}
                  text={currentConfig.textColor}
                />
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select value={currentConfig.theme} onValueChange={(value: 'light' | 'dark' | 'auto') => updateConfig({ theme: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={currentConfig.primaryColor}
                        onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                        className="w-12 h-10 p-1 rounded border"
                      />
                      <Input
                        value={currentConfig.primaryColor}
                        onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                        placeholder="#3b82f6"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={currentConfig.secondaryColor}
                        onChange={(e) => updateConfig({ secondaryColor: e.target.value })}
                        className="w-12 h-10 p-1 rounded border"
                      />
                      <Input
                        value={currentConfig.secondaryColor}
                        onChange={(e) => updateConfig({ secondaryColor: e.target.value })}
                        placeholder="#1e40af"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Background Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={currentConfig.backgroundColor}
                        onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                        className="w-12 h-10 p-1 rounded border"
                      />
                      <Input
                        value={currentConfig.backgroundColor}
                        onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                        placeholder="#ffffff"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Text Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={currentConfig.textColor}
                        onChange={(e) => updateConfig({ textColor: e.target.value })}
                        className="w-12 h-10 p-1 rounded border"
                      />
                      <Input
                        value={currentConfig.textColor}
                        onChange={(e) => updateConfig({ textColor: e.target.value })}
                        placeholder="#1f2937"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Layout Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="w-4 h-4" />
                  Layout & Dimensions
                </CardTitle>
                <CardDescription>
                  Configure size and spacing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Width (px)</Label>
                    <Input
                      type="number"
                      value={currentConfig.width}
                      onChange={(e) => updateConfig({ width: safeParseInt(e.target.value, 400, 300, 800) })}
                      min="300"
                      max="800"
                      className={validationErrors.find(e => e.field === 'width') ? 'border-red-500' : ''}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Height (px)</Label>
                    <Input
                      type="number"
                      value={currentConfig.height}
                      onChange={(e) => updateConfig({ height: safeParseInt(e.target.value, 600, 400, 1000) })}
                      min="400"
                      max="1000"
                      className={validationErrors.find(e => e.field === 'height') ? 'border-red-500' : ''}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Border Radius: {currentConfig.borderRadius}px</Label>
                  <Slider
                    value={[currentConfig.borderRadius]}
                    onValueChange={([value]) => updateConfig({ borderRadius: value })}
                    max={50}
                    step={1}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Shadow Intensity: {currentConfig.shadowIntensity}</Label>
                  <Slider
                    value={[currentConfig.shadowIntensity]}
                    onValueChange={([value]) => updateConfig({ shadowIntensity: value })}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Content Alignment</Label>
                  <Select value={currentConfig.alignment} onValueChange={(value: 'left' | 'center' | 'right') => updateConfig({ alignment: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Typography & Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Typography & Features
                </CardTitle>
                <CardDescription>
                  Font settings and widget features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Select value={currentConfig.fontFamily} onValueChange={(value: WidgetFontFamily) => updateConfig({ fontFamily: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System Default</SelectItem>
                      <SelectItem value="inter">Inter</SelectItem>
                      <SelectItem value="roboto">Roboto</SelectItem>
                      <SelectItem value="open-sans">Open Sans</SelectItem>
                      <SelectItem value="lato">Lato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Font Size: {currentConfig.fontSize}px</Label>
                  <Slider
                    value={[currentConfig.fontSize]}
                    onValueChange={([value]) => updateConfig({ fontSize: value })}
                    min={10}
                    max={24}
                    step={1}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-logo">Show Logo</Label>
                    <Switch
                      id="show-logo"
                      checked={currentConfig.showLogo}
                      onCheckedChange={(checked) => updateConfig({ showLogo: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-description">Show Description</Label>
                    <Switch
                      id="show-description"
                      checked={currentConfig.showDescription}
                      onCheckedChange={(checked) => updateConfig({ showDescription: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enable-animations">Enable Animations</Label>
                    <Switch
                      id="enable-animations"
                      checked={currentConfig.enableAnimations}
                      onCheckedChange={(checked) => updateConfig({ enableAnimations: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="compact-mode">Compact Mode</Label>
                    <Switch
                      id="compact-mode"
                      checked={currentConfig.compactMode}
                      onCheckedChange={(checked) => updateConfig({ compactMode: checked })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking-Specific Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  {activeWidgetType === 'booking' ? 'Booking' : 'Catering'} Features
                </CardTitle>
                <CardDescription>
                  Advanced features specific to your {activeWidgetType} widget
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeWidgetType === 'booking' && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="table-optimization">Smart Table Optimization</Label>
                      <Switch
                        id="table-optimization"
                        checked={currentConfig.enableTableOptimization}
                        onCheckedChange={(checked) => updateConfig({ enableTableOptimization: checked })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="duration-selector">Show Duration Selector</Label>
                      <Switch
                        id="duration-selector"
                        checked={currentConfig.showDurationSelector}
                        onCheckedChange={(checked) => updateConfig({ showDurationSelector: checked })}
                      />
                    </div>
                  </>
                )}
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="availability-indicator">Show Availability Indicator</Label>
                  <Switch
                    id="availability-indicator"
                    checked={currentConfig.showAvailabilityIndicator}
                    onCheckedChange={(checked) => updateConfig({ showAvailabilityIndicator: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="special-requests">Enable Special Requests</Label>
                  <Switch
                    id="special-requests"
                    checked={currentConfig.enableSpecialRequests}
                    onCheckedChange={(checked) => updateConfig({ enableSpecialRequests: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="phone-booking">Enable Phone Booking</Label>
                  <Switch
                    id="phone-booking"
                    checked={currentConfig.enablePhoneBooking}
                    onCheckedChange={(checked) => updateConfig({ enablePhoneBooking: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="require-deposit">Require Deposit</Label>
                  <Switch
                    id="require-deposit"
                    checked={currentConfig.requireDeposit}
                    onCheckedChange={(checked) => updateConfig({ requireDeposit: checked })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Party Size</Label>
                    <Input
                      type="number"
                      value={currentConfig.maxPartySize}
                      onChange={(e) => updateConfig({ maxPartySize: parseInt(e.target.value) || 1 })}
                      min="1"
                      max="100"
                      className={validationErrors.find(e => e.field === 'maxPartySize') ? 'border-red-500' : ''}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Min Advance (hours)</Label>
                    <Input
                      type="number"
                      value={currentConfig.minAdvanceBooking}
                      onChange={(e) => updateConfig({ minAdvanceBooking: parseInt(e.target.value) || 0 })}
                      min="0"
                      max="48"
                      className={validationErrors.find(e => e.field === 'minAdvanceBooking') ? 'border-red-500' : ''}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Max Advance Booking (days)</Label>
                  <Input
                    type="number"
                    value={currentConfig.maxAdvanceBooking}
                    onChange={(e) => updateConfig({ maxAdvanceBooking: parseInt(e.target.value) || 30 })}
                    min="1"
                    max="365"
                    className={validationErrors.find(e => e.field === 'maxAdvanceBooking') ? 'border-red-500' : ''}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Booking Source</Label>
                  <Select value={currentConfig.bookingSource} onValueChange={(value: BookingSource) => updateConfig({ bookingSource: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="widget">Widget</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="partner">Partner Site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Widget Preview</h3>
              <p className="text-sm text-muted-foreground">
                Preview your {activeWidgetType} widget across different devices
              </p>
            </div>
            
            {/* Device selector */}
            <div className="flex items-center gap-3" aria-label="Preview controls" role="group">
              <Label htmlFor="device-select">Device:</Label>
              <Select value={previewDevice} onValueChange={(value: 'desktop' | 'tablet' | 'mobile') => setPreviewDevice(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue aria-label={`Current device ${previewDevice}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desktop">
                    <div className="flex items-center gap-2" aria-label="Desktop viewport">
                      <Monitor className="w-4 h-4" />
                      Desktop
                    </div>
                  </SelectItem>
                  <SelectItem value="tablet">
                    <div className="flex items-center gap-2" aria-label="Tablet viewport">
                      <Tablet className="w-4 h-4" />
                      Tablet
                    </div>
                  </SelectItem>
                  <SelectItem value="mobile">
                    <div className="flex items-center gap-2" aria-label="Mobile viewport">
                      <Smartphone className="w-4 h-4" />
                      Mobile
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Label htmlFor="scale-input" className="text-sm" title="Adjust preview zoom">Scale</Label>
                <Input id="scale-input" type="number" step="0.1" min="0.5" max="2" value={deviceScale}
                  onChange={(e) => setDeviceScale(Math.min(2, Math.max(0.5, parseFloat(e.target.value) || 1)))} className="w-20 h-8" />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="grid-toggle" className="text-sm" title="Toggle grid overlay for alignment">Grid</Label>
                <Switch id="grid-toggle" checked={showGrid} onCheckedChange={setShowGrid} aria-label="Toggle grid overlay" />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="safearea-toggle" className="text-sm" title="Toggle notch and safe-area for mobile">Safe-area</Label>
                <Switch id="safearea-toggle" checked={showSafeArea} onCheckedChange={setShowSafeArea} aria-label="Toggle notch and safe-area" />
              </div>
              <div className="flex items-center gap-2">
                {/* Live toggle removed */}
              </div>
            </div>
          </div>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-0">
              {/* Device Frame Background */}
              <div className={`min-h-[600px] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-8 ${showGrid ? 'bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:20px_20px]' : ''}` }>
                {/* Device Frame */}
                <div 
                  className={DEVICE_STYLES[previewDevice]}
                >
                  {/* Device chrome/frame */}
                  <div 
                    className={DEVICE_FRAME_STYLES[previewDevice]}
                  >
                    {/* Screen/viewport */}
                    <div 
                      className={DEVICE_SCREEN_STYLES[previewDevice]}
                    >
                      {/* Widget container with proper centering */}
                      <div className="h-full flex items-center justify-center p-4 bg-gray-50">
                        {/* Actual Widget Preview */}
                        <div 
                          className={`rounded-lg shadow-lg transition-all duration-300 overflow-hidden relative`}
                          style={widgetContainerStyle}
                          data-widget-preview="true"
                          role="region"
                          aria-label={`${activeWidgetType} widget preview (${previewDevice})`}
                        >
                          {/* Widget Content: Static design preview OR Live widget iframe */}
                          {liveWidgetUrl ? (
                            <>
                              <iframe
                                key={iframeKeyRef.current}
                                title={`${activeWidgetType} live widget preview`}
                                src={liveWidgetUrl || undefined}
                                style={{ width: currentConfig.width, height: currentConfig.height, border: '0', display: 'block', background: '#fff' }}
                                // Security: Removed allow-same-origin to ensure sandbox cannot access parent origin
                                sandbox="allow-scripts allow-forms allow-popups"
                                referrerPolicy="strict-origin-when-cross-origin"
                                onLoad={() => { if (import.meta.env.VITE_ANALYTICS_DEBUG === '1') { console.log('[WidgetManagement] iframe loaded', { url: liveWidgetUrl }); } }}
                              />
                              <div className="absolute top-2 left-2">
                                <Badge variant="secondary" className="text-xs">Live</Badge>
                                  </div>
                            </>
                          ) : (
                            <div className="h-full flex items-center justify-center p-6 text-center text-sm text-red-600">
                              Unable to load live widget – tenant slug required.
                                    </div>
                                  )}
                          
                          {/* Loading overlay for animations */}
                          {currentConfig.enableAnimations && (
                            <div className="absolute inset-0 pointer-events-none">
                              <div className={`w-full h-full ${ANIMATION_MAP[currentConfig.animationType]}`} />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Device status bar for mobile (notch/safe-area) */}
                      {previewDevice === 'mobile' && showSafeArea && (
                        <div className="absolute top-0 left-0 right-0 h-6 bg-black/80 rounded-t-2xl flex items-center justify-center" aria-hidden="true">
                          <div className="w-16 h-2 bg-white/40 rounded-full"></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Device home indicator for mobile */}
                    {previewDevice === 'mobile' && showSafeArea && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-24 h-1.5 bg-white/50 rounded-full" aria-hidden="true"></div>
                    )}
                  </div>
                  
                  {/* Device labels */}
                  <div className="mt-4 text-center">
                    <Badge variant="secondary" className="text-xs">
                      {previewDevice === 'desktop' && '🖥️ Desktop View (1200px+)'}
                      {previewDevice === 'tablet' && '📱 Tablet View (768px - 1024px)'}
                      {previewDevice === 'mobile' && '📱 Mobile View (320px - 767px)'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Preview Controls */}
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm text-muted-foreground">Live Preview</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Updates automatically as you configure
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    title="Refresh the preview"
                    aria-label="Refresh the preview"
                    onClick={() => {
                      // Trigger a re-render animation on the widget preview
                      const widget = document.querySelector('[data-widget-preview]');
                      if (widget && widget instanceof HTMLElement) {
                        widget.style.transform = 'scale(0.98)';
                        widget.style.opacity = '0.8';
                        setTimeout(() => {
                          widget.style.transform = '';
                          widget.style.opacity = '';
                        }, 150);
                      }
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleScreenshot} aria-label="Download widget preview screenshot" title="Download screenshot of the preview">
                    <Download className="w-4 h-4 mr-1" />
                    Screenshot
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg font-semibold">Widget Analytics</h3>
                {analyticsMeta?.time_range && (
                  <Badge variant="secondary" className="text-xs">Range: {analyticsMeta.time_range}</Badge>
                )}
                {/* Estimation badge removed: real-data-only policy */}
                {analyticsMeta?.version && (
                  <Badge variant="outline" className="text-xs">v{analyticsMeta.version}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Performance metrics for your {activeWidgetType} widget
                {!analyticsAvailable && " – connect tenant to enable analytics."}
                {(!analyticsLoading && analyticsData && analyticsData.totalViews === 0 && analyticsData.totalBookings === 0) && ' – no recorded activity yet.'}
                {analyticsError && ' – analytics temporarily unavailable.'}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={analyticsRange} onValueChange={(v: '1d' | '7d' | '30d') => setAnalyticsRange(v)}>
                <SelectTrigger className="w-28 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last 24h</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                </SelectContent>
              </Select>
              {analyticsError && (
                <Badge variant="destructive" className="text-xs">Error</Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshAnalytics(analyticsRange)}
                disabled={analyticsLoading}
              >
                {analyticsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  try {
                    const rows: string[] = [];
                    rows.push('source,count');
                    (analyticsData?.topSources || []).forEach(s => rows.push(`${s.source},${s.count}`));
                    rows.push('');
                    rows.push('date,views,bookings,revenue');
                    (analyticsData?.dailyStats || []).forEach(d => rows.push(`${d.date},${d.views},${d.bookings ?? ''},${d.revenue ?? ''}`));
                    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${resolvedTenantSlug || 'tenant'}-${activeWidgetType}-analytics.csv`;
                    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                  } catch (e) { console.error('CSV export failed', e); }
                }}
              >
                Export CSV
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metrics cards */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Views</p>
                    <p className="text-2xl font-bold">
                      {formatAnalyticsValue(analyticsData?.totalViews, analyticsFormatters.count)}
                    </p>
                  </div>
                  <Eye className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {activeWidgetType === 'booking' ? 'Total Bookings' : 'Total Orders'}
                    </p>
                    <p className="text-2xl font-bold">
                      {formatAnalyticsValue(analyticsData?.totalBookings, analyticsFormatters.count)}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                    <p className="text-2xl font-bold">
                      {formatAnalyticsValue(analyticsData?.completionRate, analyticsFormatters.percentage)}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {activeWidgetType === 'booking' ? 'Avg Party Size' : 'Avg Order Value'}
                    </p>
                    <p className="text-2xl font-bold">
                      {activeWidgetType === 'booking' 
                        ? formatAnalyticsValue(analyticsData?.avgPartySize, analyticsFormatters.decimal)
                        : formatAnalyticsValue(analyticsData?.avgOrderValue, analyticsFormatters.currency)
                      }
                    </p>
                  </div>
                  <RefreshCw className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top sources */}
            <Card>
              <CardHeader>
                <CardTitle>Top Traffic Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData?.topSources?.map((source, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{source.source}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ 
                              width: analyticsData?.topSources?.[0] 
                                ? `${(source.count / analyticsData.topSources[0].count) * 100}%` 
                                : '0%' 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">
                          {formatAnalyticsValue(source.count, analyticsFormatters.count)}
                        </span>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-4 text-muted-foreground">
                      {analyticsLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading analytics...
                        </div>
                      ) : (
                        "No traffic source data available"
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Performance metrics */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeWidgetType === 'booking' ? 'Booking Performance' : 'Order Performance'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeWidgetType === 'booking' && analyticsData?.peakHours && (
                    <div>
                      <p className="text-sm font-medium mb-2">Peak Booking Hours</p>
                      <div className="flex flex-wrap gap-2">
                        {analyticsData.peakHours.map((hour, index) => (
                          <Badge key={index} variant="secondary">{hour}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Conversion Rate</span>
                      <span className="font-medium text-green-600">
                        {formatAnalyticsValue(analyticsData?.conversionRate, analyticsFormatters.percentage)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Avg Session Duration</span>
                      <span className="font-medium">
                        {formatAnalyticsValue(analyticsData?.avgSessionDuration, analyticsFormatters.duration)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Completion Rate</span>
                      <span className="font-medium text-blue-600">
                        {formatAnalyticsValue(analyticsData?.completionRate, analyticsFormatters.percentage)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Daily performance chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Performance (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.dailyStats?.map((day, index) => (
                  <div key={index} className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 border rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium">{new Date(day.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Views</p>
                      <p className="font-medium text-blue-600">
                        {formatAnalyticsValue(day.views, analyticsFormatters.count)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        {activeWidgetType === 'booking' ? 'Bookings' : 'Orders'}
                      </p>
                      <p className="font-medium text-green-600">
                        {formatAnalyticsValue(day.bookings, analyticsFormatters.count)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="font-medium text-purple-600">
                        {formatAnalyticsValue(day.revenue, analyticsFormatters.currency)}
                      </p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    {analyticsLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Loading daily analytics...
                      </div>
                    ) : (
                      "No daily performance data available"
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deploy Tab */}
        <TabsContent value="embed" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">Deploy Your Widget</h3>
            <p className="text-sm text-muted-foreground">
              Copy and paste the embed code to integrate your {activeWidgetType} widget into your website
            </p>
          </div>

          {/* Generated embed code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Embed Code
              </CardTitle>
              <CardDescription>
                Add this code to your website where you want the widget to appear
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Embed options */}
                <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Embed options">
                  <Label className="text-sm">Format:</Label>
                  <Select value={embedType} onValueChange={(v: 'script' | 'iframe' | 'react') => setEmbedType(v)}>
                    <SelectTrigger className="w-28 h-8" aria-label="Select embed format"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="script">Script</SelectItem>
                      <SelectItem value="iframe">iFrame</SelectItem>
                      <SelectItem value="react">React</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="allowed-origin" className="text-sm" title="Origin of the widget (sender) accepted for postMessage">Allowed widget origin</Label>
                    <Input
                      id="allowed-origin"
                      className="h-8 w-64"
                      placeholder={typeof window !== 'undefined' ? window.location.origin : 'https://app.blunari.ai'}
                      value={allowedOriginInput}
                      onChange={(e) => setAllowedOriginInput(e.target.value)}
                      aria-invalid={!originState.valid}
                      aria-describedby={!originState.valid ? 'allowed-origin-error' : undefined}
                    />
                    {!originState.valid && (
                      <span id="allowed-origin-error" className="text-xs text-red-600">{originState.error}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="sandbox-toggle" className="text-sm" title="Add sandbox attr to iframe">Sandbox</Label>
                      <Switch id="sandbox-toggle" checked={iframeSandbox} onCheckedChange={setIframeSandbox} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="lazy-toggle" className="text-sm" title="Add loading=lazy">Lazy</Label>
                      <Switch id="lazy-toggle" checked={iframeLazy} onCheckedChange={setIframeLazy} />
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto border">
                    <code>{generateEmbedCode(activeWidgetType)}</code>
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(generateEmbedCode(activeWidgetType), 'Embed code')}
                    disabled={copyBusy || !originState.valid}
                    aria-label="Copy embed code"
                  >
                    {copyBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Enhanced Tenant-Specific Testing */}
                <div className="space-y-4">
                  {/* Primary Testing URL */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-blue-900">Tenant-Specific Testing URL</h4>
                      <Badge variant="outline" className="text-blue-700">
                        Tenant: {resolvedTenantSlug}
                      </Badge>
                    </div>
                    <p className="text-sm text-blue-700 mb-3">
                      Test your {activeWidgetType} widget with your specific tenant configuration:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-white p-2 rounded border text-sm">
                          {generateWidgetUrl(activeWidgetType)}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generateWidgetUrl(activeWidgetType), 'Widget URL')}
                          disabled={isLoading}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => window.open(generateWidgetUrl(activeWidgetType), '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Test Now
                        </Button>
                      </div>
                      
                      {/* Testing Instructions */}
                      <div className="bg-blue-25 p-3 rounded border border-blue-200">
                        <p className="text-xs text-blue-600 font-medium mb-1">Testing Checklist:</p>
                        <ul className="text-xs text-blue-600 space-y-1">
                          <li>✓ Verify {activeWidgetType} flow works end-to-end</li>
                          <li>✓ Check responsive design on mobile/tablet</li>
                          <li>✓ Test all configured features and settings</li>
                          <li>✓ Confirm tenant branding and colors display correctly</li>
                          {activeWidgetType === 'booking' && (
                            <>
                              <li>✓ Test table selection and availability</li>
                              <li>✓ Verify special requests functionality</li>
                              {currentConfig.requireDeposit && <li>✓ Test deposit payment flow</li>}
                            </>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Alternative Testing URLs */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-900 mb-2">Alternative Testing Options</h4>
                    <div className="space-y-3">
                      {/* Mobile Preview URL */}
                      <div>
                        <p className="text-sm text-green-700 mb-2">Mobile Preview (forced mobile view):</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-white p-2 rounded border text-xs">
                            {generateWidgetUrl(activeWidgetType)}&mobile=true&viewport=375x667
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(generateWidgetUrl(activeWidgetType) + '&mobile=true&viewport=375x667', '_blank')}
                          >
                            <Smartphone className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Debug Mode URL */}
                      <div>
                        <p className="text-sm text-green-700 mb-2">Debug Mode (with console logging):</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-white p-2 rounded border text-xs">
                            {generateWidgetUrl(activeWidgetType)}&debug=true&console=verbose
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(generateWidgetUrl(activeWidgetType) + '&debug=true&console=verbose', '_blank')}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Demo Data URL */}
                      <div>
                        <p className="text-sm text-green-700 mb-2">With Demo Data (for testing purposes):</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-white p-2 rounded border text-xs">
                            {generateWidgetUrl(activeWidgetType)}&demo=true&test_data=enabled
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(generateWidgetUrl(activeWidgetType) + '&demo=true&test_data=enabled', '_blank')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QR Code for Mobile Testing */}
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-purple-900 mb-1">Mobile Testing QR Code</h4>
                        <p className="text-sm text-purple-700">
                          Scan with your phone to test the widget on a real mobile device
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generateWidgetUrl(activeWidgetType))}`;
                          window.open(qrUrl, '_blank');
                        }}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Generate QR
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={currentConfig.isEnabled}
                    onCheckedChange={(checked) => updateConfig({ isEnabled: checked })}
                  />
                  <Label>Widget enabled</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Implementation guide and configuration summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Implementation guide */}
            <Card>
              <CardHeader>
                <CardTitle>Implementation Guide</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">1. Basic Implementation</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Simply paste the embed code into your HTML where you want the widget to appear.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">2. WordPress Integration</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Add the embed code to a Custom HTML block or use the Text widget in your theme.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">3. Shopify Integration</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Add the code to your theme's liquid files or use a Custom HTML section.
                    </p>
                  </div>
                  
                  {activeWidgetType === 'booking' && (
                    <div>
                      <h4 className="font-medium mb-2">4. Booking System Features</h4>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>• Real-time availability checking</p>
                        <p>• Table optimization and management</p>
                        <p>• Customer details collection</p>
                        <p>• Special requests handling</p>
                        {currentConfig.requireDeposit && <p>• Deposit payment processing</p>}
                        {currentConfig.enableSpecialRequests && <p>• Special requirements collection</p>}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Configuration summary */}
            <Card>
              <CardHeader>
                <CardTitle>Current Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Widget Type:</span>
                    <span className="capitalize">{activeWidgetType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Primary Color:</span>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: currentConfig.primaryColor }}
                      />
                      <span>{currentConfig.primaryColor}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Theme:</span>
                    <span className="capitalize">{currentConfig.theme}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Size:</span>
                    <span className="capitalize">{currentConfig.size}</span>
                  </div>
                  
                  {activeWidgetType === 'booking' && (
                    <>
                      <div className="flex justify-between">
                        <span className="font-medium">Max Party Size:</span>
                        <span>{currentConfig.maxPartySize || 'No limit'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Table Optimization:</span>
                        <span>{currentConfig.enableTableOptimization ? 'Enabled' : 'Disabled'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Deposit Required:</span>
                        <span>{currentConfig.requireDeposit ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Special Requests:</span>
                        <span>{currentConfig.enableSpecialRequests ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Testing & Validation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Tenant-Specific Testing & Validation
              </CardTitle>
              <CardDescription>
                Comprehensive testing guide for {tenant?.name || resolvedTenantSlug} ({activeWidgetType} widget)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Testing Steps */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium mt-0.5">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Test Tenant-Specific Widget URL</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        Verify your {activeWidgetType} widget loads correctly with tenant "{resolvedTenantSlug}" configuration
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(generateWidgetUrl(activeWidgetType), '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Test Primary URL
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(generateWidgetUrl(activeWidgetType) + '&mobile=true', '_blank')}
                        >
                          <Smartphone className="w-4 h-4 mr-1" />
                          Test Mobile
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(generateWidgetUrl(activeWidgetType) + '&debug=true', '_blank')}
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Debug Mode
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Verify Tenant Branding & Configuration</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>✓ Confirm primary color ({currentConfig.primaryColor}) displays correctly</p>
                        <p>✓ Check welcome message: "{currentConfig.welcomeMessage}"</p>
                        <p>✓ Verify button text: "{currentConfig.buttonText}"</p>
                        <p>✓ Test theme: {currentConfig.theme} mode</p>
                        <p>✓ Validate dimensions: {currentConfig.width}x{currentConfig.height}px</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Test Responsive Design</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>✓ Desktop view (1200px+): Full widget display</p>
                        <p>✓ Tablet view (768-1024px): Optimized layout</p>
                        <p>✓ Mobile view (320-767px): Touch-friendly interface</p>
                        <p>✓ Test portrait and landscape orientations</p>
                      </div>
                    </div>
                  </div>
                  
                  {activeWidgetType === 'booking' && (
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium mt-0.5">
                        4
                      </div>
                      <div>
                        <p className="font-medium">Complete Booking Flow Testing</p>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>✓ Customer details form validation</p>
                          <p>✓ Date & time selection with availability</p>
                          <p>✓ Party size selection (max: {currentConfig.maxPartySize})</p>
                          {currentConfig.enableTableOptimization && <p>✓ Table optimization functionality</p>}
                          {currentConfig.enableSpecialRequests && <p>✓ Special requests field</p>}
                          {currentConfig.requireDeposit && <p>✓ Deposit payment processing</p>}
                          <p>✓ Booking confirmation and receipt</p>
                          <p>✓ Email notifications (if configured)</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium mt-0.5">
                      {activeWidgetType === 'booking' ? '5' : '4'}
                    </div>
                    <div>
                      <p className="font-medium">Performance & Analytics Validation</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>✓ Widget load time (should be &lt;3 seconds)</p>
                        <p>✓ Analytics tracking functionality</p>
                        <p>✓ Error handling and user feedback</p>
                        <p>✓ Cross-browser compatibility testing</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium mt-0.5">
                      {activeWidgetType === 'booking' ? '6' : '5'}
                    </div>
                    <div>
                      <p className="font-medium">Integration Testing</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>✓ Test embed code in staging environment</p>
                        <p>✓ Verify widget works within iframe</p>
                        <p>✓ Check for CSS conflicts with parent site</p>
                        <p>✓ Test with different content management systems</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Test Actions */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Quick Test Actions</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const url = generateWidgetUrl(activeWidgetType);
                        copyToClipboard(url, 'Test URL');
                      }}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy URL
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(generateWidgetUrl(activeWidgetType))}`;
                        window.open(qrUrl, '_blank');
                      }}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      QR Code
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const mailtoUrl = `mailto:?subject=Test ${activeWidgetType} Widget - ${resolvedTenantSlug}&body=Please test our ${activeWidgetType} widget at: ${generateWidgetUrl(activeWidgetType)}`;
                        window.location.href = mailtoUrl;
                      }}
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Email Link
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(generateWidgetUrl(activeWidgetType) + '&screenshot=true', '_blank')}
                    >
                      <Camera className="w-4 h-4 mr-1" />
                      Screenshot
                    </Button>
                  </div>
                </div>

                {/* Tenant-Specific Test Data */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Tenant Test Configuration</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Tenant ID:</span> {tenant?.id || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Tenant Slug:</span> {resolvedTenantSlug}
                    </div>
                    <div>
                      <span className="font-medium">Widget Type:</span> {activeWidgetType}
                    </div>
                    <div>
                      <span className="font-medium">Configuration Version:</span> 2.0
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deployment status */}
          <Card>
            <CardHeader>
              <CardTitle>Deployment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="font-medium">Configuration</p>
                  <p className="text-sm text-muted-foreground">Complete</p>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="font-medium">
                    {activeWidgetType === 'booking' ? 'Booking Integration' : 'Testing'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activeWidgetType === 'booking' ? 'Connected' : 'Passed'}
                  </p>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="font-medium">Deployment</p>
                  <p className="text-sm text-muted-foreground">Ready</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </>
      )}
    </div>
  );
};

export default WidgetManagement;

