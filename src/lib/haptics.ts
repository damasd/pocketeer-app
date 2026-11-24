"use client";

/**
 * A light tap of the phone's haptic engine, for key presses (PIN pad, amount keypad).
 *
 * Safari on iPhone has no vibration API for web pages. Since iOS 18 a switch-style checkbox
 * (<input type="checkbox" switch>) gives a haptic tick when it is toggled, also from code
 * during a tap, so a hidden one is toggled here. Android uses navigator.vibrate. Elsewhere
 * (laptop, older iOS) nothing happens. Call it from inside a tap handler.
 */
export function haptic() {
  if (typeof window === "undefined") return;
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(8);
    return;
  }
  // Inside the lock screen when it is showing: everything else is hidden then.
  const host = document.getElementById("app-lock-root") ?? document.body;
  const label = document.createElement("label");
  label.setAttribute("aria-hidden", "true");
  label.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.tabIndex = -1;
  label.appendChild(input);
  host.appendChild(label);
  label.click();
  label.remove();
}
