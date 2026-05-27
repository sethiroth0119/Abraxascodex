// =====================================================================
//  ICONS — faction wax-seals, element runes, tier sigils
//  Original grim-gothic style; not derived from any branded ruleset.
// =====================================================================

const { ELEMENT_MAP, FACTION_MAP, TIER_MAP } = window.MS;

// ------------------------------------------------------------
// Element rune — circular sigil with glyph, hue-shifted
// ------------------------------------------------------------
window.ElementRune = function ElementRune({ id, size = 22, title }) {
  const el = ELEMENT_MAP[id];
  if (!el) return null;
  const ink = `oklch(0.38 0.10 ${el.hue})`;
  const fill = `oklch(0.86 0.04 ${el.hue})`;
  return (
    <span
      title={title || el.label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        font: `600 ${Math.max(10, size - 10)}px 'IM Fell English SC', 'Cinzel', serif`,
        color: ink,
        letterSpacing: ".06em",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
        <circle cx="11" cy="11" r="10" fill={fill} stroke={ink} strokeWidth="0.8" />
        <circle cx="11" cy="11" r="7.6" fill="none" stroke={ink} strokeWidth="0.5" opacity="0.55" />
        <text
          x="11" y="14.6" textAnchor="middle"
          fontSize="12" fontFamily="Cambria, 'Cormorant Garamond', serif"
          fill={ink}
        >{el.glyph}</text>
      </svg>
      <span>{el.label}</span>
    </span>
  );
};

// ------------------------------------------------------------
// Element badge — compact, just glyph
// ------------------------------------------------------------
window.ElementChip = function ElementChip({ id, size = 26 }) {
  const el = ELEMENT_MAP[id];
  if (!el) return null;
  const ink = `oklch(0.32 0.12 ${el.hue})`;
  const fill = `oklch(0.84 0.05 ${el.hue})`;
  return (
    <span title={el.label} style={{ display: "inline-block", lineHeight: 0 }}>
      <svg width={size} height={size} viewBox="0 0 22 22">
        <circle cx="11" cy="11" r="10" fill={fill} stroke={ink} strokeWidth="0.9" />
        <circle cx="11" cy="11" r="7.6" fill="none" stroke={ink} strokeWidth="0.4" opacity="0.6" />
        <text x="11" y="14.6" textAnchor="middle" fontSize="11.5"
          fontFamily="Cambria, 'Cormorant Garamond', serif" fill={ink}>{el.glyph}</text>
      </svg>
    </span>
  );
};

// ------------------------------------------------------------
// Faction wax-seal — small badge with monogram letter
// ------------------------------------------------------------
window.FactionSeal = function FactionSeal({ id, size = 26, withLabel = false }) {
  const f = FACTION_MAP[id];
  if (!f) return null;
  const letter = f.label[0];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }} title={f.label}>
      <svg width={size} height={size} viewBox="0 0 26 26">
        <defs>
          <radialGradient id={`wax-${id}`} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0%" stopColor="#a8302a" />
            <stop offset="55%" stopColor="#6b1818" />
            <stop offset="100%" stopColor="#3a0c0c" />
          </radialGradient>
        </defs>
        <path
          d="M13 1 L16 4 L20 3 L21 7 L25 9 L23 13 L25 17 L21 19 L20 23 L16 22 L13 25 L10 22 L6 23 L5 19 L1 17 L3 13 L1 9 L5 7 L6 3 L10 4 Z"
          fill={`url(#wax-${id})`}
          stroke="#2a0808"
          strokeWidth="0.6"
        />
        <text
          x="13" y="17.2" textAnchor="middle"
          fontSize="11"
          fontFamily="'UnifrakturMaguntia', 'IM Fell English SC', serif"
          fontWeight="700"
          fill="#f1e1c2"
          style={{ textShadow: "0 0 1px #2a0808" }}
        >{letter}</text>
      </svg>
      {withLabel ? (
        <span style={{
          font: "600 12px 'IM Fell English SC', serif",
          letterSpacing: ".12em",
          color: "#3a2410",
          textTransform: "uppercase",
        }}>{f.label}</span>
      ) : null}
    </span>
  );
};

