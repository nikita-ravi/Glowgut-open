// The voice assistant's understanding and answers (spec 023). Pure: keyword rules and
// templates over a product's label data. No AI model and no network here.

export type Condition =
  | "diabetes" | "blood_pressure" | "heart" | "weight" | "gluten" | "dairy" | "nuts"
  | "vegan" | "vegetarian";
export type Topic = "score" | "additives" | "sugar" | "salt" | "fat" | "allergens" | "alternatives";

// ASSIST-1: phrases are matched as whole words, longest first.
const CONDITION_WORDS: Record<Condition, string[]> = {
  diabetes: ["diabetes", "diabetic", "blood sugar", "prediabetic", "prediabetes", "insulin"],
  blood_pressure: ["blood pressure", "hypertension", "high blood pressure", "sodium"],
  heart: ["heart", "cholesterol", "cardiac"],
  weight: ["weight", "calories", "calorie", "diet", "dieting", "lose weight", "losing weight"],
  gluten: ["gluten", "celiac", "coeliac", "gluten free", "gluten intolerant"],
  dairy: ["lactose", "lactose intolerant", "dairy", "milk allergy", "dairy free"],
  nuts: ["nut allergy", "peanut allergy", "nut", "nuts", "peanut", "peanuts", "tree nut"],
  vegan: ["vegan"],
  vegetarian: ["vegetarian"],
};
const TOPIC_WORDS: Record<Topic, string[]> = {
  score: ["score", "rating", "healthy", "how good", "good for me"],
  additives: ["additive", "additives", "e number", "e numbers", "preservative", "preservatives"],
  sugar: ["sugar", "sugars", "sweet"],
  salt: ["salt", "salty"],
  fat: ["fat", "fats", "saturated", "fatty"],
  allergens: ["allergen", "allergens", "allergy", "allergies"],
  alternatives: ["alternative", "alternatives", "instead", "healthier", "better option", "swap"],
};
// ASSIST-2: words that are never part of a product name.
const FILLER = new Set(
  ("hey hi hello ok okay assistant please could would can you tell me more about the a an is it its it's " +
    "i i'm im am have has had my me we our someone somebody person people with who what whats what's " +
    "how much many does do did eat eating drink drinking have having buy should shouldn't fine good bad " +
    "for of in on to this that these those any some product products food item there are be if and or " +
    "but so like just really still also know want check give info information details contain contains " +
    "containing free intolerant intolerance allergic type 1 2 one two kid kids child children son daughter " +
    "safe alright").split(" "),
);

export interface Parsed {
  conditions: Condition[];
  topics: Topic[];
  productQuery: string | null;
}

