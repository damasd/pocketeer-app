/**
 * The iPhone home-screen app colours the band behind the status bar with the page's theme colour
 * (statusBarStyle "default" in src/app/layout.tsx). Each page sets its own (Home black, others
 * light grey); these helpers override it for a moment (lock screen, the card pull on Home) and put
 * the page's own colour back afterwards. The page's colour is kept on the tag in data-base.
 */
const SELECTOR = 'meta[name="theme-color"]';

export const STATUS_BAR = { dark: "#111111", light: "#F2F2F2" } as const;

/** Show `colour` behind the status bar; null puts the page's own colour back. */
export function setStatusBarColour(colour: string | null) {
  let meta = document.querySelector<HTMLMetaElement>(SELECTOR);
  if (!meta) {
    if (!colour) return;
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  if (colour) {
    if (meta.dataset.base === undefined) meta.dataset.base = meta.content;
    meta.content = colour;
  } else if (meta.dataset.base !== undefined) {
    meta.content = meta.dataset.base;
    delete meta.dataset.base;
  }
}

/**
 * Keep the current colour and drop the saved one: used when leaving the page, since the next
 * page sets its own colour and putting the old page's colour back would be wrong.
 */
export function keepStatusBarColour() {
  const meta = document.querySelector<HTMLMetaElement>(SELECTOR);
  if (meta) delete meta.dataset.base;
}
