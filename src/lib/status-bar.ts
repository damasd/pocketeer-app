/**
 * The iPhone home-screen app colours the band behind the status bar with the page's theme colour
 * (statusBarStyle "default" in src/app/layout.tsx). Each page sets its own (Home black, others
 * light grey); these helpers override it for a moment (lock screen, the card pull on Home) and put
 * the page's own colour back afterwards. The page's colour is kept on the tag in data-base.
 */
const SELECTOR = 'meta[name="theme-color"]';

/** A colour token's current value (light or dark theme), read when needed. */
function token(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Dark = Home's header and the lock screen; light = every other page. Both follow the theme. */
export const STATUS_BAR = {
  get dark() {
    return token("--color-night", "#060316");
  },
  get light() {
    return token("--color-screen", "#F3F3F2");
  },
};

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

/** Band colour for a route: Home's header is dark, every other page the screen colour. */
export const pageStatusBarColour = (pathname: string) => (pathname === "/" ? STATUS_BAR.dark : STATUS_BAR.light);

/**
 * Set the page's own colour. Next sets it from each page's viewport too, but a page kept alive
 * in the background (going back to Home) doesn't always put it back, which left Home's band light.
 * While an override is showing (lock screen, card pull) only the colour to return to changes.
 */
export function setPageStatusBarColour(colour: string) {
  const metas = document.querySelectorAll<HTMLMetaElement>(SELECTOR);
  if (!metas.length) {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = colour;
    document.head.appendChild(meta);
    return;
  }
  metas.forEach((meta) => {
    if (meta.dataset.base !== undefined) meta.dataset.base = colour;
    else meta.content = colour;
  });
}

/**
 * Keep the current colour and drop the saved one: used when leaving the page, since the next
 * page sets its own colour and putting the old page's colour back would be wrong.
 */
export function keepStatusBarColour() {
  const meta = document.querySelector<HTMLMetaElement>(SELECTOR);
  if (meta) delete meta.dataset.base;
}
