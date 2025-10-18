# UI Design Guidelines

This document outlines the design system, patterns, and best practices for the Blunari Restaurant Management Dashboard.

## Design Tokens

### Color System

Our color system is built on semantic tokens that adapt to light/dark modes and maintain proper contrast ratios.

#### Primary Colors

```css
--brand: 220 100% 50% /* Primary brand color */ --brand-foreground: 0 0% 100%
  /* Text on brand backgrounds */;
```

#### Surface Colors

```css
--surface: 0 0% 100% /* Main background */ --surface-2: 240 5% 96%
  /* Secondary surfaces */ --surface-3: 240 5% 92% /* Tertiary surfaces */;
```

#### Text Colors

```css
--text: 240 10% 4% /* Primary text */ --text-muted: 240 4% 46%
  /* Secondary text */ --text-subtle: 240 3% 64% /* Tertiary text */;
```

#### Semantic Colors

```css
--success: 142 76% 36% /* Success states */ --warning: 38 92% 50%
  /* Warning states */ --danger: 0 84% 60% /* Error/destructive states */;
```

### Typography Scale

Typography uses the Inter font with specific weights and line heights optimized for readability.

#### Headings

- **H1**: 30px / 36px (1.2 line height)
- **H2**: 24px / 32px (1.33 line height)
- **H3**: 20px / 28px (1.4 line height)
- **H4**: 18px / 26px (1.44 line height)

#### Body Text

- **Body**: 16px / 24px (1.5 line height)
- **Body Small**: 14px / 20px (1.43 line height)
- **Code**: 13px / 20px (1.54 line height)

### Spacing System

Our spacing system uses a 4px base unit with a consistent scale:

```
1 = 4px   | 2 = 8px   | 3 = 12px  | 4 = 16px
5 = 20px  | 6 = 24px  | 8 = 32px  | 10 = 40px
12 = 48px | 16 = 64px
```

### Elevation & Shadows

```css
--shadow-elev-1:
  0 1px 3px rgba(0, 0, 0, 0.12),
  0 1px 2px rgba(0, 0, 0, 0.24) --shadow-elev-2: 0 3px 6px rgba(0, 0, 0, 0.16),
  0 3px 6px rgba(0, 0, 0, 0.23) --shadow-elev-3: 0 10px 20px rgba(0, 0, 0, 0.19),
  0 6px 6px rgba(0, 0, 0, 0.23);
```

## Component Patterns

### Buttons

#### Primary Actions

```tsx
<Button variant="default">Primary Action</Button>
```

- Use for the main action on a page/section
- High contrast brand color
- Only one primary button per section

#### Secondary Actions

```tsx
<Button variant="outline">Secondary Action</Button>
```

- Use for less important actions
- Outline style to reduce visual weight

#### Destructive Actions

```tsx
<Button variant="destructive">Delete Item</Button>
```

- Use for dangerous actions
- Always require confirmation
- Use warning colors

### Cards

Cards are the primary container component for grouping related content.

#### Standard Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content goes here</CardContent>
</Card>
```

#### Metrics Card

```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Metric Name</CardTitle>
    <Icon className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">$1,234</div>
    <p className="text-xs text-muted-foreground">+12% from last month</p>
  </CardContent>
</Card>
```

### Forms

#### Form Structure

```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
    <FormField
      control={form.control}
      name="fieldName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Field Label</FormLabel>
          <FormControl>
            <Input placeholder="Placeholder text" {...field} />
          </FormControl>
          <FormDescription>Helpful description text</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

#### Validation States

- **Error**: Red border, error message below
- **Success**: Green border, success message
- **Loading**: Disabled state with spinner

### Tables

#### Standard Table

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column 1</TableHead>
      <TableHead>Column 2</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Data 1</TableCell>
      <TableCell>Data 2</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

#### Interactive Rows

- Hover states for all interactive rows
- Selection states with checkboxes
- Action menus aligned to the right

## Motion & Animation

### Animation Principles

