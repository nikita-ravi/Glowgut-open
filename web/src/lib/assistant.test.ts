import { describe, expect, it } from "vitest";

import { type AssistantProduct, DISCLAIMER, answerFor, level, parseQuestion } from "./assistant";

const PRINGLES: AssistantProduct = {
  gtin: "0038000138416",
  name: "Original",
  brand: "Pringles",
  nutrition: {
    energy_kj: { value: 2135 }, sugars_g: { value: 1.5 }, fat_g: { value: 31 },
    saturated_fat_g: { value: 2.8 }, salt_g: { value: 1.3 }, fiber_g: { value: 3.2 },
  },
  allergens: ["en:gluten", "en:milk"],
  traces: ["en:soybeans"],
  ingredients_analysis: ["en:non-vegan", "en:vegetarian"],
  allergens_known: true,
  additives: [{ name: "E621 - Monosodium glutamate" }],
  score: { status: "scored", total: 49, band: { label: "Mediocre" }, nutriscore: { class: "general", grade: "d" } },
};
const BANNED = /\b(safe|unsafe|toxic|dangerous|can eat|can't eat|cannot eat)\b/i;

describe("[ASSIST-1] conditions in everyday words", () => {
  it.each([
    ["Hey assistant, I'm a diabetes person. Can I eat Pringles?", ["diabetes"]],
    ["I have high blood pressure and cholesterol, is Doritos ok?", ["blood_pressure", "heart"]],
    ["I'm celiac and lactose intolerant, what about Oreos", ["gluten", "dairy"]],
    ["my kid has a peanut allergy, can he have Nutella", ["nuts"]],
    ["I'm trying to lose weight, Cheerios?", ["weight"]],
    ["is Oreo vegan", ["vegan"]],
  ])("%s", (q, conditions) => {
    expect(parseQuestion(q).conditions).toEqual(conditions);
  });
});

describe("[ASSIST-2] the product is what's left", () => {
  it.each([
    ["Hey assistant, I'm a diabetes person. Can I eat Pringles?", "pringles"],
    ["Could you tell me more about the product Pringles, like how many additives it has?", "pringles"],
    ["Does Pringles contain milk?", "pringles"],
    ["Is oat milk ok for someone with diabetes", "oat milk"],
    ["I have high blood pressure, what about Lay's Classic potato chips?", "lays classic potato chips"],
  ])("%s → %s", (q, product) => {
    expect(parseQuestion(q).productQuery).toBe(product);
  });

  it("has no product words for follow-ups", () => {
    expect(parseQuestion("what about its salt?").productQuery).toBeNull();
    expect(parseQuestion("and for diabetes?").productQuery).toBeNull();
  });
});

describe("[ASSIST-3] topics without a condition", () => {
  it("recognises additives, sugar, salt, fat, allergens and alternatives", () => {
    expect(parseQuestion("how many additives does Pringles have").topics).toEqual(["additives"]);
    expect(parseQuestion("is there a healthier alternative to Pringles").topics).toEqual(["alternatives"]);
    expect(parseQuestion("how much salt and sugar").topics.sort()).toEqual(["salt", "sugar"]);
  });
});

describe("[ASSIST-5] nutrients rated with FSA thresholds", () => {
  it("rates foods and drinks with their own thresholds", () => {
    expect(level(5, "sugars_g", "food")).toBe("low");
    expect(level(22.5, "sugars_g", "food")).toBe("medium");
    expect(level(22.6, "sugars_g", "food")).toBe("high");
    expect(level(11.3, "sugars_g", "drink")).toBe("high");
    expect(level(1.6, "salt_g", "food")).toBe("high");
  });

  it("answers a diabetes question with sugars and fibre, per 100 g", () => {
    const a = answerFor(PRINGLES, parseQuestion("I'm diabetic, can I eat Pringles?"));
    expect(a).toContain("Pringles Original.");
    expect(a).toContain("For blood sugar: Sugars: 1.5 g per 100 g, which is low (low is 5 g or less).");
    expect(a).toContain("It has 3.2 g of fibre per 100 g.");
  });

  it("answers blood pressure with salt and heart with fats", () => {
    expect(answerFor(PRINGLES, parseQuestion("high blood pressure, Pringles?"))).toContain(
      "Salt: 1.3 g per 100 g, which is medium (medium is 0.3–1.5 g).",
    );
    expect(answerFor(PRINGLES, parseQuestion("cholesterol and Pringles"))).toContain(
      "Fat: 31 g per 100 g, which is high (high is over 17.5 g).",
    );
  });

  it("says when a nutrient isn't on the label", () => {
    const bare = { ...PRINGLES, nutrition: {} };
    expect(answerFor(bare, parseQuestion("diabetic, Pringles"))).toContain("The label doesn't list its sugars.");
  });
});

describe("[ASSIST-6] allergies and diets from the label", () => {
  it("states what the label lists, may contain, or doesn't list", () => {
    expect(answerFor(PRINGLES, parseQuestion("celiac, Pringles"))).toContain("The label lists gluten.");
    expect(answerFor(PRINGLES, parseQuestion("does Pringles contain milk"))).toContain("The label lists milk.");
    expect(answerFor(PRINGLES, parseQuestion("nut allergy Pringles"))).toContain("The label doesn't list nuts or peanuts.");
    expect(answerFor(PRINGLES, parseQuestion("is Pringles vegan"))).toContain("The ingredient analysis says it isn't vegan.");
  });

  it("says when allergen data isn't available", () => {
    const unknown = { ...PRINGLES, allergens_known: false };
    expect(answerFor(unknown, parseQuestion("celiac, Pringles"))).toContain("isn't available, so check the label");
  });
});

describe("[ASSIST-7] score, disclaimer, and careful wording", () => {
  it("adds the score and the medical disclaimer for condition questions", () => {
    const a = answerFor(PRINGLES, parseQuestion("I'm diabetic, can I eat Pringles?"));
    expect(a).toContain("Its overall score is 49 out of 100 (Mediocre, Nutri-Score D).");
    expect(a.endsWith(DISCLAIMER)).toBe(true);
  });

  it("never says safe, can or can't eat, or other banned words", () => {
    const qs = ["diabetic Pringles", "blood pressure Pringles", "celiac Pringles", "vegan Pringles",
      "how many additives in Pringles", "Pringles", "weight Pringles"];
    for (const q of qs) expect(answerFor(PRINGLES, parseQuestion(q))).not.toMatch(BANNED);
  });

  it("lists additives when asked", () => {
    expect(answerFor(PRINGLES, parseQuestion("how many additives does Pringles have"))).toContain(
      "It has 1 additive: E621 - Monosodium glutamate.",
    );
  });
});
