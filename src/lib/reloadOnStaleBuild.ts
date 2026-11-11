import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * After a deploy, a tab still running the previous build asks for code files
 * by their old hashed names (e.g. PayRunList-DbNUeLn3.js). Those no longer
 * exist - the server answers with index.html instead - so the import fails
 * with "Failed to fetch dynamically imported module" and the page crashes.
 * Reloading once picks up the new build.
 *
 * Guarded so a genuinely missing file (or an offline user) can't cause a
 * reload loop: at most one automatic reload per RELOAD_WINDOW_MS.
 */

const STORAGE_KEY = 'payrole:stale-build-reload-at';
const RELOAD_WINDOW_MS = 10_000;

/** Reloads the page unless it already did so very recently. Returns true if it reloaded. */
export function reloadForNewBuild(): boolean {
  let lastReload = 0;
  try {
    lastReload = Number(sessionStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    // Storage unavailable (private mode, blocked) - still reload once below.
  }
  if (Date.now() - lastReload < RELOAD_WINDOW_MS) return false;

  try {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // Without storage there's no loop guard across reloads, but one reload
    // is still far better than a crashed page.
  }
  window.location.reload();
  return true;
}

/** Vite fires this when a dynamic import (or its preloaded deps) fails to load. */
export function installStaleBuildReload(): void {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForNewBuild()) event.preventDefault();
  });
}

/**
 * Drop-in for React.lazy for route pages: if the page's code fails to load,
 * reload for the new build instead of crashing. If a reload already happened
 * moments ago, the error is rethrown so the router's error page shows.
 */
export function lazyWithReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch((error: unknown) => {
      if (reloadForNewBuild()) {
        // Keep Suspense showing its fallback while the page reloads.
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }),
  );
}
