export function BrandMark({
  className = "brand-mark",
  size,
}: {
  withPeriod?: boolean;
  className?: string;
  size?: number;
}) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true" width={size} height={size}>
      {/* Blueprint grid & axis guidelines */}
      <g stroke="#34392e" strokeWidth="0.8" opacity="0.85">
        <line x1="32" y1="2" x2="32" y2="62" strokeDasharray="2 3" />
        <line x1="2" y1="31" x2="62" y2="31" strokeDasharray="2 3" />
        <line x1="11" y1="5" x2="11" y2="59" strokeDasharray="1 3" />
        <line x1="53" y1="5" x2="53" y2="59" strokeDasharray="1 3" />
        <line x1="11" y1="5" x2="53" y2="5" />
        <line x1="11" y1="59" x2="53" y2="59" />
      </g>

      {/* Technical ticks and angle indicator */}
      <g stroke="#777d70" strokeWidth="0.8">
        <line x1="9" y1="5" x2="13" y2="5" />
        <line x1="11" y1="3" x2="11" y2="7" />
        <line x1="51" y1="5" x2="55" y2="5" />
        <line x1="53" y1="3" x2="53" y2="7" />
        <line x1="9" y1="59" x2="13" y2="59" />
        <line x1="51" y1="59" x2="55" y2="59" />
        <path d="M47 13 A 8 8 0 0 1 53 19" fill="none" strokeDasharray="1.5 1.5" />
      </g>

      {/* Stone Foundation / Plinth */}
      <polygon points="10,59 54,59 51,55 13,55" fill="#181c16" stroke="#34392e" strokeWidth="0.8" />
      <polygon points="14,55 50,55 47,51 17,51" fill="#22281e" stroke="#34392e" strokeWidth="0.8" />

      {/* Obelisk Lower Shaft: Left facet (light bone) & Right facet (shaded bone) */}
      <polygon points="32,26 19,26 17,51 32,51" fill="#eeeee6" stroke="#111310" strokeWidth="0.6" />
      <polygon points="32,26 45,26 47,51 32,51" fill="#bec2b6" stroke="#111310" strokeWidth="0.6" />
      <line x1="19" y1="26" x2="45" y2="26" stroke="#111310" strokeWidth="1.2" />

      {/* Obelisk Pyramidion Cap */}
      <polygon points="32,5 20,20 32,23" fill="#f8f8f4" stroke="#111310" strokeWidth="0.6" />
      <polygon points="20,20 19,26 32,26 32,23" fill="#e0e3da" stroke="#111310" strokeWidth="0.6" />
      <polygon points="32,5 44,20 32,23" fill="#cad0c4" stroke="#111310" strokeWidth="0.6" />
      <polygon points="44,20 45,26 32,26 32,23" fill="#9da296" stroke="#111310" strokeWidth="0.6" />

      {/* Center Ridge Crease */}
      <line x1="32" y1="5" x2="32" y2="51" stroke="#111310" strokeWidth="1.1" />

      {/* Monolith Outer Edge Contour */}
      <polygon
        points="32,5 44,20 45,26 47,51 17,51 19,26 20,20"
        fill="none"
        stroke="#111310"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Lateral Laser Projection Guidelines */}
      <g stroke="#c6f36b" strokeWidth="1.4">
        <line x1="2" y1="31" x2="16" y2="31" />
        <line x1="48" y1="31" x2="62" y2="31" />
        <circle cx="2" cy="31" r="1.2" fill="#c6f36b" />
        <circle cx="62" cy="31" r="1.2" fill="#c6f36b" />
      </g>

      {/* Recessed Shadow Cavity */}
      <path
        d="M32 14 L36 21 L35 27 L45 26 L49 31 L45 36 L35 35 L36 43 L32 49 L28 43 L29 35 L19 36 L15 31 L19 26 L29 27 L28 21 Z"
        fill="#0d0f0c"
        stroke="#191c17"
        strokeWidth="1"
      />

      {/* Neon Lime Cross / Plus */}
      <path
        d="M32 16 L34.5 22 L33.5 28 L43.5 27.5 L47 31 L43.5 34.5 L33.5 34 L34.5 41 L32 47 L29.5 41 L30.5 34 L20.5 34.5 L17 31 L20.5 27.5 L30.5 28 L29.5 22 Z"
        fill="#c6f36b"
      />

      {/* Center Crosshair Target */}
      <circle cx="32" cy="31" r="1.6" fill="#111310" />
      <circle cx="32" cy="31" r="0.6" fill="#c6f36b" />
      <line x1="32" y1="28" x2="32" y2="34" stroke="#111310" strokeWidth="0.8" />
      <line x1="29" y1="31" x2="35" y2="31" stroke="#111310" strokeWidth="0.8" />
    </svg>
  );
}

export function Logo() {
  return (
    <>
      <BrandMark />
      <span>
        deadfolio<span className="accent">.</span>
      </span>
    </>
  );
}
