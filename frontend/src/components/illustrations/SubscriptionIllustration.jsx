import React from "react";

export function SubscriptionIllustration({ className = "w-full max-w-[540px] h-auto" }) {
  return (
    <svg
      viewBox="0 0 680 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="PayDoo subscription billing platform team illustration"
    >
      <defs>
        {/* Soft Drop Shadows */}
        <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="125%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#1B3D35" floodOpacity="0.08" />
        </filter>
        <filter id="floatShadow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="2" dy="8" stdDeviation="8" floodColor="#1B3D35" floodOpacity="0.12" />
        </filter>
        <filter id="coinGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#D2785A" floodOpacity="0.2" />
        </filter>

        {/* Gradients */}
        <linearGradient id="panelGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F9FAF7" />
        </linearGradient>

        <linearGradient id="barGrad1" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#2A5A4E" />
          <stop offset="100%" stopColor="#1B3D35" />
        </linearGradient>

        <linearGradient id="barGrad2" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#E28E73" />
          <stop offset="100%" stopColor="#D2785A" />
        </linearGradient>

        <linearGradient id="coinGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        <linearGradient id="cardBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1B3D35" />
          <stop offset="100%" stopColor="#2C5E53" />
        </linearGradient>
      </defs>

      {/* BASE GROUND PLANE: Soft tinted circular platform */}
      <ellipse cx="340" cy="455" rx="310" ry="32" fill="#E2EBE5" />
      <ellipse cx="340" cy="452" rx="270" ry="24" fill="#EAF0EC" />

      {/* ======================================================== */}
      {/* 1. LARGE BACKGROUND UI PANELS (Subscription Billing Hub) */}
      {/* ======================================================== */}

      {/* MAIN CENTRAL DASHBOARD PANEL */}
      <g filter="url(#cardShadow)">
        <rect x="110" y="80" width="460" height="310" rx="16" fill="url(#panelGrad)" stroke="#E1EBE4" strokeWidth="2" />
        
        {/* Panel Header Bar */}
        <rect x="110" y="80" width="460" height="36" rx="16" fill="#F0F5F1" />
        <rect x="110" y="100" width="460" height="16" fill="#F0F5F1" />
        <line x1="110" y1="116" x2="570" y2="116" stroke="#E1EBE4" strokeWidth="1.5" />
        
        {/* Window Control Dots */}
        <circle cx="132" cy="98" r="4.5" fill="#D2785A" />
        <circle cx="146" cy="98" r="4.5" fill="#E9C46A" />
        <circle cx="160" cy="98" r="4.5" fill="#48BB78" />
        
        {/* Header Tab Pills */}
        <rect x="190" y="90" width="70" height="16" rx="8" fill="#1B3D35" fillOpacity="0.1" />
        <rect x="200" y="95" width="50" height="6" rx="3" fill="#1B3D35" />
        <rect x="270" y="90" width="60" height="16" rx="8" fill="#FFFFFF" />
        <rect x="280" y="95" width="40" height="6" rx="3" fill="#A0AEC0" />

        {/* Dashboard Grid Lines */}
        <line x1="130" y1="200" x2="550" y2="200" stroke="#EDF2EE" strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1="130" y1="280" x2="550" y2="280" stroke="#EDF2EE" strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1="130" y1="360" x2="550" y2="360" stroke="#EDF2EE" strokeWidth="1.5" strokeDasharray="4 4" />
      </g>

      {/* GROWING REVENUE BAR CHART (Right side of panel) */}
      <g>
        {/* Chart Frame */}
        <rect x="360" y="140" width="185" height="160" rx="10" fill="#FFFFFF" stroke="#E2EBE5" strokeWidth="1.5" />
        <text x="375" y="162" fill="#1B3D35" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="11" fontWeight="700">MRR Revenue Growth</text>
        <text x="495" y="162" fill="#D2785A" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="10" fontWeight="700">+28.4%</text>

        {/* Bar 1: Month 1 */}
        <rect x="380" y="240" width="22" height="45" rx="4" fill="#C5D9D2" />
        {/* Bar 2: Month 2 */}
        <rect x="412" y="215" width="22" height="70" rx="4" fill="#88B1A4" />
        {/* Bar 3: Month 3 */}
        <rect x="444" y="190" width="22" height="95" rx="4" fill="#3D7063" />
        {/* Bar 4: Month 4 (Highest - Active growth) */}
        <rect x="476" y="170" width="22" height="115" rx="4" fill="url(#barGrad2)" />
        {/* Bar 5: Projected */}
        <rect x="508" y="152" width="20" height="133" rx="4" fill="#F3C4B3" stroke="#D2785A" strokeWidth="1.5" strokeDasharray="3 3" />

        {/* Growth Line & Trend Arrow */}
        <path d="M391 235 L423 210 L455 185 L487 165 L518 147" stroke="#1B3D35" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="518" cy="147" r="4" fill="#1B3D35" />
      </g>

      {/* RECURRING PAYMENT CALENDAR (Left center panel) */}
      <g filter="url(#cardShadow)">
        <rect x="140" y="140" width="195" height="135" rx="10" fill="#FFFFFF" stroke="#E2EBE5" strokeWidth="1.5" />
        {/* Calendar Header */}
        <rect x="140" y="140" width="195" height="28" rx="10" fill="#1B3D35" />
        <rect x="140" y="158" width="195" height="10" fill="#1B3D35" />
        <text x="156" y="159" fill="#FFFFFF" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="10" fontWeight="700">Billing Cycle: Monthly</text>
        
        {/* Mini Calendar Grid (3 rows x 5 columns) */}
        <g fill="#A0AEC0">
          {/* Row 1 */}
          <rect x="155" y="180" width="22" height="14" rx="3" fill="#F0F4F1" />
          <rect x="185" y="180" width="22" height="14" rx="3" fill="#F0F4F1" />
          <rect x="215" y="180" width="22" height="14" rx="3" fill="#D2785A" fillOpacity="0.2" />
          <rect x="245" y="180" width="22" height="14" rx="3" fill="#F0F4F1" />
          <rect x="275" y="180" width="22" height="14" rx="3" fill="#F0F4F1" />

          {/* Row 2 */}
          <rect x="155" y="202" width="22" height="14" rx="3" fill="#F0F4F1" />
          {/* Active Auto-pay Date */}
          <rect x="185" y="202" width="22" height="14" rx="3" fill="#1B3D35" />
          <circle cx="196" cy="209" r="2.5" fill="#FFFFFF" />
          
          <rect x="215" y="202" width="22" height="14" rx="3" fill="#F0F4F1" />
          <rect x="245" y="202" width="22" height="14" rx="3" fill="#E8F5E9" />
          <rect x="275" y="202" width="22" height="14" rx="3" fill="#F0F4F1" />

          {/* Row 3 */}
          <rect x="155" y="224" width="22" height="14" rx="3" fill="#F0F4F1" />
          <rect x="185" y="224" width="22" height="14" rx="3" fill="#F0F4F1" />
          <rect x="215" y="224" width="22" height="14" rx="3" fill="#1B3D35" fillOpacity="0.15" />
          <rect x="245" y="224" width="22" height="14" rx="3" fill="#F0F4F1" />
          <rect x="275" y="224" width="22" height="14" rx="3" fill="#D2785A" />
          <circle cx="286" cy="231" r="2.5" fill="#FFFFFF" />
        </g>
        
        {/* Status label under calendar */}
        <text x="156" y="258" fill="#1B3D35" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="9" fontWeight="600">
          ● Auto-charge scheduled: 1st of month
        </text>
      </g>

      {/* ======================================================== */}
      {/* 2. THE TEAM (5 CHARACTERS THEMED ON SUBSCRIPTION BILLING) */}
      {/* ======================================================== */}

      {/* -------------------------------------------------------- */}
      {/* CHARACTER 3: CLIMBING LADDER ADJUSTING BAR CHART (Blue/Purple) */}
      {/* -------------------------------------------------------- */}
      <g id="character-ladder">
        {/* The Wooden Ladder */}
        <line x1="535" y1="130" x2="570" y2="445" stroke="#C59A7A" strokeWidth="5" strokeLinecap="round" />
        <line x1="560" y1="130" x2="595" y2="445" stroke="#C59A7A" strokeWidth="5" strokeLinecap="round" />
        {/* Ladder Rungs */}
        <line x1="540" y1="170" x2="565" y2="170" stroke="#A97E5E" strokeWidth="3" />
        <line x1="545" y1="210" x2="570" y2="210" stroke="#A97E5E" strokeWidth="3" />
        <line x1="549" y1="250" x2="574" y2="250" stroke="#A97E5E" strokeWidth="3" />
        <line x1="553" y1="290" x2="578" y2="290" stroke="#A97E5E" strokeWidth="3" />
        <line x1="557" y1="330" x2="582" y2="330" stroke="#A97E5E" strokeWidth="3" />
        <line x1="561" y1="370" x2="586" y2="370" stroke="#A97E5E" strokeWidth="3" />
        <line x1="565" y1="410" x2="590" y2="410" stroke="#A97E5E" strokeWidth="3" />

        {/* Character on Ladder (Climbing up, reaching to top bar) */}
        {/* Left Leg on rung */}
        <path d="M542 270 L548 290 L556 290" stroke="#1E293B" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        {/* Right Leg stepping up */}
        <path d="M550 260 L558 245 L568 250" stroke="#1E293B" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Torso in Vibrant Blue (#3A86FF) */}
        <path d="M536 215 C536 210, 555 210, 556 215 L552 265 L538 265 Z" fill="#3A86FF" />
        
        {/* Left Arm holding ladder */}
        <path d="M540 220 L552 205 L558 210" stroke="#3A86FF" strokeWidth="6" strokeLinecap="round" fill="none" />
        <circle cx="560" cy="210" r="3.5" fill="#F8C291" />

        {/* Right Arm Reaching to Bar Chart */}
        <path d="M545 220 L530 195 L516 175" stroke="#3A86FF" strokeWidth="6" strokeLinecap="round" fill="none" />
        <circle cx="515" cy="173" r="4" fill="#F8C291" />
        {/* Sparkle at reach point */}
        <path d="M515 160 L517 165 L522 167 L517 169 L515 174 L513 169 L508 167 L513 165 Z" fill="#F59E0B" />

        {/* Head & Hair */}
        <circle cx="546" cy="198" r="11" fill="#F8C291" />
        <path d="M537 194 C537 186, 555 186, 556 193 C556 197, 550 195, 546 195 C540 195, 538 197, 537 194 Z" fill="#1B3D35" />
      </g>

      {/* -------------------------------------------------------- */}
      {/* CHARACTER 5: STANDING ON BLOCK PLACING RENEWAL ICON (Green/Orange) */}
      {/* -------------------------------------------------------- */}
      <g id="character-block">
        {/* Solid Geometric Stepped Pedestal Block */}
        <rect x="290" y="325" width="55" height="120" rx="6" fill="#1B3D35" />
        <rect x="288" y="322" width="59" height="12" rx="4" fill="#2E5C50" />
        {/* Block Accent lines */}
        <line x1="305" y1="355" x2="330" y2="355" stroke="#46776A" strokeWidth="2" strokeLinecap="round" />
        <line x1="305" y1="375" x2="325" y2="375" stroke="#46776A" strokeWidth="2" strokeLinecap="round" />

        {/* Character Legs in Teal/Charcoal */}
        <path d="M305 322 L305 275" stroke="#14241F" strokeWidth="9" strokeLinecap="round" />
        <path d="M322 322 L322 275" stroke="#14241F" strokeWidth="9" strokeLinecap="round" />
        {/* Shoes */}
        <ellipse cx="305" cy="324" rx="7" ry="4" fill="#D2785A" />
        <ellipse cx="323" cy="324" rx="7" ry="4" fill="#D2785A" />

        {/* Torso in Warm Orange/Terracotta (#D2785A) */}
        <path d="M300 220 C300 215, 327 215, 327 220 L325 275 L302 275 Z" fill="#D2785A" />
        <line x1="313" y1="222" x2="313" y2="255" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />

        {/* Head & Stylish Ponytail */}
        <circle cx="313" cy="202" r="11" fill="#FFDFC4" />
        <path d="M304 200 C304 189, 322 189, 322 200 Z" fill="#264653" />
        <path d="M320 200 C326 202, 332 208, 330 215" stroke="#264653" strokeWidth="4.5" strokeLinecap="round" fill="none" />

        {/* Left Hand Holding Circular Renewal Badge */}
        <path d="M303 230 L285 220 L275 225" stroke="#D2785A" strokeWidth="6" strokeLinecap="round" fill="none" />
        <circle cx="274" cy="226" r="3.5" fill="#FFDFC4" />

        {/* CIRCULAR RENEWAL BADGE (Double Arrows Sync) */}
        <g filter="url(#floatShadow)">
          <circle cx="260" cy="225" r="18" fill="#1B3D35" />
          <circle cx="260" cy="225" r="15" fill="#2E5C50" stroke="#C5EADF" strokeWidth="1.5" />
          {/* Circular Arrows (Renewal icon) */}
          <path d="M253 222 A7 7 0 0 1 267 220 L269 216 M267 228 A7 7 0 0 1 253 230 L251 234" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      </g>

      {/* -------------------------------------------------------- */}
      {/* CHARACTER 1: AT DESK WITH MONITOR SHOWING INVOICE (Orange/Slate) */}
      {/* -------------------------------------------------------- */}
      <g id="character-desk">
        {/* Modern Wooden Desk */}
        <rect x="70" y="360" width="125" height="10" rx="3" fill="#D2785A" />
        <rect x="75" y="370" width="6" height="75" fill="#A8573D" />
        <rect x="184" y="370" width="6" height="75" fill="#A8573D" />

        {/* Desk Monitor with Invoice Preview */}
        <rect x="90" y="300" width="62" height="48" rx="4" fill="#1B3D35" />
        <rect x="93" y="303" width="56" height="42" rx="2" fill="#FFFFFF" />
        {/* Invoice Header on Monitor */}
        <rect x="97" y="307" width="24" height="4" rx="1.5" fill="#D2785A" />
        <rect x="135" y="307" width="10" height="4" rx="1.5" fill="#1B3D35" />
        {/* Invoice Lines */}
        <line x1="97" y1="316" x2="145" y2="316" stroke="#E2EBE5" strokeWidth="2" />
        <line x1="97" y1="322" x2="135" y2="322" stroke="#E2EBE5" strokeWidth="2" />
        <line x1="97" y1="328" x2="140" y2="328" stroke="#E2EBE5" strokeWidth="2" />
        {/* Mini Green Paid Bar on screen */}
        <rect x="97" y="335" width="28" height="6" rx="2" fill="#38A169" />
        <line x1="120" y1="348" x2="122" y2="360" stroke="#718096" strokeWidth="4" />
        <rect x="110" y="358" width="22" height="3" rx="1.5" fill="#4A5568" />

        {/* Ergonomic Office Chair */}
        <ellipse cx="140" cy="405" rx="16" ry="6" fill="#A0AEC0" />
        <line x1="140" y1="405" x2="140" y2="445" stroke="#718096" strokeWidth="4" />
        <line x1="128" y1="445" x2="152" y2="445" stroke="#718096" strokeWidth="3" strokeLinecap="round" />

        {/* Seated Person (Orange top #F4A261, navy pants) */}
        {/* Legs bent in seated pose */}
        <path d="M142 390 L155 410 L155 445" stroke="#264653" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M136 390 L146 410 L146 445" stroke="#1E293B" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />

        {/* Torso in Orange/Yellow sweater */}
        <path d="M130 338 C130 332, 150 332, 150 338 L146 390 L128 390 Z" fill="#F4A261" />

        {/* Arms Typing on Desk */}
        <path d="M134 345 L120 360 L108 360" stroke="#F4A261" strokeWidth="6" strokeLinecap="round" fill="none" />
        <circle cx="106" cy="360" r="3" fill="#F8C291" />

        {/* Head & Glasses */}
        <circle cx="140" cy="324" r="10" fill="#F8C291" />
        <path d="M132 322 C132 314, 148 314, 148 322 Z" fill="#4A5568" />
        <circle cx="137" cy="325" r="2.5" stroke="#1B3D35" strokeWidth="1" fill="none" />
      </g>

      {/* -------------------------------------------------------- */}
      {/* CHARACTER 2: HOLDING TABLET WITH RECURRING CALENDAR (Yellow/Blue) */}
      {/* -------------------------------------------------------- */}
      <g id="character-tablet">
        {/* Character Standing tall near center-left */}
        {/* Legs in Slate Blue trousers */}
        <path d="M225 365 L225 445" stroke="#2B6CB0" strokeWidth="8" strokeLinecap="round" />
        <path d="M239 365 L242 445" stroke="#2B6CB0" strokeWidth="8" strokeLinecap="round" />
        <ellipse cx="224" cy="446" rx="6" ry="3.5" fill="#1B3D35" />
        <ellipse cx="243" cy="446" rx="6" ry="3.5" fill="#1B3D35" />

        {/* Torso in Vibrant Mustard Yellow (#E9C46A) */}
        <path d="M220 300 C220 295, 245 295, 245 300 L242 365 L222 365 Z" fill="#E9C46A" />

        {/* Head & Curly Hair */}
        <circle cx="232" cy="282" r="11" fill="#E0A96D" />
        <circle cx="232" cy="275" r="12" fill="#7B341E" />
        <circle cx="228" cy="274" r="4" fill="#7B341E" />
        <circle cx="236" cy="274" r="4" fill="#7B341E" />

        {/* Arms Holding Tablet */}
        <path d="M222 310 L212 325 L218 335" stroke="#E9C46A" strokeWidth="5.5" strokeLinecap="round" fill="none" />
        <path d="M243 310 L238 328 L230 334" stroke="#E9C46A" strokeWidth="5.5" strokeLinecap="round" fill="none" />
        
        {/* Sleek Tablet Screen */}
        <g filter="url(#floatShadow)">
          <rect x="204" y="318" width="36" height="28" rx="3" fill="#1B3D35" />
          <rect x="206" y="320" width="32" height="24" rx="2" fill="#FFFFFF" />
          {/* Mini Calendar on Tablet */}
          <rect x="208" y="322" width="28" height="4" fill="#D2785A" />
          <circle cx="212" cy="331" r="2" fill="#38A169" />
          <circle cx="218" cy="331" r="2" fill="#38A169" />
          <circle cx="224" cy="331" r="2" fill="#38A169" />
          <circle cx="230" cy="331" r="2" fill="#D2785A" />
          <circle cx="212" cy="338" r="2" fill="#38A169" />
          <circle cx="218" cy="338" r="2" fill="#38A169" />
        </g>
      </g>

      {/* -------------------------------------------------------- */}
      {/* CHARACTER 4: KNEELING BY BIG ₹ COIN & PAID BADGE (Purple) */}
      {/* -------------------------------------------------------- */}
      <g id="character-coin">
        {/* Kneeling pose */}
        {/* Right leg folded under */}
        <path d="M440 405 L455 435 L475 445" stroke="#4C1D95" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        {/* Left leg bent forward */}
        <path d="M430 405 L420 425 L430 445" stroke="#5B21B6" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx="430" cy="446" rx="6" ry="3.5" fill="#D2785A" />

        {/* Torso in Royal Purple (#7209B7 / #8338EC) */}
        <path d="M422 355 C422 350, 444 350, 444 355 L442 410 L422 410 Z" fill="#7209B7" />

        {/* Head & Bob Haircut */}
        <circle cx="433" cy="338" r="10.5" fill="#F8C291" />
        <path d="M424 336 C424 326, 442 326, 442 336 C442 342, 439 344, 433 344 C427 344, 424 342, 424 336 Z" fill="#1B3D35" />

        {/* Hand resting proudly on the Giant ₹ Coin */}
        <path d="M425 365 L405 385 L392 390" stroke="#7209B7" strokeWidth="6" strokeLinecap="round" fill="none" />
        <circle cx="390" cy="390" r="4" fill="#F8C291" />

        {/* THE GIANT INDIAN RUPEE COIN (₹) */}
        <g filter="url(#coinGlow)">
          <circle cx="370" cy="410" r="36" fill="url(#coinGrad)" stroke="#B45309" strokeWidth="3" />
          <circle cx="370" cy="410" r="30" fill="none" stroke="#FEF3C7" strokeWidth="2" strokeDasharray="3 3" />
          
          {/* Engraved ₹ Symbol */}
          <text
            x="370"
            y="423"
            textAnchor="middle"
            fill="#78350F"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontSize="34"
            fontWeight="800"
          >
            ₹
          </text>
        </g>

        {/* "PAID" CHECKMARK BADGE PILL (Resting next to Coin) */}
        <g filter="url(#floatShadow)">
          <rect x="420" y="375" width="76" height="26" rx="13" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
          {/* White Checkmark Icon */}
          <circle cx="434" cy="388" r="7" fill="#FFFFFF" />
          <path d="M430.5 388 L433 390.5 L437.5 385.5" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <text x="446" y="392" fill="#FFFFFF" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="11" fontWeight="800" letterSpacing="0.8">
            PAID
          </text>
        </g>
      </g>

      {/* ======================================================== */}
      {/* 3. SMALL FLOATING ELEMENTS */}
      {/* ======================================================== */}

      {/* FLOATING ELEMENT A: CREDIT CARD (Top Left, angled 14deg) */}
      <g transform="translate(65, 120) rotate(-12)" filter="url(#floatShadow)">
        <rect x="0" y="0" width="84" height="52" rx="6" fill="url(#cardBg)" stroke="#C5EADF" strokeWidth="1" />
        {/* Gold EMV Chip */}
        <rect x="10" y="14" width="14" height="11" rx="2" fill="#F59E0B" stroke="#D97706" strokeWidth="0.8" />
        {/* Card Number Dots */}
        <circle cx="12" cy="36" r="2" fill="#FFFFFF" fillOpacity="0.8" />
        <circle cx="18" cy="36" r="2" fill="#FFFFFF" fillOpacity="0.8" />
        <circle cx="24" cy="36" r="2" fill="#FFFFFF" fillOpacity="0.8" />
        <circle cx="30" cy="36" r="2" fill="#FFFFFF" fillOpacity="0.8" />
        <text x="40" y="38" fill="#FFFFFF" fillOpacity="0.8" fontSize="8" fontFamily="monospace">8829</text>
        {/* Dual Brand Overlapping Circles */}
        <circle cx="64" cy="36" r="6" fill="#D2785A" fillOpacity="0.9" />
        <circle cx="71" cy="36" r="6" fill="#E9C46A" fillOpacity="0.9" />
      </g>

      {/* FLOATING ELEMENT B: INVOICE SHEET WITH GREEN "PAID" STAMP (Top Right) */}
      <g transform="translate(565, 60) rotate(8)" filter="url(#floatShadow)">
        <rect x="0" y="0" width="60" height="78" rx="4" fill="#FFFFFF" stroke="#DDE5E0" strokeWidth="1.5" />
        {/* Folded Top Corner */}
        <path d="M48 0 L60 12 L48 12 Z" fill="#E2EBE5" />
        {/* Document Header lines */}
        <rect x="8" y="10" width="24" height="5" rx="1.5" fill="#1B3D35" />
        <line x1="8" y1="24" x2="48" y2="24" stroke="#CBD5E0" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="32" x2="42" y2="32" stroke="#CBD5E0" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="40" x2="52" y2="40" stroke="#CBD5E0" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="48" x2="35" y2="48" stroke="#CBD5E0" strokeWidth="2" strokeLinecap="round" />
        
        {/* Green "PAID" Angled Stamp Badge */}
        <g transform="translate(14, 52) rotate(-14)">
          <rect x="0" y="0" width="38" height="15" rx="3" fill="#ECFDF5" stroke="#10B981" strokeWidth="1.5" strokeDasharray="2 1" />
          <text x="19" y="11" textAnchor="middle" fill="#059669" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="8" fontWeight="800">
            PAID
          </text>
        </g>
      </g>

      {/* FLOATING ELEMENT C: POTTED PLANT (Bottom Left near Desk) */}
      <g transform="translate(42, 400)">
        {/* Terracotta Plant Pot */}
        <path d="M12 28 L28 28 L25 48 L15 48 Z" fill="#D2785A" />
        <rect x="10" y="25" width="20" height="4" rx="1.5" fill="#B85D40" />
        {/* Lush Green Monstera / Foliage Leaves */}
        <path d="M20 25 C14 18, 6 15, 6 8 C14 8, 18 16, 20 25 Z" fill="#2E5C50" />
        <path d="M20 25 C26 16, 34 14, 34 6 C26 6, 22 15, 20 25 Z" fill="#3D7A6B" />
        <path d="M20 25 C20 14, 22 4, 20 0 C18 6, 18 15, 20 25 Z" fill="#1B3D35" />
      </g>

      {/* FLOATING ELEMENT D: AUTOMATION GEAR (Floating near calendar / renewal) */}
      <g transform="translate(250, 75)" filter="url(#floatShadow)">
        {/* Mechanical Cog in Sage/Muted Teal (#7A968D) */}
        <circle cx="16" cy="16" r="14" fill="#E2EBE5" stroke="#7A968D" strokeWidth="2" />
        <circle cx="16" cy="16" r="6" fill="#FFFFFF" stroke="#7A968D" strokeWidth="2" />
        {/* Cog Teeth */}
        <rect x="14" y="0" width="4" height="5" rx="1" fill="#7A968D" />
        <rect x="14" y="27" width="4" height="5" rx="1" fill="#7A968D" />
        <rect x="0" y="14" width="5" height="4" rx="1" fill="#7A968D" />
        <rect x="27" y="14" width="5" height="4" rx="1" fill="#7A968D" />
        <rect x="4" y="4" width="4" height="4" rx="1" transform="rotate(45 6 6)" fill="#7A968D" />
        <rect x="24" y="24" width="4" height="4" rx="1" transform="rotate(45 26 26)" fill="#7A968D" />
      </g>

      {/* FLOATING SPARKLE STARS (Subtle Delight) */}
      <path d="M100 240 L102 245 L107 247 L102 249 L100 254 L98 249 L93 247 L98 245 Z" fill="#D2785A" />
      <path d="M490 100 L491.5 104 L496 105.5 L491.5 107 L490 111 L488.5 107 L484 105.5 L488.5 104 Z" fill="#E9C46A" />
      <path d="M350 70 L351 73 L354 74 L351 75 L350 78 L349 75 L346 74 L349 73 Z" fill="#1B3D35" fillOpacity="0.6" />
    </svg>
  );
}

export default SubscriptionIllustration;
