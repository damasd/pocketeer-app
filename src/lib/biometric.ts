"use client";

// Face ID / fingerprint for the app lock, through the browser's WebAuthn API with the device's
// own authenticator. Used only as a local "is it really you" check: the credential stays on this
// device and nothing is sent to a server.

const toB64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));

/** True when this device has Face ID, Touch ID, Windows Hello or a fingerprint reader the browser can use. */
export async function biometricAvailable(): Promise<boolean> {
  try {
    return (
      typeof window !== "undefined" &&
      "PublicKeyCredential" in window &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  } catch {
    return false;
  }
}

/** "Face ID" on iPhone and iPad, a neutral name elsewhere. */
export function biometricName(): string {
  if (typeof navigator === "undefined") return "Face ID";
  const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));
  return apple ? "Face ID" : "Fingerprint or face";
}

/** Create the on-device credential (shows the Face ID prompt). Returns its id to remember. */
export async function registerBiometric(): Promise<string> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: random(32),
      rp: { name: "Pocketeer", id: location.hostname },
      user: { id: random(16), name: "Pocketeer app lock", displayName: "Pocketeer app lock" },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
      timeout: 60_000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Face ID wasn't set up.");
  return toB64url(cred.rawId);
}

/** Ask for Face ID with the saved credential. Resolves true when the person was verified. */
export async function verifyBiometric(credentialId: string): Promise<boolean> {
  try {
    const result = (await navigator.credentials.get({
      publicKey: {
        challenge: random(32),
        rpId: location.hostname,
        allowCredentials: [{ type: "public-key", id: fromB64url(credentialId) }],
        userVerification: "required",
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;
    const flags = result ? new Uint8Array((result.response as AuthenticatorAssertionResponse).authenticatorData)[32] : 0;
    return Boolean(result) && (flags & 0x04) !== 0; // UV flag: the device checked it was you
  } catch {
    return false; // cancelled, timed out or not recognised: fall back to the PIN
  }
}
