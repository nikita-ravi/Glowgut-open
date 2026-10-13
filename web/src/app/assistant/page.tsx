import { Assistant } from "@/components/Assistant";

export const metadata = { title: "Assistant" };

export default function AssistantPage() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Ask the assistant</h1>
        <p className="text-zinc-700">
          Tap the microphone and ask about any product, for example &ldquo;I&apos;m diabetic. Can I eat
          Pringles?&rdquo;
        </p>
      </header>
      <Assistant />
    </div>
  );
}
