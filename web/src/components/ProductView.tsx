import Link from "next/link";

import type { Alternatives, Breakdown, Product, Recalls } from "@/lib/api";
import {
  bandStyle,
  classLabel,
  componentBars,
  dataBadge,
  groupBreakdown,
  isRescaled,
  missingWords,
} from "@/lib/present";

import { AlternativesStrip } from "./AlternativesStrip";
import { RecallBanner } from "./RecallBanner";

const BADGE_STYLES = {
  complete: "bg-emerald-50 text-emerald-900",
  partial: "bg-amber-50 text-amber-900",
  limited: "bg-rose-50 text-rose-900",
};

export function ProductFooter() {
  return (
    <footer className="mt-10 border-t border-zinc-200 pt-4 text-sm text-zinc-600">
      <p>
        Data from{" "}
        <a className="underline" href="https://world.openfoodfacts.org">
          Open Food Facts (ODbL)
        </a>
        .
      </p>
      <p>Educational information, not medical advice.</p>
    </footer>
  );
}

function ScoreHeader({ product }: { product: Product }) {
  const { score } = product;
  if (score.status === "not_scored") {
    const missing = missingWords(score.missing_inputs).join(", ");
    return (
      <div className="rounded-xl bg-zinc-100 p-4 ring-2 ring-zinc-400">
        <p className="text-2xl font-bold">Not scored</p>
        <p className="mt-1 text-sm">The label data is missing {missing}.</p>
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-4 rounded-xl p-4 ring-2 ${bandStyle(score.band?.id)}`}>
      <p className="text-5xl font-bold tabular-nums">
        {score.total}
        <span className="text-xl font-medium"> / 100</span>
      </p>
      <p className="text-2xl font-semibold">{score.band?.label}</p>
    </div>
  );
}

function ComponentBars({ product }: { product: Product }) {
  const bars = componentBars(product.score);
  return (
    <section aria-labelledby="components-heading" className="flex flex-col gap-3">
      <h2 id="components-heading" className="text-lg font-semibold">
        What makes up the score
      </h2>
      <ul className="flex flex-col gap-3">
        {bars.map((bar) => (
          <li key={bar.component}>
            <div className="flex justify-between text-sm">
              <span className="font-medium">{bar.label}</span>
              <span>{bar.known ? `${bar.points} of ${bar.weight}` : "No data"}</span>
            </div>
            <div
              className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-200"
              role="presentation"
            >
              <div
                className="h-full rounded-full bg-zinc-800"
                style={{ width: `${Math.round(bar.fraction * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {isRescaled(product.score) && (
        <p className="text-sm text-zinc-600">
          Some data is missing, so the total is worked out from the parts we have.
        </p>
      )}
    </section>
  );
}

export function ProductView({
  product,
  breakdown,
  alternatives,
  recalls,
}: {
  product: Product;
  breakdown: Breakdown;
  alternatives?: Alternatives | null;
  recalls?: Recalls | null;
}) {
  const { score } = product;
  const badge = dataBadge(score.confidence);
  const groups = groupBreakdown(breakdown.score);
  const missing = missingWords(score.missing_inputs);

  return (
    <article className="flex flex-col gap-6">
      {product.stale && (
        <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Showing saved data. We couldn&apos;t refresh it from Open Food Facts just now.
        </p>
      )}

      <header className="flex gap-4">
        {product.image_url && (
          // Product photos come from Open Food Facts; next/image would need a remote allowlist.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt=""
            className="h-24 w-24 shrink-0 rounded-lg bg-zinc-100 object-contain"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">{product.name ?? "Unnamed product"}</h1>
          {product.brand && <p className="text-zinc-700">{product.brand}</p>}
          <p className="text-sm text-zinc-600">Barcode {product.gtin}</p>
        </div>
      </header>

      <RecallBanner data={recalls} />

      <ScoreHeader product={product} />

      <div className="flex flex-wrap gap-2 text-sm">
        <span className={`rounded-full px-3 py-1 font-medium ${BADGE_STYLES[badge.level]}`}>
          {badge.label}
        </span>
        {score.nutriscore.grade && (
          <span className="rounded-full bg-zinc-100 px-3 py-1">
            Nutri-Score {score.nutriscore.grade.toUpperCase()}, scored as{" "}
            {classLabel(score.nutriscore.class)}
          </span>
        )}
        {product.is_organic && (
          <span className="rounded-full bg-zinc-100 px-3 py-1">Organic</span>
        )}
      </div>
      {missing.length > 0 && <p className="text-sm text-zinc-600">Missing: {missing.join(", ")}.</p>}

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="text-lg font-semibold">
          In short
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {breakdown.explanation.map((sentence) => (
            <li key={sentence}>{sentence}</li>
          ))}
        </ul>
      </section>

      <AlternativesStrip data={alternatives} />

      <ComponentBars product={product} />

      <section aria-labelledby="breakdown-heading" className="flex flex-col gap-4">
        <h2 id="breakdown-heading" className="text-lg font-semibold">
          Every rule applied
        </h2>
        {groups.map((group) => (
          <div key={group.component}>
            <h3 className="font-medium">{group.label}</h3>
            {group.lines.length === 0 ? (
              <p className="text-sm text-zinc-600">{group.emptyText}</p>
            ) : (
              <ul className="mt-1 divide-y divide-zinc-200">
                {group.lines.map((line) => (
                  <li key={line.key} className="flex items-start justify-between gap-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">
                        {line.label}
                        {line.estimated && (
                          <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs">
                            Estimated
                          </span>
                        )}
                      </p>
                      <p className="text-zinc-700">{line.value}</p>
                      {line.note && <p className="text-zinc-600">{line.note}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-medium tabular-nums">
                        {line.points}
                        <span className="sr-only"> {line.pointsHint}</span>
                      </p>
                      <a
                        className="text-xs underline"
                        href={line.sourceUrl}
                        aria-label={`Source for ${line.label}`}
                      >
                        Source
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      {product.ingredients_text && (
        <section aria-labelledby="ingredients-heading">
          <h2 id="ingredients-heading" className="text-lg font-semibold">
            Ingredients
          </h2>
          <p className="mt-1 text-sm">{product.ingredients_text}</p>
        </section>
      )}

      <Link href="/" className="self-start underline">
        Scan another product
      </Link>
    </article>
  );
}

export function ProductMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p>{body}</p>
      <Link href="/" className="self-start underline">
        Scan or type another barcode
      </Link>
    </div>
  );
}
