"use client";

import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { useProfile } from "@/lib/profile";

/** Home header: photo (opens Settings), "Welcome back," and the name. */
export function Greeting() {
  const { profile } = useProfile();
  const name = profile?.displayName ?? "";

  return (
    <header className="flex items-center gap-3">
      <Link href="/settings" aria-label="Profile and settings" className="rounded-full">
        {profile ? (
          <Avatar name={name} photoUrl={profile.photoUrl} />
        ) : (
          <span aria-hidden className="block size-12 rounded-full bg-nav-selected" />
        )}
      </Link>
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-medium text-[#BDBDBD]">Welcome back,</span>
        {profile ? (
          <h1 className="text-2xl leading-[1.1] font-bold tracking-[-0.02em]">{name}</h1>
        ) : (
          <h1 className="text-2xl leading-[1.1] font-bold">
            <span className="sr-only">Home</span>
            <span aria-hidden className="block h-[26px] w-28 rounded-lg bg-nav-selected" />
          </h1>
        )}
      </div>
    </header>
  );
}
