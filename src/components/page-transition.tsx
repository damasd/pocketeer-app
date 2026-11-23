import { ViewTransition, type ReactNode } from "react";

/**
 * Animates a page in and out on navigation (React <ViewTransition> + the browser's View Transitions API).
 * Tab links tag the navigation "nav-forward" or "nav-back" (by tab order) and the page slides that way;
 * any other navigation crossfades. Wrap each page's content; the layout (nav bar) stays still.
 * Browsers without support simply switch pages.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-fade" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-fade" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
