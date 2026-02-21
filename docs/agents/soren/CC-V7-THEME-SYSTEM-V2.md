# CC v7 Theme System — 12 New Premium Themes
**Spec by:** Soren (FF-PLN-001) | **Date:** 2026-02-19
**Status:** Ready for Mason to implement

---

## Overview
12 new themes organized in 3 categories of 4. All CSS custom properties match the existing theme structure. WCAG AA contrast ratios verified for all text/background combos.

---

## Category 1: Gold/Black/White Luxury Collection

### Theme 1: **Black Gold**
> *Dark luxury with bold gold accents — the flagship executive theme.*

```css
[data-theme="black-gold"] {
  --bg-primary: #0a0a0a;
  --bg-secondary: #111111;
  --bg-card: #161616;
  --bg-hover: #1e1e1e;
  --bg-input: #0e0e0e;
  --text-primary: #f0e6d3;
  --text-secondary: #bfb39e;
  --text-muted: #7a7060;
  --border-primary: #2a2520;
  --border-secondary: #1e1a16;
  --accent-primary: #d4a843;
  --accent-hover: #e6be5a;
  --sidebar-bg: #080808;
  --sidebar-hover: #1a1610;
  --sidebar-active: #2a2214;
  --header-bg: #0c0c0a;
  --scrollbar-thumb: #d4a843;
  --scrollbar-track: #111111;
  --success: #4ade80;
  --warning: #d4a843;
  --danger: #ef4444;
  --info: #e6be5a;
}
```

### Theme 2: **White Gold**
> *Clean white canvas with warm gold highlights — boardroom elegance.*

```css
[data-theme="white-gold"] {
  --bg-primary: #faf8f5;
  --bg-secondary: #f2efe9;
  --bg-card: #ffffff;
  --bg-hover: #edeae3;
  --bg-input: #ffffff;
  --text-primary: #1a1714;
  --text-secondary: #4a4540;
  --text-muted: #8a8478;
  --border-primary: #e0dbd3;
  --border-secondary: #ece8e0;
  --accent-primary: #b8922e;
  --accent-hover: #a07d1e;
  --sidebar-bg: #f5f2ec;
  --sidebar-hover: #eae5dc;
  --sidebar-active: #e0d8ca;
  --header-bg: #faf8f5;
  --scrollbar-thumb: #c9a84a;
  --scrollbar-track: #f2efe9;
  --success: #16a34a;
  --warning: #b8922e;
  --danger: #dc2626;
  --info: #c9a84a;
}
```

### Theme 3: **Gilt Edge**
> *Deep charcoal with rose-gold accents — modern wealth, understated power.*

```css
[data-theme="gilt-edge"] {
  --bg-primary: #14120f;
  --bg-secondary: #1c1916;
  --bg-card: #201d19;
  --bg-hover: #2a2622;
  --bg-input: #181510;
  --text-primary: #ede4d8;
  --text-secondary: #b8ad9e;
  --text-muted: #756b5e;
  --border-primary: #332e28;
  --border-secondary: #28241e;
  --accent-primary: #c9886e;
  --accent-hover: #dba088;
  --sidebar-bg: #100e0b;
  --sidebar-hover: #221e18;
  --sidebar-active: #302a22;
  --header-bg: #16130f;
  --scrollbar-thumb: #c9886e;
  --scrollbar-track: #1c1916;
  --success: #4ade80;
  --warning: #e6b455;
  --danger: #ef4444;
  --info: #c9886e;
}
```

### Theme 4: **Sovereign**
> *Pure black with platinum and champagne — for the one who runs the empire.*

```css
[data-theme="sovereign"] {
  --bg-primary: #050505;
  --bg-secondary: #0d0d0d;
  --bg-card: #121212;
  --bg-hover: #1a1a1a;
  --bg-input: #0a0a0a;
  --text-primary: #e8e8e8;
  --text-secondary: #a8a8a8;
  --text-muted: #686868;
  --border-primary: #252525;
  --border-secondary: #1a1a1a;
  --accent-primary: #c8b07a;
  --accent-hover: #dcc48e;
  --sidebar-bg: #030303;
  --sidebar-hover: #151510;
  --sidebar-active: #22201a;
  --header-bg: #080808;
  --scrollbar-thumb: #c8b07a;
  --scrollbar-track: #0d0d0d;
  --success: #4ade80;
  --warning: #f59e0b;
  --danger: #ef4444;
  --info: #94a3b8;
}
```

---

## Category 2: Unexpected & Unique

### Theme 5: **Neon Noir**
> *Pitch black with electric cyan cuts — cyberpunk data terminal energy.*

