## 2025-11-15 16:01 UTC - Stripe-like dashboard shell (Stage 4-1)
- Updated the dashboard shell (`DashboardLayout`) to a more Stripe-like layout with a wider, lighter sidebar that emphasizes content over chrome.
- Reworked the sidebar navigation styling to use a subtle gray background with a left primary border for the active item instead of a full primary fill, reducing visual heaviness.
- Removed the global search bar from the top header to match the current product scope (no meaningful global search yet) and avoid fake functionality.
- Kept a compact top header with only the mobile menu button and flexible space for future per-page actions.
- Adjusted the main content left padding to match the new sidebar width so that all dashboard pages align cleanly with the updated shell.

What's next:
- Redesign the `/dashboard` home page into a “Work hub” without metrics: focus on "Continue work" (last project/document) and short lists of recent projects/documents.
- Convert the `/dashboard/projects` page from a grid of cards into a professional table layout to simplify scanning and comparison.

## 2025-11-15 21:58 UTC - UI/UX feedback, statuses, loading, auth & page layouts
- Replaced all blocking `alert()`/`confirm()` flows in core actions (Validate, Generate, Extract, Files) with non-intrusive toast notifications using `useToast`, aligning feedback with the new design system.
- Unified status badges for projects and documents across dashboard, list, and detail pages using shared helpers and consistent `Badge` variants.
- Introduced consistent route-level loading skeletons for dashboard, projects, documents, and detail pages using shared `Skeleton` components to avoid layout shifts.
- Standardized empty/blank states (icon + title + description + CTA) on dashboard, project detail, and project files views for clearer guidance when there is no data.
- Simplified the "New Project" form layout to a lighter, Stripe-like structure with better spacing and grouping, without touching backend logic.
- Redesigned project detail and document detail screens into summary header + tabs layouts for better scanning of key metadata vs content/actions.
- Updated auth login and register pages to Stripe-like layouts with focus on primary credential flows and clear error handling.

What's next:
- Finish documenting the UI/UX redesign phase in `plan.md` and `CHANGELOG.md`, then move to the next UX block (e.g. advanced components or exports) as per the long-term UI/UX plan.

## 2025-11-15 23:57 UTC - Accessibility & micro-interactions pass
- Added ARIA labels for key icon-only actions (download, delete, print) and mobile sidebar controls to improve screen reader support.
- Enhanced keyboard focus visibility and micro-interactions for navigation and content:
  - TOC entries in `DocumentViewer` now have a clear `focus-visible` ring and subtle hover states.
  - Primary links in projects/documents tables (project title, document type, project link) now use a consistent focus ring based on design tokens.
- Introduced a print-friendly toolbar and styles in `DocumentViewer` (Print button + hidden TOC and flattened card styling in print view), aligned with the new color/token system.

## 2025-11-16 11:22 UTC - Compact UI redesign & logo update
- Completely redesigned dashboard home (`/dashboard`) to remove redundant "Continue work", "Recent Projects", and "Recent Documents" sections, replacing with a single clean table of all projects (matching `/dashboard/projects` layout).
- Applied ultra-compact styling across all list pages (`/dashboard`, `/dashboard/projects`, `/dashboard/documents`):
  - Reduced sidebar width from `w-60` to `w-48` (240px → 192px)
  - Reduced sidebar logo height from `h-14` to `h-10`, navigation items from `py-2` to `py-1.5`, text from `text-sm` to `text-xs`
  - Reduced all page headers from `text-2xl` to `text-xl`
  - Reduced all action buttons to compact size: `h-7`, `px-2.5`, `text-xs`, `h-3` icons
  - Removed Card wrappers around tables, using simple `border` divs instead
  - Reduced table row padding from default to `py-2`, header height to `h-9`, all text to `text-xs`
  - Shortened column headers ("Documents" → "Docs", "Version" → "Ver")
  - Formatted dates compactly: "16 Nov 2025" instead of "11/16/2025"
- Replaced placeholder "S" logo in sidebar with actual Skaldi gradient chevron logo (`/public/logo.png` from `/pics/3 (2).png`)

What's next:
- Apply compact styling to project detail and document detail pages
- Consider further polish on spacing and micro-interactions
