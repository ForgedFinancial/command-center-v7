// ========================================
// FEATURE: Logo
// Added: 2026-02-14 by Claude Code
// SVG anvil + spark motif, theme-adaptive
// ========================================

export default function Logo({ size = 48, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Anvil Body */}
      <path
        d="M8 32 L12 24 L36 24 L40 32 L42 32 L42 36 L6 36 L6 32 Z"
        fill="var(--accent)"
      />
      {/* Anvil Top */}
      <rect x="14" y="20" width="20" height="4" rx="1" fill="var(--accent)" />
      {/* Anvil Horn */}
      <path
        d="M36 22 L44 22 L44 24 L36 24 Z"
        fill="var(--accent)"
      />
      {/* Spark / Trend Line */}
      <path
        d="M16 16 L22 10 L28 14 L34 6"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Spark Point */}
      <circle cx="34" cy="6" r="2" fill="var(--accent)" />
    </svg>
  )
}