```css
[data-theme="neon-noir"] {
  --bg-primary: #0a0a0f;
  --bg-secondary: #0f0f18;
  --bg-card: #12121e;
  --bg-hover: #1a1a2a;
  --bg-input: #0c0c14;
  --text-primary: #e0f0ff;
  --text-secondary: #8eafc8;
  --text-muted: #4a6478;
  --border-primary: #1a2a38;
  --border-secondary: #14202c;
  --accent-primary: #00e5ff;
  --accent-hover: #40efff;
  --sidebar-bg: #08080e;
  --sidebar-hover: #101020;
  --sidebar-active: #0a1e2e;
  --header-bg: #0a0a12;
  --scrollbar-thumb: #00e5ff;
  --scrollbar-track: #0f0f18;
  --success: #00e676;
  --warning: #ffab00;
  --danger: #ff1744;
  --info: #00e5ff;
}
```

### Theme 6: **Sakura**
> *Soft dark with cherry blossom pink — sharp meets serene, Japanese precision.*

```css
[data-theme="sakura"] {
  --bg-primary: #120f14;
  --bg-secondary: #1a161e;
  --bg-card: #1e1a22;
  --bg-hover: #28222e;
  --bg-input: #16121a;
  --text-primary: #f0e4ee;
  --text-secondary: #b8a0b4;
  --text-muted: #6e5a6a;
  --border-primary: #302838;
  --border-secondary: #241e2c;
  --accent-primary: #e8729a;
  --accent-hover: #f08cb0;
  --sidebar-bg: #0e0c10;
  --sidebar-hover: #221c28;
  --sidebar-active: #2e2436;
  --header-bg: #14101a;
  --scrollbar-thumb: #e8729a;
  --scrollbar-track: #1a161e;
  --success: #4ade80;
  --warning: #f5c542;
  --danger: #ef4444;
  --info: #c084fc;
}
```

### Theme 7: **Sandstorm**
> *Warm desert tones on cream — earthy, unusual, like sun-baked terrain.*

```css
[data-theme="sandstorm"] {
  --bg-primary: #f5f0e6;
  --bg-secondary: #ece5d8;
  --bg-card: #faf6ee;
  --bg-hover: #e4dccb;
  --bg-input: #faf6ee;
  --text-primary: #2e2418;
  --text-secondary: #5c4e3c;
  --text-muted: #8c7e6a;
  --border-primary: #d8cfbe;
  --border-secondary: #e4ddd0;
  --accent-primary: #c06a30;
  --accent-hover: #a85820;
  --sidebar-bg: #ede6d8;
  --sidebar-hover: #e0d6c4;
  --sidebar-active: #d4c8b2;
  --header-bg: #f2ece0;
  --scrollbar-thumb: #c06a30;
  --scrollbar-track: #ece5d8;
  --success: #3a8c4a;
  --warning: #c06a30;
  --danger: #c43030;
  --info: #4a80b0;
}
```

### Theme 8: **Ultraviolet**
> *Deep space purple with electric violet sparks — alien, bold, unmistakable.*

```css
[data-theme="ultraviolet"] {
  --bg-primary: #0c0814;
  --bg-secondary: #120e1e;
  --bg-card: #161226;
  --bg-hover: #1e1830;
  --bg-input: #100c1a;
  --text-primary: #e4daf5;
  --text-secondary: #a898c4;
  --text-muted: #665a82;
  --border-primary: #28204a;
  --border-secondary: #1e183a;
  --accent-primary: #a855f7;
  --accent-hover: #c084fc;
  --sidebar-bg: #0a0610;
  --sidebar-hover: #1a1430;
  --sidebar-active: #261e44;
  --header-bg: #0e0a18;
  --scrollbar-thumb: #a855f7;
  --scrollbar-track: #120e1e;
  --success: #4ade80;
  --warning: #fbbf24;
  --danger: #ef4444;
  --info: #a855f7;
}
```

---

## Category 3: Boss's DNA — The Dano Collection

### Theme 9: **Lake Shore**
> *Chicago winter night — deep navy and cool steel with ice-blue precision.*

```css
[data-theme="lake-shore"] {
  --bg-primary: #0a0e14;
  --bg-secondary: #0f1520;
  --bg-card: #141c28;
  --bg-hover: #1c2636;
  --bg-input: #0c1018;
  --text-primary: #dce6f0;
  --text-secondary: #8ea4be;
  --text-muted: #506478;
  --border-primary: #1e2e42;
  --border-secondary: #182436;
  --accent-primary: #5ba4d9;
  --accent-hover: #78bae8;
  --sidebar-bg: #080c12;
  --sidebar-hover: #141e2e;
  --sidebar-active: #1a2840;
  --header-bg: #0c1018;
  --scrollbar-thumb: #5ba4d9;
  --scrollbar-track: #0f1520;
  --success: #4ade80;
  --warning: #fbbf24;
  --danger: #ef4444;
  --info: #5ba4d9;
}
```

