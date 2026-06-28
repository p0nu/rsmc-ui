// RSMC logo — a sync glyph: two arcs with arrowheads circling a central node,
// expressing Realtime Sync + Messaging (the heart of "Realtime Sync, Messaging
// & Collaboration"). Centered in a 40x40 viewBox so it sits true at any size.
//
// Variants:
//   <Logo />                 → rounded-square app tile with gradient fill
//   <Logo variant="glyph" /> → the mark only, gradient strokes
//   <Logo variant="plain" /> → the mark in a single currentColor (monochrome)

let gid = 0;

export default function Logo({ size = 32, variant = "tile", className }) {
  const id = `rs${++gid}`;
  const ink = variant === "tile" ? "#fff" : `url(#${id}s)`;

  const mark = (
    <>
      <g fill="none" stroke={ink} strokeWidth="3.4" strokeLinecap="round">
        <path d="M11 16a10 10 0 0 1 17.5-3" />
        <path d="M29 24a10 10 0 0 1-17.5 3" />
      </g>
      <g fill={ink}>
        <path d="M28.5 8 l3 5 l-5.6 0.4 z" />
        <path d="M11.5 32 l-3 -5 l5.6 -0.4 z" />
      </g>
      <circle cx="20" cy="20" r="3.2" fill={ink} />
    </>
  );

  const defs = (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6366f1" />
        <stop offset="1" stopColor="#a855f7" />
      </linearGradient>
      <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6366f1" />
        <stop offset="1" stopColor="#a855f7" />
      </linearGradient>
    </defs>
  );

  if (variant === "tile") {
    return (
      <span
        className={className}
        style={{ display: "inline-flex", width: size, height: size, flexShrink: 0 }}
      >
        <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" style={{ display: "block" }}>
          {defs}
          <rect width="40" height="40" rx="11" fill={`url(#${id})`} />
          {mark}
        </svg>
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{ display: "inline-flex", width: size, height: size, flexShrink: 0 }}
    >
      <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" style={{ display: "block" }}>
        {variant === "glyph" && defs}
        {mark}
      </svg>
    </span>
  );
}
