import React from 'react';

// M-Pesa SVG Logo (Red Phone, Green Bill, m-pesa typography)
export const MPesaLogo: React.FC<{ className?: string }> = ({ className = "h-6 w-auto" }) => (
  <svg viewBox="0 0 160 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Phone Body */}
    <rect x="5" y="4" width="22" height="38" rx="4" stroke="#E1141B" strokeWidth="3" fill="none" />
    <circle cx="16" cy="37" r="1.5" fill="#E1141B" />
    <rect x="11" y="8" width="10" height="2" rx="1" fill="#E1141B" />
    {/* Green Money Wave */}
    <path d="M2 22C10 16 18 26 28 18C22 24 14 14 2 22Z" fill="#4CAF50" />
    <path d="M6 24C12 18 20 28 30 20C24 26 16 16 6 24Z" fill="#388E3C" opacity="0.8" />
    {/* m-pesa Text */}
    <text x="36" y="33" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="24" fill="#E1141B" letterSpacing="-0.5">m-pesa</text>
  </svg>
);

// Orange Money SVG Logo (Black Arrow top-left, Orange Arrow bottom-right + "Orange Money" text)
export const OrangeMoneyLogo: React.FC<{ className?: string }> = ({ className = "h-6 w-auto" }) => (
  <svg viewBox="0 0 170 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Arrows Graphic */}
    <g transform="translate(2, 4) scale(0.85)">
      {/* Top Left Black Arrow */}
      <path d="M 0,22 L 20,2 L 20,12 L 8,12 L 8,22 Z" fill="#000000" />
      <path d="M 8,12 L 20,24 L 20,14 L 14,14 Z" fill="#000000" />
      {/* Bottom Right Orange Arrow */}
      <path d="M 22,2 L 42,22 L 32,22 L 32,12 L 22,12 Z" fill="#FF6600" />
      <path d="M 32,22 L 20,34 L 20,24 L 26,24 Z" fill="#FF6600" />
    </g>
    {/* Orange Money Text */}
    <text x="44" y="21" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="16" fill="#000000">Orange</text>
    <text x="44" y="39" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="17" fill="#FF6600">Money</text>
  </svg>
);

// Airtel Money SVG Logo (Airtel Red Loop Symbol + "airtel money")
export const AirtelMoneyLogo: React.FC<{ className?: string }> = ({ className = "h-6 w-auto" }) => (
  <svg viewBox="0 0 160 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Airtel Wave Loop */}
    <path d="M 22,10 C 10,10 4,20 4,28 C 4,36 12,42 20,42 C 28,42 30,34 26,28 C 22,22 12,24 12,30 C 12,34 16,36 20,36 C 24,36 26,30 22,26 C 18,22 12,28 16,32" stroke="#E40000" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* Text airtel money */}
    <text x="36" y="27" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="18" fill="#E40000">airtel</text>
    <text x="36" y="42" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="14" fill="#FFCC00">money</text>
  </svg>
);

// Afrimoney SVG Logo (Purple Wallet/Cards + Orange "afrimoney" text)
export const AfrimoneyLogo: React.FC<{ className?: string }> = ({ className = "h-6 w-auto" }) => (
  <svg viewBox="0 0 170 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Purple Folder/Wallet Graphic */}
    <g transform="translate(2, 6) scale(0.85)">
      <path d="M 8,2 C 6,2 4,4 5,6 L 14,36 C 15,38 17,40 20,38 L 30,32 C 32,31 32,28 31,26 L 22,4 C 21,2 18,1 16,2 Z" fill="#8C1D82" />
      <path d="M 12,0 C 10,0 8,2 9,4 L 18,34 C 19,36 21,38 24,36 L 34,30 C 36,29 36,26 35,24 L 26,2 C 25,0 22,-1 20,0 Z" fill="#A1188B" />
      {/* Arrow inside wallet */}
      <path d="M 14,18 L 22,22 L 18,26 M 22,22 L 12,12" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>
    {/* Text: "afri" in Purple, "money" in Orange */}
    <text x="36" y="34" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="21">
      <tspan fill="#8C1D82">afri</tspan>
      <tspan fill="#FF7900">money</tspan>
    </text>
  </svg>
);
