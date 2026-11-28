// Shared by the server layout (inline <head> script) and src/lib/theme.ts. No "use client" here:
// the layout needs the script as a plain string.

export const THEME_KEY = "pocketeer.theme.v1";

/**
 * Inline script for <head>, before the stylesheet paints: applies a saved dark theme so the app
 * never flashes light first, and darkens the band behind the iPhone status bar to match.
 */
export const THEME_SCRIPT =
  `try{if(localStorage.getItem("${THEME_KEY}")==="dark"){document.documentElement.setAttribute("data-theme","dark");` +
  `var t=function(){document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){if(m.dataset.base!==undefined)m.dataset.base="#111111";else m.content="#111111"})};` +
  `document.addEventListener("DOMContentLoaded",t)}}catch(e){}`;