1. **Purposeful**: Every animation should have a clear purpose
2. **Performant**: Use transform and opacity for smooth animations
3. **Accessible**: Respect `prefers-reduced-motion`
4. **Consistent**: Use standardized timing and easing

### Timing

- **Fast**: 150ms for micro-interactions
- **Normal**: 300ms for page transitions
- **Slow**: 500ms for complex animations

### Easing

```css
--motion-easing: cubic-bezier(0.4, 0, 0.2, 1);
```

### Examples

```tsx
// Page transitions
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>

// Hover states
<Button className="transition-colors hover:bg-primary/90">
  Button
</Button>
```

## Accessibility Guidelines

### Focus Management

#### Focus Rings

All interactive elements must have visible focus indicators:

```css
.focus-visible:outline-none
.focus-visible:ring-2
.focus-visible:ring-brand
.focus-visible:ring-offset-2
```

#### Focus Order

- Logical tab order top to bottom, left to right
- Skip links for keyboard navigation
- Focus trapping in modals

### ARIA Patterns

#### Labels

```tsx
// Icon buttons need labels
<Button aria-label="Close dialog">
  <X className="h-4 w-4" />
</Button>

// Form fields need proper labeling
<Label htmlFor="email">Email Address</Label>
<Input id="email" type="email" />
```

#### Live Regions

```tsx
// For dynamic content updates
<div aria-live="polite" aria-label="Notifications">
  {notifications.map((notification) => (
    <Toast key={notification.id}>{notification.message}</Toast>
  ))}
</div>
```

#### Landmarks

```tsx
<main role="main">
  <header role="banner">
    <nav role="navigation" aria-label="Main navigation">
```

### Color Contrast

- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text**: Minimum 3:1 contrast ratio
- **Interactive elements**: Minimum 3:1 for focus states

## Layout Patterns

### Grid System

Use CSS Grid for complex layouts:

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}
```

### Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Safe Areas

For mobile devices with notches:

```css
.mobile-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
```

## Performance Guidelines

### Image Optimization

- Use WebP format when possible
- Implement lazy loading for below-fold images
- Provide appropriate alt text

### Bundle Splitting

- Code split by route for large pages
- Lazy load heavy components
- Preload critical resources

### Animation Performance

- Use `transform` and `opacity` for animations
- Avoid animating layout properties
- Use `will-change` sparingly

## Do's and Don'ts

### ✅ Do's

- **Consistency**: Use design tokens throughout
- **Accessibility**: Test with keyboard and screen readers
- **Performance**: Optimize for mobile and slow connections
- **Semantic HTML**: Use proper HTML elements
- **Progressive Enhancement**: Ensure functionality without JavaScript

### ❌ Don'ts

- **Don't** use hardcoded colors or spacing values
- **Don't** animate layout properties like `width` or `height`
- **Don't** override focus states without providing alternatives
- **Don't** use placeholder text as labels
- **Don't** auto-play animations for users who prefer reduced motion

## Testing Checklist

### Visual QA

- [ ] Design matches specifications
- [ ] Consistent spacing and typography
- [ ] Proper color contrast ratios
- [ ] Responsive across breakpoints

### Accessibility QA

- [ ] Keyboard navigation works
- [ ] Screen reader friendly
- [ ] Focus indicators visible
- [ ] ARIA labels present

### Performance QA

- [ ] Images optimized and lazy loaded
- [ ] No layout shift on load
- [ ] Animations respect reduced motion
- [ ] Bundle size reasonable

## Development Tools

### Design QA Overlay

Use `Ctrl+Shift+Q` in development to toggle the Design QA overlay which shows:

- Spacing grid and baseline
- Contrast checking
- Typography validation
- Focus indicator testing

### Visual Regression Testing

Run Playwright tests to catch visual regressions:

```bash
npx playwright test tests/visual.spec.ts
```

### Browser Extensions

Recommended tools for manual testing:

- **axe DevTools**: Accessibility testing
- **Lighthouse**: Performance and SEO audit
- **Colour Contrast Analyser**: WCAG compliance

---

This document serves as the single source of truth for UI patterns and should be updated whenever new patterns are introduced or existing ones are modified.
