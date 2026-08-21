 Create a detailed prompt in improving the frontend so that it looks more better . You are open to suggestions

Here is a UI/UX improvement prompt tailored for an AI coding assistant (like Claude or Cursor) to refactor your mobile app layout.

System Prompt: Mobile App UI/UX Redesign & Modernization

Role: Expert Mobile UI/UX Designer & Frontend Developer.
Objective: Modernize the app’s interface to deliver a polished, visually appealing dark-theme design system following modern HIG (Human Interface Guidelines) and Material 3 standards.

1. Typography & Hierarchy

    Font Family: Switch default system fonts to a clean modern sans-serif like Inter or Plus Jakarta Sans.

    Scales: Reduce header size slightly to avoid standard system text overflow. Implement H1 (22px bold), H2 (18px semibold), Body (14px regular), and Caption (12px muted).

    Truncation: Ensure long screen titles or status labels truncate with ellipsis instead of wrapping awkwardly.

2. Layout, Colors & Dark Mode Depth

    Color Palette:

        Background Base: #0F172A or #121212 (deep charcoal/slate instead of pure #000000).

        Surface / Cards: #1E293B or #1E1E1E with a subtle 1px border (#334155).

        Primary Accent: Emerald Green (#10B981 / #059669) for key actions, selected states, and status badges.

        Text: Primary (#F8FAFC), Secondary/Muted (#94A3B8).

    Card Design:

        Replace blocky grey boxes with rounded container cards (border-radius: 16px).

        Add internal padding (16px) and subtle drop shadows or light top-borders for elevated depth.

3. Screen-Specific UI Enhancements

    Home & List Screen:

        Cards: Group metadata (Organizer, Location, Participants, Status) using clean vector icons (e.g., Lucide or Feather icons) paired with inline text instead of raw text headers.

        Badges: Convert text like "Open" or "Started" into compact, rounded pill tags with semi-transparent background fills (e.g., bg-emerald-500/10 text-emerald-400).

        Debug Overlay: Remove raw log text overlays (permission: granted...) from production views or place them behind a collapsible developer menu.

    Map View (Explore Screen):

        Custom Markers: Replace standard blue Google Map pins with custom circular markers displaying prayer icons or avatars with a subtle outer glow.

        Floating Controls: Float action buttons ("Reload", "Locate") as sleek round pill buttons with backdrop blurs over the map background rather than fixed rectangular top bars.

    Detail Screen:

        Header Card: Present event details in an organized grid with light divider lines or soft background sectioning.

        Member List: Enhance member rows with distinct avatar background colors (or user profile photos) and clear typography for name and join times.

        Empty State: Design a friendly illustrated empty state icon and helpful caption for when no members have joined yet.

    Creation Screen (Prayer Selection):

        Grid Layout: Fix button alignment by using a uniform 2-column or 3-column grid for prayer time tiles.

        Selectable Cards: Transform prayer time tiles into interactive cards that display active highlight rings/glows when selected.

        CTA Button: Dock the primary "Create Jama'ah" button to the bottom safe area with full width and clear tap target dimensions (height: 52px).

4. Navigation & Floating Actions

    Bottom Navigation Bar: Reduce icon scale (24px), set active states to primary emerald green, and maintain clean label visibility.

    Settings Gear: Position the top-right settings icon neatly within the navigation header bar as an icon-only button without dark circular bounding boxes.

Also this page

Here is a targeted UI refinement section specifically for this Jama'ah Feed Screen, formatted to be added directly to your prompt:

Jama'ah Feed Screen Refinement

    Header & Top Bar Alignment:

        Add a dedicated sticky header with a bold title (e.g., Home or Jama'ahs Near You) and relocate the settings gear icon into this top header alignment, removing the floating overlay that currently overlaps content.

    Card Information Architecture & Layout:

        Header Row: Position the prayer title (Fajr Jama'ah) on the left and a compact status badge (Open, In Progress, or Full) aligned on the top right.

        Organizer Info: Display the organizer line (by Hassan Ali) with a smaller, muted font style (#94A3B8) beneath the main title. Use an avatar circle with subtle background colors for user initials.

        Detail Meta Grid: Group metadata using clean vector icons (Lucide/Feather) instead of default emojis:

            Location: Map pin icon + bold/highlighted location text.

            Participants: Group icon + progress bar or fractional tag (3/7 filled).

            Status/Time: Clock icon + formatted time stamp.

    Interactive Elements & Visual Polish:

        Action Button: Replace the bottom-left text link ("View & join") with a full-width bottom card footer or an inline secondary button (Join Jama'ah / View Details).

        Card Separation: Increase vertical spacing (gap: 12px or 16px) between cards to clearly distinguish individual feed items.

        Card Border & Surface: Use a subtle surface color (#1E293B) with a 1px border (#334155) and 12px–16px border radius to give cards proper depth against the dark background.

        Index Indicators: Remove the standalone floating index numbers (1, 2, 3) on the bottom right of the cards to keep the design clean and uncluttered.

