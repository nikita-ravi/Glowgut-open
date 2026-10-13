"use client";

import { signInWithGoogle } from "@/lib/auth-client";

export function SignInPrompt() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold">Your account</h1>
      <p className="text-zinc-700">
        Sign in to keep a scan history, save products, and get warnings for your allergens and diet.
        Everything else works without an account.
      </p>
      <button
        type="button"
        onClick={() => signInWithGoogle("/account")}
        className="self-start rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white"
      >
        Sign in with Google
      </button>
    </div>
  );
}