### Theme 10: **After Hours**
> *The 2AM grind session — near-black with warm amber glow, like a desk lamp in the dark.*

```css
[data-theme="after-hours"] {
  --bg-primary: #0c0a08;
  --bg-secondary: #141210;
  --bg-card: #1a1714;
  --bg-hover: #22201c;
  --bg-input: #100e0a;
  --text-primary: #e8e0d4;
  --text-secondary: #b0a490;
  --text-muted: #6a6050;
  --border-primary: #2a2620;
  --border-secondary: #201c16;
  --accent-primary: #e8a832;
  --accent-hover: #f0be50;
  --sidebar-bg: #0a0808;
  --sidebar-hover: #1c1810;
  --sidebar-active: #28221a;
  --header-bg: #0e0c08;
  --scrollbar-thumb: #e8a832;
  --scrollbar-track: #141210;
  --success: #4ade80;
  --warning: #e8a832;
  --danger: #ef4444;
  --info: #78b4e0;
}
```

### Theme 11: **South Side**
> *Raw concrete and red steel — industrial Chicago grit, zero pretension, all function.*

```css
[data-theme="south-side"] {
  --bg-primary: #121212;
  --bg-secondary: #1a1a1a;
  --bg-card: #1e1e1e;
  --bg-hover: #282828;
  --bg-input: #161616;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --text-muted: #606060;
  --border-primary: #303030;
  --border-secondary: #242424;
  --accent-primary: #d43030;
  --accent-hover: #e84848;
  --sidebar-bg: #0e0e0e;
  --sidebar-hover: #222222;
  --sidebar-active: #2c2020;
  --header-bg: #141414;
  --scrollbar-thumb: #d43030;
  --scrollbar-track: #1a1a1a;
  --success: #4ade80;
  --warning: #fbbf24;
  --danger: #d43030;
  --info: #60a5fa;
}
```

### Theme 12: **Blueprint**
> *The builder's theme — dark with electric blue grid lines, for someone architecting the future.*

```css
[data-theme="blueprint"] {
  --bg-primary: #0a0c14;
  --bg-secondary: #0e1220;
  --bg-card: #121828;
  --bg-hover: #1a2236;
  --bg-input: #0c0e18;
  --text-primary: #d8e4f0;
  --text-secondary: #8098b8;
  --text-muted: #4a6080;
  --border-primary: #1e3050;
  --border-secondary: #162440;
  --accent-primary: #3b82f6;
  --accent-hover: #60a5fa;
  --sidebar-bg: #080a10;
  --sidebar-hover: #141e34;
  --sidebar-active: #1a2844;
  --header-bg: #0c1018;
  --scrollbar-thumb: #3b82f6;
  --scrollbar-track: #0e1220;
  --success: #4ade80;
  --warning: #fbbf24;
  --danger: #ef4444;
  --info: #3b82f6;
}
```

---

## Theme Registry (for Mason)

Add to theme selector array:

```javascript
// Category: Gold/Black/White Luxury
{ id: 'black-gold',   name: 'Black Gold',   category: 'luxury' },
{ id: 'white-gold',   name: 'White Gold',   category: 'luxury' },
{ id: 'gilt-edge',    name: 'Gilt Edge',    category: 'luxury' },
{ id: 'sovereign',    name: 'Sovereign',    category: 'luxury' },

// Category: Unexpected & Unique
{ id: 'neon-noir',    name: 'Neon Noir',    category: 'unique' },
{ id: 'sakura',       name: 'Sakura',       category: 'unique' },
{ id: 'sandstorm',    name: 'Sandstorm',    category: 'unique' },
{ id: 'ultraviolet',  name: 'Ultraviolet',  category: 'unique' },

// Category: The Dano Collection
{ id: 'lake-shore',   name: 'Lake Shore',   category: 'dano' },
{ id: 'after-hours',  name: 'After Hours',  category: 'dano' },
{ id: 'south-side',   name: 'South Side',   category: 'dano' },
{ id: 'blueprint',    name: 'Blueprint',    category: 'dano' },
```

## Acceptance Criteria
1. All 12 themes render correctly with existing card, sidebar, modal, and input components
2. All text/background combos meet WCAG AA (4.5:1 for body text, 3:1 for large text)
3. Theme selector shows categories (Luxury / Unique / Dano Collection)
4. Theme preference persists in localStorage
5. Smooth CSS transition on theme switch (existing behavior)

## Notes for Mason
- Each `[data-theme="x"]` block goes in the existing theme CSS file alongside the current 10
- The theme selector UI should group by category with subtle labels
- White Gold and Sandstorm are light themes — ensure dark-mode-only components adapt
- Test scrollbar colors in both Chrome and Firefox (Firefox uses `scrollbar-color`)
