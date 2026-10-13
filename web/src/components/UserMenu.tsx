"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signInWithGoogle, signOut, useSession } from "@/lib/auth-client";

// ACC-4: "Sign in" when signed out; avatar, account link and sign out when signed in.
export function UserMenu() {
  const { data, isPending } = useSession();
  const path = usePathname();
  if (isPending) return null;
  if (!data) {
    return (
      <button
        type="button"
        onClick={() => signInWithGoogle(path)}
        className="rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-zinc-300 hover:bg-zinc-100"
      >
        Sign in
      </button>
    );
  }
  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/account" className="flex items-center gap-2 font-medium">
        {data.user.image && (
          // eslint-disable-next-line @next/next/no-img-element -- Google avatar, any host
          <img src={data.user.image} alt="" className="h-7 w-7 rounded-full" />
        )}
        Account
      </Link>
      <button type="button" onClick={() => signOut()} className="underline">
        Sign out
      </button>
    </div>
  );
}
