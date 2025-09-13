# 🎯 Tenant-Specific Widget Configuration System

## Overview

The Blunari SaaS platform implements a comprehensive tenant-specific widget configuration system that ensures each restaurant tenant can customize their booking and catering widgets independently, without affecting other tenants' configurations.

## 🏗️ Architecture

### Tenant Isolation
Each tenant has completely isolated widget configurations through:

1. **Unique Storage Namespaces**
   ```
   blunari-widget-config-{widgetType}-{tenantIdentifier}
   ```
   - `widgetType`: 'booking' or 'catering'
   - `tenantIdentifier`: Combination of tenant ID and slug for uniqueness

2. **Cross-Reference Storage**
   ```
   blunari-tenant-widgets-{tenantIdentifier}
   ```
   - Contains array of all widget configurations for a tenant
   - Enables bulk operations and tenant management

3. **Tenant Context in URLs**
   ```
   /{widgetType}/{tenantSlug}?tenant_id={id}&config_id={identifier}&timezone={tz}&currency={curr}
   ```

## 🎨 Customization Features

### Per-Tenant Configuration
Each tenant can customize:
- **Visual Design**: Colors, themes, fonts, layout
- **Content**: Welcome messages, descriptions, button text
- **Functionality**: Features enabled/disabled per tenant
- **Branding**: Logo, company-specific messaging
- **Localization**: Timezone, currency, language preferences

### Configuration Storage
```typescript
interface TenantWidgetConfig {
  // Widget appearance
  theme: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  
  // Layout & dimensions
  width: number;
  height: number;
  borderRadius: number;
  
  // Content & messaging
  welcomeMessage: string;
  description: string;
  buttonText: string;
  
  // Tenant metadata
  tenantId: string;
  tenantSlug: string;
  configId: string;
  lastSaved: string;
  version: string;
}
```

## 🔧 Implementation Details

### Widget Configuration Hook
```typescript
export function useWidgetConfig(
  initialType: WidgetType, 
  tenantId?: string | null, 
  tenantSlug?: string | null
) {
  // Enhanced tenant identification with priority system
  const tenantIdentifier = useMemo(() => {
    if (tenantId && tenantSlug) {
      return `${tenantId}-${tenantSlug}`;
    } else if (tenantId) {
      return tenantId;
    } else if (tenantSlug) {
      return tenantSlug;
    } else {
      return 'demo';
    }
  }, [tenantId, tenantSlug]);
  
  // Tenant-specific storage and configuration management
  // ...
}
```

### URL Generation with Tenant Context
```typescript
const generateWidgetUrl = useCallback((type: 'booking' | 'catering') => {
  const configParams = new URLSearchParams();
  
  // Essential tenant parameters
  configParams.set('slug', effectiveSlug);
  configParams.set('tenant_id', tenant?.id || 'demo');
  configParams.set('config_id', tenantIdentifier);
  
  // Tenant context parameters
  if (tenant?.timezone) {
    configParams.set('timezone', tenant.timezone);
  }
  if (tenant?.currency) {
    configParams.set('currency', tenant.currency);
  }
  
  // Widget-specific configuration parameters
  // ...
}, [tenant, tenantIdentifier]);
```

## 📊 Storage Strategy

### Local Storage Structure
```
localStorage:
├── blunari-widget-config-booking-demo
├── blunari-widget-config-catering-demo
├── blunari-widget-config-booking-{tenantId}-{slug}
├── blunari-widget-config-catering-{tenantId}-{slug}
├── blunari-tenant-widgets-demo
└── blunari-tenant-widgets-{tenantId}-{slug}
```

### Configuration Validation
Each configuration is validated before saving:
- Required fields validation
- Data type checking
- Range validation for numeric values
- Color format validation
- URL safety for text content

## 🚀 Usage Examples

### Accessing Widget Management
1. Navigate to `/dashboard/widget-management`
2. Current tenant is automatically detected from session
3. Configuration namespace is created: `blunari-widget-config-{type}-{tenantId}-{slug}`

### Embedding Widgets
```html
<!-- Booking Widget for specific tenant -->
<iframe 
  src="/book/pizza-artisan?source=website&tenant_id=123&config_id=123-pizza-artisan"
  width="400" 
  height="600" 
  frameborder="0">
</iframe>

<!-- Catering Widget with custom theme -->
<iframe 
  src="/catering/green-garden?theme=eco&primaryColor=%2310b981&tenant_id=456"
  width="400" 
  height="700" 
  frameborder="0">
</iframe>
```

