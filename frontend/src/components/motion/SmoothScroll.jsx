import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

/**
 * SmoothScroll component powered by Lenis:
 * - Active on public marketing routes (e.g. /, /login, /signup).
 * - Strictly disabled on dashboard routes (/app/*, /dashboard, etc.).
 * - Disabled when prefers-reduced-motion is enabled.
 */
export function SmoothScroll() {
  const location = useLocation();

  useEffect(() => {
    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Disabled on dashboard / protected app paths
    const isDashboardRoute =
      location.pathname.startsWith("/app") ||
      location.pathname.startsWith("/dashboard") ||
      location.pathname.startsWith("/intelligence") ||
      location.pathname.startsWith("/customers") ||
      location.pathname.startsWith("/invoices") ||
      location.pathname.startsWith("/subscriptions") ||
      location.pathname.startsWith("/payments") ||
      location.pathname.startsWith("/plans") ||
      location.pathname.startsWith("/products");

    if (prefersReducedMotion || isDashboardRoute) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [location.pathname]);

  return null;
}

export default SmoothScroll;
