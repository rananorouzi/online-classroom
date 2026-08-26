"use client";

import { useEffect, useState } from "react";

export default function SplashRemover() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, 400);

    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      id="app-splash"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background transition-opacity duration-400"
    >
       <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 100 100" style={{ borderRadius: "22px" }}>
            <rect width="100" height="100" rx="20" fill="#0A0A0A"/>
            <circle cx="50" cy="50" r="38" fill="none" stroke="#D4AF37" strokeWidth="2.5" opacity="0.35"/>
            <ellipse cx="44" cy="63" rx="9" ry="6.5" transform="rotate(-20,44,63)" fill="#D4AF37"/>
            <rect x="52.2" y="28" width="3.2" height="36" rx="1.6" fill="#D4AF37"/>
            <path d="M55.4 28 Q72 35 65 52" stroke="#D4AF37" strokeWidth="3.2" fill="none" strokeLinecap="round"/>
            <circle cx="72" cy="68" r="2.2" fill="#B8960E" opacity="0.6"/>
        </svg>
        <p style={{ color: "#D4AF37", fontFamily: "sans-serif", fontSize: "14px", letterSpacing: "0.08em", margin: 0 }}>
          Music Academy Pro
        </p>
    </div>
  );
}
