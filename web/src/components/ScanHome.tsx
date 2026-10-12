"use client";

import { useRouter } from "next/navigation";

import { ManualEntry } from "./ManualEntry";
import { Scanner } from "./Scanner";
import { SearchBox } from "./SearchBox";

export function ScanHome() {
  const router = useRouter();
  const go = (gtin: string) => router.push(`/p/${gtin}`);
  return (
    <div className="flex flex-col gap-6">
      <Scanner onDetected={go} />
      <ManualEntry onSubmit={go} />
      <SearchBox onSelect={go} />
    </div>
  );
}
