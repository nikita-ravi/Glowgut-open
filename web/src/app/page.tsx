export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold">Open Food Scanner</h1>
        <p className="mt-1 text-zinc-700">
          Scan a grocery barcode to see a 0–100 score. Every point links to its source.
        </p>
      </header>
    </div>
  );
}
