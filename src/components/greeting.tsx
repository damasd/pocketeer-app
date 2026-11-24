"use client";

import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { useProfile } from "@/lib/profile";

/** Home header: photo (opens Settings), "Welcome back," and the name. */
export function Greeting() {
  const { profile } = useProfile();
  const name = profile?.displayName ?? "";

  return (
    <header className="mb-2 flex items-center gap-2.5">
      <Link href="/settings" aria-label="Profile and settings" className="rounded-full">
        {profile ? (
          <Avatar name={name} photoUrl={profile.photoUrl} size={36} />
        ) : (
          <span aria-hidden className="block size-9 rounded-full bg-nav-selected" />
        )}
      </Link>
      <div className="flex flex-col">
        <span className="text-[13px] font-medium text-[#BDBDBD]">Welcome back,</span>
        {profile ? (
          <h1 className="text-[13px] leading-[1.35] font-bold">{name}</h1>
        ) : (
          <h1 className="text-[13px] leading-[1.35] font-bold">
            <span className="sr-only">Home</span>
            <span aria-hidden className="mt-0.5 block h-3.5 w-24 rounded bg-nav-selected" />
          </h1>
        )}
      </div>
    </header>
  );
}
