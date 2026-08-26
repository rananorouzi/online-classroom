"use client";

import { useEffect } from "react";

export default function SplashRemover() {
  useEffect(() => {
    const el = document.getElementById("app-splash");
    if (!el) return;

    el.style.opacity = "0";

    const timer = window.setTimeout(() => {
      // The node may already have been detached.
      if (!el.isConnected) return;

      // Only remove it if its parent still owns it.
      const parent = el.parentNode;
      if (!parent || el.parentNode !== parent) return;

      // Remove it through the DOM API, but only while attached.
      requestAnimationFrame(() => {
        if (el.isConnected && el.parentNode === parent) {
          parent.removeChild(el);
        }
      });
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
