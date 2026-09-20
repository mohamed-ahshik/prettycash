# PrettyCash — Brand & Style Reference

Source of truth: `src/theme/` (`colors.ts`, `text.ts`, `spacing.ts`, `typography.ts`).
Use these exact values when creating screenshots, marketing images, or illustrations.

---

## 1. Brand at a glance

- **Name:** PrettyCash · slug `prettycash`
- **Vibe:** calm, trustworthy, premium — "forest green on warm paper"
- **Theme:** light only (no dark mode implemented)
- **Primary accent:** deep forest green `#00674F`

---

## 2. Core palette

| Token | Hex | Role |
|---|---|---|
| Primary | `#00674F` | Buttons, active tabs, brand mark, key accents |
| Primary pressed | `#005440` | Pressed / darker state |
| On primary | `#FFFFFF` | Text/icons on primary (6.8:1) |
| Secondary | `#DFF0EB` | Soft mint fills, icon badges, chips |
| Secondary strong | `#C9E7DE` | Deeper mint for layered surfaces |
| On secondary | `#004D3B` | Text on mint |
| Accent | `#FFEEE3` | Warm peach, used sparingly (receipt/AI moments) |
| On accent | `#7A4A2E` | Text on peach |

### Neutrals / surfaces

| Token | Hex | Role |
|---|---|---|
| Background | `#FAFAFA` | App canvas |
| Card | `#FFFFFF` | Cards, sheets, tab bar |
| Border | `#E6EDEB` | Hairlines (cool-tinted, subtle) |
| Muted fill | `#F0F5F3` | Input fills, inner tiles |
| Muted text | `#5C6670` | Secondary text |
| Foreground (ink) | `#1E2422` | Primary text (near-black, green cast) |
| Overlay | `rgba(16,24,22,0.45)` | Modal backdrop |

### Semantic

| Token | Hex | Use |
|---|---|---|
| Income | `#1B5E20` | Positive amounts, green arcs |
| Expense | `#C0392B` | Negative amounts, red arcs |
| Danger surface | `#FDECEA` | Error banners |
| Ring | `#00674F` | Focus ring |

**Suggested image split:** ~60% off-white/canvas · ~25% green/mint · ~15% ink/accent.

---

## 3. Category accents

Each pair is `foreground` on a matching `background`.

| Category | FG | BG |
|---|---|---|
| Food | `#FFB800` | `#FFF4D6` |
| Shopping | `#00B4D8` | `#E0F2FE` |
| Drinks | `#2EC4B6` | `#DFF0EB` |
| Travel | `#3B5BDB` | `#E8EFFD` |
| Fun | `#E67E22` | `#FFEEE3` |
| Bills | `#7C3AED` | `#F3E8FF` |
| Salary | `#2E7D32` | `#E8F5E9` |
| Freelance | `#0284C7` | `#E0F2FE` |
| Investments | `#D97706` | `#FEF3C7` |
| Gifts | `#E11D48` | `#FFE4E6` |

---

## 4. Typography

**DM Sans** — weights 400 / 500 / 600 / 700. Negative tracking on large sizes. Money always uses tabular numerals.

| Style | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|
| Display | 40 / 44 | 700 | −1.0 | hero balance |
| Title | 28 / 34 | 700 | −0.6 | screen titles |
| Heading | 20 / 26 | 700 | −0.3 | sheet / card titles |
| Subhead | 16 / 22 | 600 | −0.1 | sections, buttons |
| Body large | 15 / 21 | 600 | 0 | row titles |
| Body | 14 / 20 | 400 | 0 | paragraphs |
| Label | 13 / 18 | 600 | 0 | labels |
| Caption | 12 / 16 | 500 | 0 | meta |
| Overline | 11 / 14 | 700 | +0.8, uppercase | section overlines |

Never exceed weight 700.

---

## 5. Shape, space, depth

**Radii:** `8 / 12 (inputs) / 16 (inner tiles) / 20 (cards) / 28 (sheet tops) / 999 (pills)`

**Spacing scale:** 4, 8, 12, 16, 20, 24
- Screen gutter: **20**
- Card padding: **20**
- Row height: **64**

**Elevation** (subtle, green-black):
- `e1` cards: `rgba(16,24,22,0.04)` + `rgba(16,24,22,0.05)`
- `e2` floating (tab bar, FAB): `rgba(16,24,22,0.10)`
- `e3` sheets/dialogs: `rgba(0,0,0,0.18)`

---

## 6. Signature motifs

- **Icon-in-tinted-circle** — rounded badge filled with a category's soft `bg`, icon in the matching `fg`.
- **Floating notched tab bar** with a green circular **FAB**, pill-shaped, floating above content.
- **Pill buttons**, mint chips, and the **green balance card** (white card with mint dot texture fading top-down).
- **Donut** — expense red / income green at rest, category colours when drilled.

---

## 7. Background / gradient recipes

- Light canvas: `#FAFAFA` → `#DFF0EB` (subtle, top-to-bottom)
- Feature / dark card: `#00674F` → `#004D3B`
- Soft mint block: `#DFF0EB` → `#FFFFFF`
- Ink reverse: `#1E2422` background, `#FFFFFF` text, `#2EC4B6` accents

---

## 8. Do / Don't

**Do**
- Keep generous white space, rounded corners, one strong green accent per composition.
- Use tabular money figures and the tinted-circle icon motif.

**Don't**
- Introduce blues as a brand colour.
- Use hard black (`#000`) text, pure grey cards, or shadows heavier than the tokens.
- Recolour the income/expense semantics (green = income, red = expense).

---

## 9. App icon assets

- `assets/icon.png`
- `assets/android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png` (background `#E6F4FE` per `app.json`)
- `assets/favicon.png`
- `assets/splash-icon.png`