function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim()} `;
}

function matchKeys<K extends string>(text: string, table: Record<K, string[]>): { keys: K[]; rest: string } {
  let rest = text;
  const keys: K[] = [];
  const position = new Map<K, number>();
  const entries = (Object.entries(table) as [K, string[]][]).flatMap(([key, words]) =>
    words.map((w) => [key, w] as const),
  );
  entries.sort((a, b) => b[1].length - a[1].length); // longest phrase first
  for (const [key, word] of entries) {
    const needle = ` ${word.replace(/['’]/g, "")} `;
    if (rest.includes(needle)) {
      if (!keys.includes(key)) keys.push(key);
      const at = text.indexOf(needle);
      position.set(key, Math.min(position.get(key) ?? at, at));
      rest = rest.split(needle).join(" ");
    }
  }
  keys.sort((a, b) => (position.get(a) ?? 0) - (position.get(b) ?? 0)); // as the person said them
  return { keys, rest };
}

// "contains milk" is an allergen question; "oat milk" alone is a product name.
const CONTAINS: [RegExp, Condition][] = [
  [/ contains? (milk|dairy|lactose) /, "dairy"],
  [/ contains? (gluten|wheat) /, "gluten"],
  [/ contains? (nuts|nut|peanuts|peanut|tree nuts) /, "nuts"],
];

/** ASSIST-1..3: conditions, topics, and the words naming the product. */
export function parseQuestion(question: string): Parsed {
  let text = normalize(question);
  const extra: Condition[] = [];
  for (const [pattern, condition] of CONTAINS) {
    if (pattern.test(text)) {
      extra.push(condition);
      text = text.replace(pattern, " ");
    }
  }
  const { keys: found, rest: afterConditions } = matchKeys(text, CONDITION_WORDS);
  const conditions = [...extra, ...found.filter((c) => !extra.includes(c))];
  const { keys: topics, rest } = matchKeys(afterConditions, TOPIC_WORDS);
  const words = rest.trim().split(/\s+/).filter((w) => w && !FILLER.has(w));
  return { conditions, topics, productQuery: words.length ? words.join(" ") : null };
}

// ---- Answers -------------------------------------------------------------------------------

export interface AssistantProduct {
  gtin: string;
  name: string | null;
  brand: string | null;
  nutrition?: Record<string, { value: number; estimated?: boolean }>;
  allergens?: string[];
  traces?: string[];
  ingredients_analysis?: string[];
  allergens_known?: boolean;
  additives?: { name: string }[];
  score: {
    status: "scored" | "not_scored";
    total: number | null;
    band: { label: string } | null;
    nutriscore: { class: string; grade: string | null };
  };
}

type Level = "low" | "medium" | "high";
type Nutrient = "sugars_g" | "fat_g" | "saturated_fat_g" | "salt_g";
// ASSIST-5: UK Food Standards Agency front-of-pack thresholds, per 100 g (foods) / 100 ml (drinks).
// https://www.gov.uk/government/publications/front-of-pack-nutrition-labelling-guidance
export const THRESHOLDS: Record<"food" | "drink", Record<Nutrient, [number, number]>> = {
  food: { sugars_g: [5, 22.5], fat_g: [3, 17.5], saturated_fat_g: [1.5, 5], salt_g: [0.3, 1.5] },
  drink: { sugars_g: [2.5, 11.25], fat_g: [1.5, 8.75], saturated_fat_g: [0.75, 2.5], salt_g: [0.3, 0.75] },
};
const LABELS: Record<Nutrient, string> = {
  sugars_g: "sugars", fat_g: "fat", saturated_fat_g: "saturated fat", salt_g: "salt",
};
export const DISCLAIMER =
  "This is general label information, not medical advice. Your doctor or dietitian can tell you what fits your plan.";

export function level(value: number, nutrient: Nutrient, kind: "food" | "drink"): Level {
  const [low, high] = THRESHOLDS[kind][nutrient];
  return value <= low ? "low" : value > high ? "high" : "medium";
}

function round(value: number): string {
  return String(Number(value.toFixed(value < 1 ? 2 : 1)));
}

function productName(p: AssistantProduct): string {
  const name = p.name ?? "this product";
  return p.brand && !name.toLowerCase().includes(p.brand.toLowerCase()) ? `${p.brand} ${name}` : name;
}

function nutrientSentence(p: AssistantProduct, nutrient: Nutrient): string {
  const kind = p.score.nutriscore.class === "beverage" ? "drink" : "food";
  const per = kind === "drink" ? "per 100 ml" : "per 100 g";
  const value = p.nutrition?.[nutrient]?.value;
  if (value === undefined) return `The label doesn't list its ${LABELS[nutrient]}.`;
  const [low, high] = THRESHOLDS[kind][nutrient];
  const lvl = level(value, nutrient, kind);
  const range = lvl === "high" ? `high is over ${high} g` : lvl === "low" ? `low is ${low} g or less` : `medium is ${low}–${high} g`;
  return `${LABELS[nutrient][0].toUpperCase()}${LABELS[nutrient].slice(1)}: ${round(value)} g ${per}, which is ${lvl} (${range}).`;
}

const ALLERGEN_TAGS: Partial<Record<Condition, { tag: string; label: string }>> = {
  gluten: { tag: "en:gluten", label: "gluten" },
  dairy: { tag: "en:milk", label: "milk" },
  nuts: { tag: "en:nuts", label: "tree nuts" },
};

function allergenSentences(p: AssistantProduct, condition: Condition): string[] {
  if (!p.allergens_known) return ["The allergen information for this product isn't available, so check the label."];
  const listed = new Set(p.allergens ?? []);
  const traces = new Set(p.traces ?? []);
  if (condition === "nuts") {
    const nuts = ["en:nuts", "en:peanuts"].filter((t) => listed.has(t));
    const mayNuts = ["en:nuts", "en:peanuts"].filter((t) => traces.has(t));
    if (nuts.length) return [`The label lists ${nuts.map((t) => (t === "en:nuts" ? "tree nuts" : "peanuts")).join(" and ")}.`];
    if (mayNuts.length) return ["The label says it may contain nuts."];
    return ["The label doesn't list nuts or peanuts."];
  }
  const a = ALLERGEN_TAGS[condition]!;
  if (listed.has(a.tag)) return [`The label lists ${a.label}.`];
  if (traces.has(a.tag)) return [`The label says it may contain ${a.label}.`];
  return [`The label doesn't list ${a.label}.`];
}

function dietSentence(p: AssistantProduct, diet: "vegan" | "vegetarian"): string {
  const tags = new Set(p.ingredients_analysis ?? []);
  if (tags.has(`en:${diet}`)) return `The ingredient analysis says it's ${diet}.`;
  if (tags.has(`en:non-${diet}`)) return `The ingredient analysis says it isn't ${diet}.`;
  return `It isn't clear from the ingredients whether it's ${diet}.`;
}

const CONDITION_INTRO: Record<Condition, string> = {
  diabetes: "For blood sugar",
  blood_pressure: "For blood pressure",
  heart: "For heart health",
  weight: "For weight",
  gluten: "For gluten",
  dairy: "For dairy",
  nuts: "For nut allergies",
  vegan: "For a vegan diet",
  vegetarian: "For a vegetarian diet",
};

function conditionSentences(p: AssistantProduct, c: Condition): string[] {
  switch (c) {
    case "diabetes": {
      const out = [nutrientSentence(p, "sugars_g")];
      const fibre = p.nutrition?.fiber_g?.value;
      if (fibre !== undefined) out.push(`It has ${round(fibre)} g of fibre per 100 g.`);
      return out;
    }
    case "blood_pressure":
      return [nutrientSentence(p, "salt_g")];
    case "heart":
      return [nutrientSentence(p, "saturated_fat_g"), nutrientSentence(p, "fat_g")];
    case "weight": {
      const kj = p.nutrition?.energy_kj?.value;
      const energy = kj === undefined ? "The label doesn't list its energy." : `It has ${Math.round(kj / 4.184)} kcal per 100 g.`;
      return [energy, nutrientSentence(p, "sugars_g"), nutrientSentence(p, "fat_g")];
    }
    case "vegan":
    case "vegetarian":
      return [dietSentence(p, c)];
    default:
      return allergenSentences(p, c);
  }
}

function scoreSentence(p: AssistantProduct): string {
  const s = p.score;
  if (s.status === "not_scored" || s.total === null) return "It isn't scored: the label data is incomplete.";
  const grade = s.nutriscore.grade ? `, Nutri-Score ${s.nutriscore.grade.toUpperCase()}` : "";
  return `Its overall score is ${s.total} out of 100 (${s.band?.label ?? "unrated"}${grade}).`;
}

function topicSentences(p: AssistantProduct, t: Topic): string[] {
  switch (t) {
    case "sugar":
      return [nutrientSentence(p, "sugars_g")];
    case "salt":
      return [nutrientSentence(p, "salt_g")];
    case "fat":
      return [nutrientSentence(p, "fat_g"), nutrientSentence(p, "saturated_fat_g")];
    case "additives": {
      const adds = p.additives ?? [];
      return [adds.length ? `It has ${adds.length} ${adds.length === 1 ? "additive" : "additives"}: ${adds.map((a) => a.name).join(", ")}.` : "No additives are listed."];
    }
    case "allergens": {
      if (!p.allergens_known) return ["The allergen information for this product isn't available, so check the label."];
      const names = (p.allergens ?? []).map((t) => t.replace(/^en:/, "").replace(/-/g, " "));
      return [names.length ? `The label lists these allergens: ${names.join(", ")}.` : "The label lists no allergens."];
    }
    case "alternatives":
      return ["Open the product page to see better-scored alternatives in the same category."];
    default:
      return [];
  }
}

/** ASSIST-4..7: the answer for one product. */
export function answerFor(p: AssistantProduct, parsed: Parsed): string {
  const parts = [`${productName(p)}.`];
  for (const c of parsed.conditions) parts.push(`${CONDITION_INTRO[c]}: ${conditionSentences(p, c).join(" ")}`);
  for (const t of parsed.topics.filter((t) => t !== "score")) parts.push(...topicSentences(p, t));
  parts.push(scoreSentence(p));
  if (parsed.conditions.length) parts.push(DISCLAIMER);
  return parts.join(" ");
}

export const NEED_PRODUCT = "Which product? Say its brand and name, like \"Pringles Original\".";
export const NOT_AVAILABLE = "I can't look that up right now. Please try again in a moment.";
export const notFound = (words: string) =>
  `I couldn't find "${words}". Try the brand and product name, or scan its barcode.`;
