import { Suspense } from "react";

import { ProductFooter, ProductMessage, ProductView } from "@/components/ProductView";
import { loadProduct } from "@/lib/api";

export const metadata = { title: "Product" };

// Params are request-time data under Cache Components, so they are read inside Suspense.
export default function ProductPage({ params }: PageProps<"/p/[gtin]">) {
  return (
    <>
      <Suspense fallback={<p role="status">Looking up this product…</p>}>
        {params.then(({ gtin }) => (
          <ProductContent gtin={gtin} />
        ))}
      </Suspense>
      <ProductFooter />
    </>
  );
}

async function ProductContent({ gtin }: { gtin: string }) {
  const result = await loadProduct(gtin);
  switch (result.kind) {
    case "ok":
      return <ProductView product={result.product} breakdown={result.breakdown} />;
    case "not_found":
      return (
        <ProductMessage
          title="We couldn't find this product"
          body={`Barcode ${result.gtin} isn't in Open Food Facts yet. Adding products from a label photo is coming soon.`}
        />
      );
    case "invalid":
      return <ProductMessage title="That barcode isn't valid" body={result.detail} />;
    case "unavailable":
      return (
        <ProductMessage
          title="Try again in a moment"
          body="We couldn't reach the product database. Check your connection and try again."
        />
      );
  }
}
