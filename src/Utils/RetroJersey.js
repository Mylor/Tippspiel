import React from 'react';

export function RetroJersey({ color = '#FFFFFF', number = '10', size = 28 }) {
  // Kontrastfarbe für die Rückennummer berechnen (Dunkler Text auf hellem Trikot und umgekehrt)
  const isLightColor = ['#FFFFFF', '#EAB308', '#10B981'].includes(color.toUpperCase());
  const textColor = isLightColor ? '#18181b' : '#FFFFFF';

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block align-middle select-none"
    >
      {/* Trikot-Body & Ärmel */}
      <path 
        d="M6 4.5L9 2.5H15L18 4.5L22 7.5L19.5 10.5L17.5 9.5V21.5H6.5V9.5L4.5 10.5L2 7.5L6 4.5Z" 
        fill={color} 
        stroke="#000000" 
        strokeWidth="1.5" 
        strokeLinejoin="round"
      />
      {/* Kragen-Ausschnitt */}
      <path 
        d="M9 2.5C9 4 15 4 15 2.5" 
        stroke="#000000" 
        strokeWidth="1.5" 
        strokeLinejoin="round"
      />
      {/* Ärmel-Streifen (Retro-Look) */}
      <path d="M4 6L5.5 7.5" stroke="#000000" strokeWidth="1" />
      <path d="M20 6L18.5 7.5" stroke="#000000" strokeWidth="1" />
      
      {/* Trikotnummer */}
      <text 
        x="12" 
        y="15.5" 
        fill={textColor} 
        fontSize="7.5" 
        fontWeight="900" 
        textAnchor="middle" 
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
      >
        {number}
      </text>
    </svg>
  );
}