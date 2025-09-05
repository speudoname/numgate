# NeoBrutalism.dev Components Guide

## CRITICAL REQUIREMENT
**We use ONLY NeoBrutalism.dev components for ALL UI elements. No custom components or styling allowed.**

## What is NeoBrutalism.dev?
NeoBrutalism.dev provides a collection of pre-built React components with a distinctive brutalist design aesthetic. These components are based on shadcn/ui but styled with bold borders, sharp corners, and striking shadows.

## Installation Process

### Step 1: Initialize Shadcn UI
First, you need shadcn/ui as NeoBrutalism components are built on top of it:
```bash
npx shadcn-ui@latest init
```
**Important**: Choose "CSS variables" mode (NOT utility classes)

### Step 2: Visit NeoBrutalism.dev
Go to https://www.neobrutalism.dev to browse components

### Step 3: Install Components
For each component you need:
1. Go to the component page on neobrutalism.dev
2. Find the CLI command or manual installation instructions
3. Copy the component code to `components/ui/[component-name].tsx`

## Available Components

### Core Components
- **Button** - Primary actions, various sizes and variants
- **Card** - Content containers with bold borders
- **Input** - Text input fields
- **Textarea** - Multi-line text input
- **Select** - Dropdown selections
- **Checkbox** - Boolean selections
- **Radio Group** - Single choice from multiple options
- **Switch** - Toggle switches
- **Label** - Form labels

### Layout Components
- **Sidebar** - Navigation sidebar
- **Navigation Menu** - Top navigation
- **Tabs** - Tabbed content
- **Accordion** - Collapsible content sections
- **Breadcrumb** - Navigation path display

### Feedback Components
- **Alert** - Information messages
- **Alert Dialog** - Confirmation dialogs
- **Dialog** - Modal windows
- **Drawer** - Slide-out panels
- **Popover** - Floating content
- **Tooltip** - Hover information
- **Progress** - Loading/progress indicators
- **Badge** - Status indicators
- **Sonner** - Toast notifications

### Data Display
- **Table** - Data tables
- **Pagination** - Page navigation
- **Avatar** - User avatars
- **Image Card** - Image with content
- **Skeleton** - Loading placeholders

### Interactive Components
- **Calendar** - Date picker calendar
- **Date Picker** - Date selection
- **Combobox** - Searchable dropdown
- **Command** - Command palette
- **Carousel** - Image/content slider
- **Slider** - Value slider
- **Marquee** - Scrolling text

### Advanced Components
- **Form** - Complete form handling
- **Chart** - Data visualization
- **Resizable** - Resizable panels
- **Scroll Area** - Custom scrollbars
- **Context Menu** - Right-click menus
- **Dropdown Menu** - Action menus
- **Hover Card** - Hover content cards
- **Input OTP** - One-time password input

## How to Use Components

### Example: Using a Button
```tsx
import { Button } from '@/components/ui/button'

// In your component:
<Button>Click Me</Button>
```

### Example: Using a Card
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

// In your component:
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>
```

### Example: Using Forms
```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

// In your component:
<form>
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="Enter email" />
  <Button type="submit">Submit</Button>
</form>
```

## Design Principles

### NeoBrutalism Characteristics
1. **Bold Borders**: All components have thick black borders
2. **Sharp Corners**: No or minimal border radius
3. **Strong Shadows**: Distinctive box shadows for depth
4. **High Contrast**: Black on white or vibrant colors
5. **Geometric Shapes**: Simple, bold shapes
6. **Typography**: Bold, clear hierarchy

### Color Palette
- Background: White (#ffffff)
- Foreground: Black (#000000)
- Primary: Blue (#88aaee)
- Borders: Black (#000000)
- Shadows: Black with offset

## STRICT RULES FOR DEVELOPMENT

1. **NEVER create custom UI components** - Always use NeoBrutalism.dev
2. **NEVER write custom styles** - Use only what NeoBrutalism provides
3. **ALWAYS check neobrutalism.dev** before implementing any UI element
4. **ALWAYS copy exact component code** from their documentation
5. **NEVER modify the core styling** of NeoBrutalism components
6. **ALWAYS use the component variants** they provide

## Common Patterns

### Page Layout
```tsx
<div className="min-h-screen bg-background">
  <div className="container mx-auto p-6">
    <Card>
      {/* Content */}
    </Card>
  </div>
</div>
```

### Form Layout
```tsx
<Card>
  <CardHeader>
    <CardTitle>Form Title</CardTitle>
  </CardHeader>
  <CardContent>
    <form className="space-y-4">
      <div>
        <Label>Field Label</Label>
        <Input />
      </div>
      <Button type="submit">Submit</Button>
    </form>
  </CardContent>
</Card>
```

### List/Grid Layout
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <Card key={item.id}>
      {/* Item content */}
    </Card>
  ))}
</div>
```

## Resources

- **Official Site**: https://www.neobrutalism.dev
- **Components List**: https://www.neobrutalism.dev/components
- **Documentation**: https://www.neobrutalism.dev/docs
- **GitHub**: https://github.com/ekmas/neobrutalism-components
- **Shadcn UI**: https://ui.shadcn.com (base components)

## Important Notes

1. Components are installed individually, not as a package
2. Each component needs to be copied to your project
3. Components use CSS variables for theming
4. Always check component-specific documentation for variants
5. Some components have different APIs than standard shadcn

## Checklist for New UI Implementation

- [ ] Check if NeoBrutalism.dev has the component you need
- [ ] Go to the component page on neobrutalism.dev
- [ ] Copy the component code exactly
- [ ] Place in `components/ui/` directory
- [ ] Import and use without modifications
- [ ] If component doesn't exist, ask for alternatives (DON'T create custom)

---

**Remember: We build NOTHING without NeoBrutalism.dev components. This is a strict requirement with NO exceptions.**