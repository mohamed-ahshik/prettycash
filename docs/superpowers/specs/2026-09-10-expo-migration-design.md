# PrettyCash Expo Migration Design Spec

**Date:** 2026-09-10
**Status:** Approved
**Approach:** Option A (Root Setup)

---

## 1. Overview & Objective
Migrate the existing PrettyCash web-based static Tailwind design mockup (`prettycash/design/main_page.html`) into a fully functional, cross-platform mobile application powered by **Expo** and **React Native**. The visual identity, layout spacing, color palette, typography, and bottom tab navigation will match the provided mockup.

---

## 2. Directory Structure & Reorganization
We will initialize the Expo application directly in the repository root (`/Users/user/Documents/PrettyCash`) to keep the project clean and manageable.

### Proposed Tree:
```text
/Users/user/Documents/PrettyCash/
├── assets/                  # App icon, splash screen, and local assets (e.g., custom fonts)
├── components/              # Shared reusable components (Header, OverlappingCard, TransactionItem, BudgetCard)
├── screens/                 # Mobile screens
│   ├── HomeScreen.js        # Main Dashboard screen (mimics main_page.html)
│   ├── InsightsScreen.js    # Insights placeholder screen
│   ├── WalletsScreen.js     # Wallets placeholder screen
│   └── ProfileScreen.js     # User profile placeholder screen
├── design/                  # Relocated subdirectory containing the original HTML mockup & designs
│   ├── main_page.html
│   └── icon.png
├── App.js                   # Application entry point with Bottom Tab Navigation setup
├── tailwind.config.js       # NativeWind config extending mockups style variables
├── package.json             # Root-level dependencies
└── babel.config.js          # Babel settings with NativeWind plugin configuration
```

---

## 3. Styling & Custom Theme
We will configure **NativeWind v4** to enable Tailwind CSS classes on React Native components, preserving visual layouts directly.

### Theme Palette Config (matching `main_page.html` custom CSS variables):
- **Background:** `#FAFAFA`
- **Text/Foreground:** `#1E2422`
- **Card Background:** `#FFFFFF`
- **Primary Green:** `#00674F`
- **Primary Foreground (Text inside green):** `#FFFFFF`
- **Secondary Green (Muted green pill bg):** `#DFF0EB` / `#F0F5F3`
- **Secondary Foreground:** `#004D3B`
- **Accent Coral:** `#FFEEE3`
- **Accent Coral Foreground:** `#7A4A2E`
- **Border color:** `#E6EDEB`

---

## 4. Typography & Iconography
- **Font Family:** Load **DM Sans** dynamically using `expo-font` and `@expo-google-fonts/dm-sans` to match the exact aesthetic.
- **Icons:** Use `expo-vector-icons` (specifically mapping the Solar icons of the mockup to matching icons inside `MaterialCommunityIcons`, `Feather`, or `Ionicons`).

---

## 5. Navigation Configuration
We will set up **React Navigation Bottom Tabs** inside `App.js` to manage 5 screens matching the mockup's bottom navigation layout:
1.  **Home** (Home screen dashboard)
2.  **Insights** (Muted background, simple mock stats)
3.  **Add (+)** (Floating central action button)
4.  **Wallets** (Wallets placeholder)
5.  **Profile** (Profile placeholder)

---

## 6. Self-Verification Plan
- Build the app and confirm zero compilation/transpilation errors.
- Verify screen routing and font loading on initialization.
- Test responsiveness across mobile viewports.