// ------------------------------------------------------------
// Tier sigil — daggers/skulls increasing with rank
// ------------------------------------------------------------
window.TierSigil = function TierSigil({ id, size = 18, withLabel = true }) {
  const t = TIER_MAP[id];
  if (!t) return null;
  const dots = "✦".repeat(t.rank);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: t.ink, fontSize: size, letterSpacing: "1px" }}>{dots}</span>
      {withLabel ? (
        <span style={{
          font: `700 ${Math.max(11, size - 4)}px 'IM Fell English SC', serif`,
          textTransform: "uppercase",
          letterSpacing: ".18em",
          color: t.ink,
        }}>{t.label}</span>
      ) : null}
    </span>
  );
};

// ------------------------------------------------------------
// Stat icon — small parchment-stamp circle with letter
// ------------------------------------------------------------
window.StatIcon = function StatIcon({ stat, size = 26 }) {
  const map = {
    hp:  { letter: "H", hue: 0,   label: "HP"  },
    atk: { letter: "A", hue: 20,  label: "ATK" },
    def: { letter: "D", hue: 220, label: "DEF" },
    mag: { letter: "M", hue: 280, label: "MAG" },
    res: { letter: "R", hue: 305, label: "RES" },
    spd: { letter: "S", hue: 80,  label: "SPD" },
  };
  const s = map[stat];
  if (!s) return null;
  const ink = `oklch(0.34 0.10 ${s.hue})`;
  const fill = `oklch(0.86 0.04 ${s.hue})`;
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-label={s.label}>
      <circle cx="11" cy="11" r="9.5" fill={fill} stroke={ink} strokeWidth="0.8" />
      <text x="11" y="15" textAnchor="middle" fontSize="12"
        fontFamily="'IM Fell English SC', serif" fontWeight="700" fill={ink}>{s.letter}</text>
    </svg>
  );
};

window.STAT_LABELS = {
  hp:"Hit Points", atk:"Attack", def:"Defense",
  mag:"Magic", res:"Resist", spd:"Speed",
};

// ------------------------------------------------------------
// Decorative SVG flourishes
// ------------------------------------------------------------
window.Flourish = function Flourish({ flip = false, width = 240, color = "#3a1a0c" }) {
  return (
    <svg width={width} height="18" viewBox="0 0 240 18" style={{ transform: flip ? "scaleX(-1)" : "none" }}>
      <path d="M2 9 L80 9 M85 9 Q 95 2, 105 9 Q 115 16, 125 9 L 235 9"
        stroke={color} strokeWidth="0.8" fill="none" />
      <path d="M105 9 m-2 -2 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0 Z" fill={color} />
      <path d="M0 9 L4 6 L4 12 Z" fill={color} />
      <path d="M240 9 L236 6 L236 12 Z" fill={color} />
    </svg>
  );
};

window.CornerOrnament = function CornerOrnament({ corner = "tl", size = 60, color = "#3a1a0c" }) {
  const rot = { tl: 0, tr: 90, br: 180, bl: 270 }[corner] || 0;
  return (
    <svg width={size} height={size} viewBox="0 0 60 60"
      style={{ position: "absolute", transform: `rotate(${rot}deg)`, opacity: 0.9 }}>
      <g stroke={color} fill="none" strokeWidth="0.9">
        <path d="M4 4 L4 30 M4 4 L30 4" />
        <path d="M4 28 Q 10 22, 16 22 Q 22 22, 22 16 Q 22 10, 28 4" />
        <circle cx="22" cy="22" r="2" fill={color} />
        <path d="M4 38 L4 44 M10 44 L4 44" />
      </g>
    </svg>
  );
};
