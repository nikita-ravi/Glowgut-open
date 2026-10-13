import Link from "next/link";

import { ScanHome } from "@/components/ScanHome";

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold">Open Food Scanner</h1>
        <p className="mt-1 text-zinc-700">
          Scan a grocery barcode to see a 0–100 score. Every point links to its source.
        </p>
      </header>
      <ScanHome />
      <Link
        href="/assistant"
        className="flex items-center gap-3 rounded-xl p-4 ring-1 ring-zinc-200 hover:ring-zinc-400"
      >
        <span aria-hidden="true" className="text-2xl">
          🎤
        </span>
        <span>
          <span className="block font-medium">Ask the assistant</span>
          <span className="block text-sm text-zinc-600">
            &ldquo;I&apos;m diabetic. Can I eat Pringles?&rdquo;
          </span>
        </span>
      </Link>
    </div>
  );
}
