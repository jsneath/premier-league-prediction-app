import { useId } from "react";

// Ember-split shield with a football. Unique ids so multiple crests on one
// page don't clash. Kept as inline SVG so it stays sharp at any size.
function Crest({ size = 34, className = "", animated = false }) {
  const uid = useId().replace(/:/g, "");
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
        <linearGradient id={`${uid}-ember`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF8A4A" />
          <stop offset="55%" stopColor="#FF4B1F" />
          <stop offset="100%" stopColor="#B81F08" />
        </linearGradient>
        <linearGradient id={`${uid}-void`} x1="0.2" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1A1C22" />
          <stop offset="100%" stopColor="#05060A" />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <path d="M4 2.5 H44 V30.5 L24 53.5 L4 30.5 Z" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${uid}-clip)`}>
        <rect x="0" y="0" width="48" height="56" fill={`url(#${uid}-void)`} />
        <path d="M-4 -4 H52 L-4 60 Z" fill={`url(#${uid}-ember)`} />
        <rect
          className="crest-sheen"
          x="-28"
          y="-12"
          width="16"
          height="80"
          fill="#fff"
          opacity="0.28"
        />
      </g>

      <g transform="translate(24 26)">
        <circle r="9.2" fill="#07080C" />
        <circle r="9.2" fill="none" stroke="#F4EFE6" strokeWidth="1.35" />
        <path
          d="M0 -5.1 L4.8 -1.6 L3 4.2 L-3 4.2 L-4.8 -1.6 Z"
          fill="#F4EFE6"
        />
        <path
          d="M0 -9.2 V-5.1 M4.8 -1.6 L8.6 -3.4 M3 4.2 L5.5 7.6 M-3 4.2 L-5.5 7.6 M-4.8 -1.6 L-8.6 -3.4"
          stroke="#F4EFE6"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </g>

      <path
        d="M4 2.5 H44 V30.5 L24 53.5 L4 30.5 Z"
        fill="none"
        stroke="#F4EFE6"
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}

export default Crest;
