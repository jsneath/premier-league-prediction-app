// The club crest: an angular shield split lime/blue with a ball at its centre.
// Kept as inline SVG so it stays sharp at any size and can be tinted by CSS.
function Crest({ size = 34, className = "", animated = false }) {
  const uid = "crest";
  return (
    <svg
      className={`crest ${animated ? "crest-animated" : ""} ${className}`}
      width={size}
      height={(size * 56) / 48}
      viewBox="0 0 48 56"
      fill="none"
      role="img"
      aria-label="PL Predictions crest"
    >
      <defs>
        <linearGradient id={`${uid}-lime`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#DDFF7A" />
          <stop offset="100%" stopColor="#A8D82B" />
        </linearGradient>
        <linearGradient id={`${uid}-blue`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3FB0FF" />
          <stop offset="100%" stopColor="#0A66C2" />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <path d="M3 3 H45 V31.5 L24 53 L3 31.5 Z" />
        </clipPath>
      </defs>

      {/* Shield body, split diagonally */}
      <g clipPath={`url(#${uid}-clip)`}>
        <rect x="0" y="0" width="48" height="56" fill={`url(#${uid}-blue)`} />
        <path d="M0 0 H48 L0 56 Z" fill={`url(#${uid}-lime)`} />
        {/* floodlight sheen that sweeps across on hover / load */}
        <rect className="crest-sheen" x="-30" y="-10" width="18" height="76" fill="#fff" opacity="0.35" />
      </g>

      {/* Ball */}
      <g transform="translate(24 25)">
        <circle r="9.5" fill="#08111C" />
        <circle r="9.5" fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.9" />
        <path
          d="M0 -5.4 L5.1 -1.7 L3.2 4.4 L-3.2 4.4 L-5.1 -1.7 Z"
          fill="#fff"
        />
        <path
          d="M0 -9.5 V-5.4 M5.1 -1.7 L9 -3.6 M3.2 4.4 L5.8 7.9 M-3.2 4.4 L-5.8 7.9 M-5.1 -1.7 L-9 -3.6"
          stroke="#fff"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.9"
        />
      </g>

      {/* Shield outline */}
      <path
        d="M3 3 H45 V31.5 L24 53 L3 31.5 Z"
        fill="none"
        stroke="#08111C"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default Crest;
