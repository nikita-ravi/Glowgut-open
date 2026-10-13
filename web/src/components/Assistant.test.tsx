import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AssistantProduct } from "@/lib/assistant";
import type { SearchOutcome } from "@/lib/search";

import { Assistant } from "./Assistant";

const PRINGLES: AssistantProduct = {
  gtin: "0038000138416", name: "Original", brand: "Pringles",
  nutrition: { sugars_g: { value: 1.5 }, salt_g: { value: 1.3 } },
  allergens: ["en:milk"], allergens_known: true, additives: [],
  score: { status: "scored", total: 49, band: { label: "Mediocre" }, nutriscore: { class: "general", grade: "d" } },
};
const found = vi.fn(async (): Promise<SearchOutcome> => ({ kind: "ok", gtin: null,
  results: [{ gtin: PRINGLES.gtin, name: "Original", brand: "Pringles", image_url: null, total: 49, band: null }] }));
const product = vi.fn(async () => PRINGLES);
const speech = { speak: vi.fn(), cancel: vi.fn() };
class Utterance { lang = ""; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(public text: string) {} }
class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = ""; interimResults = true; start = vi.fn(); stop = vi.fn();
  onresult: ((e: unknown) => void) | null = null; onerror: (() => void) | null = null; onend: (() => void) | null = null;
  constructor() { FakeRecognition.instances.push(this); }
}

beforeEach(() => {
  found.mockClear(); product.mockClear(); speech.speak.mockReset(); localStorage.clear();
  vi.stubGlobal("speechSynthesis", speech);
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
});
afterEach(() => vi.unstubAllGlobals());

async function ask(q: string) {
  fireEvent.change(screen.getByLabelText("Your question"), { target: { value: q } });
  fireEvent.click(screen.getByRole("button", { name: "Ask" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Ask" })).toBeEnabled());
}
const conversation = () => screen.getByRole("list", { name: "Conversation" });

describe("[ASSIST-4] finds the product and answers", () => {
  it("searches the product words, fetches the product, answers and links to it", async () => {
    render(<Assistant search={found} fetchProduct={product} />);
    await ask("Hey, I'm a diabetes person. Can I eat Pringles?");
    expect(found).toHaveBeenCalledWith("pringles");
    expect(product).toHaveBeenCalledWith(PRINGLES.gtin);
    const items = within(conversation()).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("You: Hey, I'm a diabetes person. Can I eat Pringles?");
    expect(items[1]).toHaveTextContent("For blood sugar: Sugars: 1.5 g per 100 g, which is low");
    expect(within(items[1]).getByRole("link", { name: "See the product" })).toHaveAttribute("href", `/p/${PRINGLES.gtin}`);
  });

  it("uses a typed barcode directly", async () => {
    const byBarcode = vi.fn(async (): Promise<SearchOutcome> => ({ kind: "ok", gtin: PRINGLES.gtin, results: [] }));
    render(<Assistant search={byBarcode} fetchProduct={product} />);
    await ask("tell me about 038000138416");
    expect(product).toHaveBeenCalledWith(PRINGLES.gtin);
  });
});

describe("[ASSIST-2] follow-ups and missing products", () => {
  it("reuses the last product, and asks which product when there is none", async () => {
    render(<Assistant search={found} fetchProduct={product} />);
    await ask("what about its salt?");
    expect(conversation()).toHaveTextContent("Which product?");
    await ask("Pringles");
    await ask("and for blood pressure?");
    expect(found).toHaveBeenCalledTimes(1);
    expect(within(conversation()).getAllByRole("listitem").at(-1)).toHaveTextContent("Salt: 1.3 g per 100 g");
  });
});

describe("[ASSIST-8] not found and errors", () => {
  it("says it couldn't find the product, or can't look it up", async () => {
    const none = vi.fn(async (): Promise<SearchOutcome> => ({ kind: "ok", gtin: null, results: [] }));
    const { unmount } = render(<Assistant search={none} fetchProduct={product} />);
    await ask("diabetic, zzqx crackers");
    expect(conversation()).toHaveTextContent('I couldn\'t find "zzqx crackers"');
    unmount();
    const down = vi.fn(async (): Promise<SearchOutcome> => ({ kind: "error" }));
    render(<Assistant search={down} fetchProduct={product} />);
    await ask("Pringles");
    expect(conversation()).toHaveTextContent("I can't look that up right now.");
  });
});

describe("[ASSIST-9] the page: microphone, transcript and typing", () => {
  it("has a pulsing mic while listening and an always-working text box", () => {
    vi.stubGlobal("webkitSpeechRecognition", FakeRecognition);
    localStorage.setItem("ofs.voice-consent", "yes");
    const { container } = render(<Assistant search={found} fetchProduct={product} />);
    const mic = screen.getByRole("button", { name: "Ask by voice" });
    expect(mic).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(mic);
    expect(screen.getByRole("button", { name: "Stop listening" })).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector(".animate-ping")).not.toBeNull();
    expect(screen.getByLabelText("Your question")).toBeEnabled();
  });
});

describe("[ASSIST-10] speech in and out", () => {
  it("asks for consent first, then answers what it heard and speaks it", async () => {
    vi.stubGlobal("webkitSpeechRecognition", FakeRecognition);
    render(<Assistant search={found} fetchProduct={product} />);
    fireEvent.click(screen.getByRole("button", { name: "Ask by voice" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("sent to Google");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    const rec = FakeRecognition.instances.at(-1)!;
    expect(rec.start).toHaveBeenCalled();
    await act(async () => rec.onresult?.({ results: [[{ transcript: "is Pringles vegan" }]] }));
    await waitFor(() => expect(speech.speak).toHaveBeenCalled());
    expect((speech.speak.mock.calls.at(-1)![0] as Utterance).text).toContain("Pringles Original.");
  });

  it("works by typing without speech support", async () => {
    vi.stubGlobal("speechSynthesis", undefined);
    delete (window as unknown as Record<string, unknown>).speechSynthesis;
    render(<Assistant search={found} fetchProduct={product} />);
    expect(screen.queryByRole("button", { name: "Ask by voice" })).toBeNull();
    expect(screen.getByText(/Type your question below/)).toBeInTheDocument();
    await ask("Pringles");
    expect(conversation()).toHaveTextContent("Pringles Original.");
  });
});
