// Centralized API base that falls back at runtime to the current origin
// if the Vite build-time env var is not set or points to localhost.
export const API_BASE = (() => {
  const vite = import.meta.env.VITE_API_URL as string | undefined;
  // Use VITE_API_URL when it is set and not a local dev URL
  if (vite && !vite.includes('localhost')) return vite;
  // At runtime (browser) prefer the current origin so the client talks
  // to the same host that served the SPA (works well on Render).
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  // Fallback to the typical local dev server
  return vite || 'http://localhost:5000';
})();

export default API_BASE;