### JavaScript Embed
```javascript
// Automatic tenant detection from script parameters
<script>
  (function() {
    var widget = document.createElement('div');
    var iframe = document.createElement('iframe');
    iframe.src = '/book/demo?source=js-embed&tenant_id=auto&config_id=auto';
    widget.appendChild(iframe);
    document.body.appendChild(widget);
  })();
</script>
```

## 🔒 Security & Isolation

### Tenant Data Protection
- **Storage Isolation**: Each tenant's configuration is stored in separate localStorage keys
- **URL Validation**: Tenant identifiers are validated before configuration access
- **Cross-Tenant Prevention**: Configuration loading validates tenant ownership
- **Fallback Handling**: Invalid configurations fall back to safe defaults

### Configuration Validation
```typescript
// Tenant ownership validation
if (parsed.tenantId === tenantId || parsed.tenantSlug === tenantSlug || tenantIdentifier === 'demo') {
  // Configuration is valid for current tenant
  setCurrentConfig(merged);
} else {
  // Configuration belongs to different tenant, use defaults
  setCurrentConfig(getDefaultConfig(activeWidgetType));
}
```

## 📤 Export & Import

### Configuration Export
```typescript
const exportTenantConfiguration = () => {
  const exportData = {
    tenantId,
    tenantSlug,
    tenantIdentifier,
    exportDate: new Date().toISOString(),
    version: '2.0',
    configurations: getTenantConfigurations()
  };
  
  // Download as JSON file
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  // ... download logic
};
```

### Configuration Import
- Validate tenant ownership
- Merge with existing configurations
- Backup current configuration before import
- Validate imported data structure

## 🎯 Multi-Tenant Benefits

### For Restaurant Owners
- **Brand Consistency**: Widgets match restaurant's visual identity
- **Custom Messaging**: Personalized welcome messages and descriptions
- **Localized Experience**: Timezone and currency-appropriate displays
- **Independent Management**: No interference from other restaurants' settings

### For Platform Administrators
- **Scalable Architecture**: Unlimited tenants without configuration conflicts
- **Easy Debugging**: Clear tenant identification in logs and storage
- **Bulk Operations**: Export/import capabilities for tenant management
- **Performance**: Efficient storage and retrieval with namespace isolation

### For Developers
- **Clear Separation**: Tenant-specific code paths and storage
- **Extensible Design**: Easy to add new tenant-specific features
- **Type Safety**: Full TypeScript support for configuration objects
- **Testing**: Demo tenant for development and testing

## 🔮 Future Enhancements

### Planned Features
1. **Database Storage**: Move from localStorage to persistent database storage
2. **Real-time Sync**: Configuration changes sync across multiple browser sessions
3. **Template System**: Pre-built configuration templates for different restaurant types
4. **A/B Testing**: Multi-variant widget configurations for performance testing
5. **Analytics Integration**: Track widget performance per tenant
6. **API Access**: RESTful API for programmatic configuration management

### Advanced Customization
1. **Custom CSS Injection**: Allow tenants to inject custom CSS
2. **Widget Plugins**: Extensible plugin system for additional functionality
3. **Multi-language Support**: Per-tenant language configurations
4. **Advanced Branding**: Custom fonts, logos, and complete theme packages
5. **Integration APIs**: Connect with tenant's existing systems (POS, CRM, etc.)

## 📝 Best Practices

### For Tenants
- Use consistent branding across booking and catering widgets
- Test widgets on different devices and screen sizes
- Regularly export configurations as backup
- Keep welcome messages concise and clear
- Use high-contrast colors for accessibility

### For Developers
- Always validate tenant context before configuration access
- Implement proper error handling for invalid configurations
- Use TypeScript types for configuration objects
- Follow the namespace pattern for new storage keys
- Test with multiple tenant scenarios

## 🚨 Troubleshooting

### Common Issues
1. **Configuration Not Loading**: Check tenant identifier format
2. **Cross-Tenant Pollution**: Ensure proper namespace isolation
3. **Default Fallback**: Verify fallback logic for missing configurations
4. **URL Generation**: Validate tenant slug and ID parameters

### Debug Commands
```javascript
// Check current tenant configuration
localStorage.getItem('blunari-widget-config-booking-{tenantId}-{slug}');

// List all tenant configurations
Object.keys(localStorage).filter(key => key.startsWith('blunari-widget-config'));

// Clear tenant configurations (development only)
Object.keys(localStorage)
  .filter(key => key.startsWith('blunari-widget-config-'))
  .forEach(key => localStorage.removeItem(key));
```

---

This tenant-specific widget configuration system ensures that each restaurant in the Blunari SaaS platform can create a unique, branded widget experience for their customers while maintaining complete isolation from other tenants' configurations.