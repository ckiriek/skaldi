# 🎨 UI/UX Implementation Plan for Asetria

**Last Updated:** 2025-11-11  
**Status:** Planning Phase  
**Based on:** Modern MedTech SaaS Design Guidelines

---

## 📊 Current State Analysis

### ✅ What We Have
- **Framework:** Next.js 14 + React + TypeScript
- **Styling:** Tailwind CSS + CSS Variables
- **Components:** shadcn/ui (Radix UI primitives)
- **Icons:** Lucide React
- **Design System:** Partial (basic color tokens, button variants)

### 🎨 Current Design
**Colors:**
- Primary: `hsl(221.2 83.2% 53.3%)` - Blue (#3B82F6 approx)
- Secondary: `hsl(210 40% 96.1%)` - Light gray
- Destructive: `hsl(0 84.2% 60.2%)` - Red
- Background: White
- Foreground: Dark gray

**Typography:**
- Font: System fonts (no custom webfont)
- Base size: 16px
- Inconsistent hierarchy

**Components:**
- Basic Button (6 variants)
- Card, Label, Radio Group
- No comprehensive design system

### ❌ What's Missing (Per Guidelines)

1. **Color System:**
   - No medical-grade color palette (trust colors)
   - Missing status colors (success, warning, info)
   - No semantic color naming
   - No accessibility-checked contrasts

2. **Typography:**
   - No professional webfont (Inter recommended)
   - No defined type scale
   - Missing text hierarchy classes
   - No line-height system

3. **Spacing System:**
   - No 8px grid system
   - Inconsistent spacing
   - No defined spacing scale

4. **Components:**
   - Missing: Input, Select, Checkbox, Table, Modal, Toast
   - No form validation styles
   - No loading states (skeleton, spinner)
   - No hover/focus states standardized
   - No empty states

5. **Layout:**
   - No grid system
   - No responsive breakpoints defined
   - No dashboard layout template

6. **Animations:**
   - No micro-interactions
   - No transition system
   - No loading animations

---

## 🎯 Implementation Strategy

### Phase 1: Foundation (Week 1) - PRIORITY
**Goal:** Establish design system foundation

#### 1.1 Color System Overhaul
**File:** `app/globals.css`

**New Palette (Medical-Grade):**
```css
:root {
  /* Base Colors */
  --background: 0 0% 100%;           /* #FFFFFF - Pure white */
  --foreground: 220 13% 13%;         /* #1F2937 - Almost black */
  
  /* Primary (Trust Blue/Teal) */
  --primary: 199 89% 48%;            /* #0EA5E9 - Sky blue (medical trust) */
  --primary-hover: 199 89% 42%;      /* Darker on hover */
  --primary-foreground: 0 0% 100%;   /* White text */
  
  /* Secondary (Neutral) */
  --secondary: 210 40% 96%;          /* #F2F4F7 - Very light gray */
  --secondary-hover: 210 40% 92%;    
  --secondary-foreground: 220 13% 20%; /* #344054 - Dark gray */
  
  /* Status Colors */
  --success: 142 71% 45%;            /* #27AE60 - Natural green */
  --success-bg: 142 76% 96%;         /* #ECFDF3 - Light green bg */
  --warning: 38 92% 50%;             /* #F2994A - Amber */
  --warning-bg: 48 100% 96%;         /* #FFFAF0 - Light amber bg */
  --error: 0 72% 51%;                /* #EB5757 - Red */
  --error-bg: 0 86% 97%;             /* #FEF3F2 - Light red bg */
  --info: 199 89% 48%;               /* #2D9CDB - Blue */
  --info-bg: 199 95% 97%;            /* #F0F9FF - Light blue bg */
  
  /* Neutral Grays (8-step scale) */
  --gray-50: 210 40% 98%;            /* #FCFCFD */
  --gray-100: 210 40% 96%;           /* #F9FAFB */
  --gray-200: 214 32% 91%;           /* #EAECF0 */
  --gray-300: 213 27% 84%;           /* #D0D5DD */
  --gray-400: 215 20% 65%;           /* #98A2B3 */
  --gray-500: 215 16% 47%;           /* #667085 */
  --gray-600: 215 19% 35%;           /* #475467 */
  --gray-700: 217 19% 27%;           /* #344054 */
  --gray-800: 215 25% 17%;           /* #1D2939 */
  --gray-900: 220 13% 13%;           /* #101828 */
  
  /* UI Elements */
  --border: 214 32% 91%;             /* #EAECF0 */
  --input: 214 32% 91%;              /* #EAECF0 */
  --ring: 199 89% 48%;               /* Focus ring = primary */
  
  /* Spacing (8px grid) */
  --spacing-unit: 8px;
  --radius: 8px;                     /* Slightly rounded (medical-friendly) */
}
```

**Actions:**
- [ ] Update `globals.css` with new color system
- [ ] Add semantic color classes
- [ ] Create color documentation
- [ ] Test WCAG AA contrast ratios (4.5:1 minimum)

#### 1.2 Typography System
**File:** `app/globals.css`, `tailwind.config.ts`

**Font Stack:**
- Primary: Inter (Google Fonts)
- Fallback: system-ui, -apple-system, sans-serif

**Type Scale (8px baseline):**
```css
/* Headings */
--text-h1: 32px;      /* 4 * 8px */
--text-h2: 24px;      /* 3 * 8px */
--text-h3: 20px;      /* 2.5 * 8px */
--text-h4: 18px;      /* 2.25 * 8px */

/* Body */
--text-base: 16px;    /* 2 * 8px - default */
--text-sm: 14px;      /* 1.75 * 8px */
--text-xs: 12px;      /* 1.5 * 8px */

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

**Actions:**
- [ ] Add Inter font from Google Fonts
- [ ] Create typography utility classes
- [ ] Define heading hierarchy
- [ ] Update all text elements

#### 1.3 Spacing System (8px Grid)
**File:** `tailwind.config.ts`

```typescript
spacing: {
  '0': '0',
  '1': '8px',    // 1 unit
  '2': '16px',   // 2 units
  '3': '24px',   // 3 units
  '4': '32px',   // 4 units
  '5': '40px',   // 5 units
  '6': '48px',   // 6 units
  '8': '64px',   // 8 units
  '10': '80px',  // 10 units
  '12': '96px',  // 12 units
}
```

**Actions:**
- [ ] Update Tailwind spacing scale
- [ ] Apply to all components
- [ ] Document spacing rules

---

### Phase 2: Core Components (Week 2)

#### 2.1 Form Components
**Priority: HIGH** (forms are critical in medical apps)

**Components to Build:**

1. **Input Field** (`components/ui/input.tsx`)
   - States: default, focus, error, disabled, success
   - Variants: text, email, tel, number, password
   - Features: label, helper text, error message, icon support
   - Accessibility: ARIA labels, focus management

2. **Select/Dropdown** (`components/ui/select.tsx`)
   - Native + custom styled versions
   - Searchable variant
   - Multi-select support
   - Keyboard navigation

3. **Checkbox** (`components/ui/checkbox.tsx`)
   - Custom styled (not native)
   - Indeterminate state
   - Label integration

4. **Textarea** (`components/ui/textarea.tsx`)
   - Auto-resize option
   - Character counter
   - Error states

5. **Form Wrapper** (`components/ui/form.tsx`)
   - Form context
   - Validation integration (Zod)
   - Error handling
   - Submit states

**Design Specs:**
- Height: 40px (5 * 8px)
- Padding: 8px 12px
- Border: 1px solid var(--border)
- Border-radius: 8px
- Focus: 2px ring, primary color
- Error: Red border + message below

**Actions:**
- [ ] Build Input component with all states
- [ ] Build Select component
- [ ] Build Checkbox component
- [ ] Build Textarea component
- [ ] Build Form wrapper
- [ ] Create form validation patterns
- [ ] Add accessibility features
- [ ] Write Storybook stories

#### 2.2 Feedback Components

1. **Toast/Notification** (`components/ui/toast.tsx`)
   - Variants: success, error, warning, info
   - Auto-dismiss (3-5s)
   - Action buttons
   - Position: top-right

2. **Alert** (`components/ui/alert.tsx`)
   - Inline alerts
   - Variants: success, error, warning, info
   - Dismissible option

3. **Skeleton Loader** (`components/ui/skeleton.tsx`)
   - Animated pulse
   - Various shapes (text, card, table)

4. **Spinner** (`components/ui/spinner.tsx`)
   - Size variants
   - Color variants
   - Inline/overlay modes

**Actions:**
- [ ] Build Toast system
- [ ] Build Alert component
- [ ] Build Skeleton loader
- [ ] Build Spinner component
- [ ] Add animation system

#### 2.3 Data Display Components

1. **Table** (`components/ui/table.tsx`)
   - Sortable columns
   - Row selection
   - Hover states
   - Zebra striping option
   - Responsive (mobile cards)
   - Empty state

2. **Badge** (`components/ui/badge.tsx`)
   - Variants: default, success, warning, error, info
   - Sizes: sm, md, lg
   - With/without icon

3. **Progress Bar** (`components/ui/progress.tsx`)
   - Linear progress
   - Circular progress
   - With percentage label

**Actions:**
- [ ] Build Table component
- [ ] Build Badge component
- [ ] Build Progress component
- [ ] Add sorting/filtering logic
- [ ] Create empty states

---

### Phase 3: Layout & Navigation (Week 3)

#### 3.1 Dashboard Layout
**File:** `components/layouts/dashboard-layout.tsx`

**Structure:**
```
┌─────────────────────────────────────┐
│         Top Bar (64px)              │
├─────────┬───────────────────────────┤
│         │                           │
│ Sidebar │      Main Content         │
│ (240px) │      (fluid)              │
│         │                           │
│         │                           │
└─────────┴───────────────────────────┘
```

**Features:**
- Fixed top bar
- Collapsible sidebar
- Breadcrumbs
- User menu
- Notifications
- Search bar

**Actions:**
- [ ] Build DashboardLayout component
- [ ] Build TopBar component
- [ ] Build Sidebar component
- [ ] Build Breadcrumbs component
- [ ] Add responsive behavior (mobile menu)

#### 3.2 Navigation Components

1. **Sidebar Menu** (`components/navigation/sidebar.tsx`)
   - Active state highlighting
   - Icons + labels
   - Collapsible sections
   - Badge support (notifications)

2. **Tabs** (`components/ui/tabs.tsx`)
   - Horizontal tabs
   - Underline indicator
   - Keyboard navigation

3. **Breadcrumbs** (`components/ui/breadcrumbs.tsx`)
   - Auto-generated from route
   - Clickable links
   - Separator customization

**Actions:**
- [ ] Build Sidebar component
- [ ] Build Tabs component
- [ ] Build Breadcrumbs component
- [ ] Add navigation state management

---

### Phase 4: Advanced Components (Week 4)

#### 4.1 Modal System
**File:** `components/ui/modal.tsx`

**Features:**
- Overlay with backdrop
- Focus trap
- ESC to close
- Click outside to close
- Sizes: sm, md, lg, xl, full
- Animations: fade + slide

**Variants:**
- Confirmation dialog
- Form modal
- Full-screen modal

**Actions:**
- [ ] Build Modal component
- [ ] Build Dialog component
- [ ] Add focus management
- [ ] Add animations
- [ ] Create modal manager (stacking)

#### 4.2 Data Visualization
**File:** `components/charts/`

**Components:**
- Line chart
- Bar chart
- Pie chart
- Area chart

**Library:** Recharts or Chart.js

**Design:**
- Color palette from design system
- Tooltips
- Legends
- Responsive
- Loading states

**Actions:**
- [ ] Choose charting library
- [ ] Build chart wrapper components
- [ ] Apply design system colors
- [ ] Add accessibility (ARIA labels)

#### 4.3 Document Viewer
**File:** `components/documents/document-viewer.tsx`

**Features:**
- Markdown rendering
- Syntax highlighting
- Table of contents
- Print view
- Export options

**Actions:**
- [ ] Build DocumentViewer component
- [ ] Add markdown styling
- [ ] Add TOC generation
- [ ] Add print styles

---

### Phase 5: Page Templates (Week 5)

#### 5.1 Dashboard Pages

1. **Home Dashboard** (`app/dashboard/page.tsx`)
   - Key metrics cards
   - Recent activity
   - Quick actions
   - Charts

2. **Projects List** (`app/dashboard/projects/page.tsx`)
   - Table view
   - Filters
   - Search
   - Pagination

3. **Project Detail** (`app/dashboard/projects/[id]/page.tsx`)
   - Tabs (Overview, Documents, Team, Settings)
   - Status indicators
   - Action buttons

4. **Document Editor** (`app/dashboard/documents/[id]/page.tsx`)
   - Split view (editor + preview)
   - Toolbar
   - Version history
   - Comments panel

**Actions:**
- [ ] Redesign Dashboard home
- [ ] Redesign Projects list
- [ ] Redesign Project detail
- [ ] Redesign Document editor
- [ ] Add empty states
- [ ] Add loading states

#### 5.2 Authentication Pages

1. **Login** (`app/auth/login/page.tsx`)
   - Clean, centered form
   - SSO options
   - "Remember me"
   - Password reset link

2. **Register** (`app/auth/register/page.tsx`)
   - Multi-step form
   - Progress indicator
   - Validation

**Actions:**
- [ ] Redesign Login page
- [ ] Redesign Register page
- [ ] Add form validation
- [ ] Add loading states

---

### Phase 6: Interactions & Polish (Week 6)

#### 6.1 Micro-interactions

**Hover Effects:**
- Buttons: darken + shadow
- Cards: lift (shadow increase)
- Links: underline
- Table rows: background change

**Focus States:**
- 2px ring, primary color
- Visible on all interactive elements

**Loading States:**
- Button: spinner replaces text
- Form: disable + opacity
- Page: skeleton screen

**Actions:**
- [ ] Add hover effects to all components
- [ ] Add focus states (keyboard nav)
- [ ] Add loading states
- [ ] Add success/error animations

#### 6.2 Animations

**Transitions:**
- Duration: 150-300ms
- Easing: ease-in-out
- Properties: opacity, transform, background, shadow

**Animations:**
- Modal: fade + slide from top
- Toast: slide from right
- Dropdown: fade + scale
- Skeleton: pulse

**Actions:**
- [ ] Define animation system
- [ ] Add to Tailwind config
- [ ] Apply to components
- [ ] Test performance

#### 6.3 Accessibility

**WCAG AA Compliance:**
- Color contrast: 4.5:1 minimum
- Focus indicators: visible
- ARIA labels: all interactive elements
- Keyboard navigation: full support
- Screen reader: semantic HTML

**Actions:**
- [ ] Audit color contrasts
- [ ] Add ARIA labels
- [ ] Test keyboard navigation
- [ ] Test with screen reader
- [ ] Add skip links

---

## 📋 Implementation Checklist

### Week 1: Foundation ✅
- [ ] Update color system (globals.css)
- [ ] Add Inter font
- [ ] Create typography scale
- [ ] Implement 8px grid
- [ ] Update Tailwind config
- [ ] Document design tokens

### Week 2: Core Components
- [ ] Input, Select, Checkbox, Textarea
- [ ] Form wrapper + validation
- [ ] Toast, Alert, Skeleton, Spinner
- [ ] Table, Badge, Progress
- [ ] Component documentation

### Week 3: Layout & Navigation
- [ ] Dashboard layout
- [ ] Sidebar, TopBar, Breadcrumbs
- [ ] Tabs, Navigation
- [ ] Responsive behavior
- [ ] Mobile menu

### Week 4: Advanced Components
- [ ] Modal system
- [ ] Charts (Recharts)
- [ ] Document viewer
- [ ] Advanced interactions

### Week 5: Page Templates
- [ ] Dashboard pages redesign
- [ ] Projects pages redesign
- [ ] Document editor redesign
- [ ] Auth pages redesign

### Week 6: Polish
- [ ] Micro-interactions
- [ ] Animations
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Final QA

---

## 🎨 Design System Documentation

### Structure
```
docs/
  design-system/
    01-colors.md
    02-typography.md
    03-spacing.md
    04-components.md
    05-patterns.md
    06-accessibility.md
```

### Storybook
- Install Storybook
- Create stories for all components
- Document props and variants
- Add interaction tests

---

## 🔧 Technical Stack

### Current
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Radix UI (via shadcn/ui)
- Lucide Icons

### To Add
- **Inter font** (Google Fonts)
- **Recharts** (data visualization)
- **React Hook Form** (forms)
- **Zod** (validation)
- **Storybook** (component docs)
- **Framer Motion** (optional, for complex animations)

---

## 📊 Success Metrics

### Design Quality
- ✅ WCAG AA compliance (100%)
- ✅ Color contrast ratios (4.5:1+)
- ✅ Component consistency (design system)
- ✅ Responsive design (mobile, tablet, desktop)

### User Experience
- ✅ Page load time (<2s)
- ✅ Interaction responsiveness (<100ms)
- ✅ Form completion rate (increase)
- ✅ User satisfaction (surveys)

### Development
- ✅ Component reusability (80%+)
- ✅ Code consistency (linting)
- ✅ Documentation coverage (100%)
- ✅ Test coverage (80%+)

---

## 🚀 Next Steps

### Immediate (This Week)
1. **Review & Approve Plan** - Get stakeholder sign-off
2. **Set Up Tools** - Storybook, fonts, libraries
3. **Start Phase 1** - Color system + typography

### Short Term (Next 2 Weeks)
1. **Build Core Components** - Forms, feedback, data display
2. **Create Component Library** - Storybook documentation
3. **Start Page Redesigns** - Dashboard, projects

### Long Term (Next Month)
1. **Complete All Phases** - All components + pages
2. **Accessibility Audit** - WCAG compliance
3. **Performance Optimization** - Load times, animations
4. **User Testing** - Gather feedback, iterate

---

## 💡 Key Principles (From Guidelines)

1. **Trust & Professionalism** - Medical-grade design
2. **Clarity Over Cleverness** - Simple, obvious UI
3. **Consistency** - Design system adherence
4. **Accessibility** - WCAG AA minimum
5. **Performance** - Fast, responsive
6. **Scalability** - Component-based architecture

---

**Status:** Ready for implementation  
**Owner:** Frontend Team  
**Timeline:** 6 weeks  
**Priority:** HIGH
