# 023: Voice assistant tab

Status: implemented

A separate "Assistant" page where someone taps a big microphone and asks about any product in
their own words, e.g. "Hey, I'm diabetic. Can I eat Pringles?" It finds the product, checks the
nutrients that matter for the person's condition, and answers on screen and out loud.

**Demo version: no AI model.** Understanding is keyword rules, the product comes from our
search (database only), and answers are templates over the product's label data. It's free,
deterministic and fully testable. A production version may add an LLM to *phrase* answers
from the same data (see "Later").

## Understanding the question (`parseQuestion`)

- **ASSIST-1** Conditions are recognised by keywords: diabetes ("diabetes", "diabetic", "blood
  sugar"), blood pressure ("blood pressure", "hypertension", "sodium"), heart ("heart",
  "cholesterol"), weight ("weight", "calories", "diet"), gluten ("gluten", "celiac",
  "coeliac"), dairy ("lactose", "dairy", "milk allergy"), nuts ("nut allergy", "peanut
  allergy", "nuts", "peanuts"), vegan and vegetarian. A question can name several.
- **ASSIST-2** The product is whatever is left after removing filler, condition and question
  words ("hey assistant", "I'm a", "can I eat", "tell me about", …). With no product words,
  the last product asked about is reused ("what about its salt?"). With neither, the
  assistant asks which product.
- **ASSIST-3** Topics without a condition are recognised too: score, additives, sugar, salt,
  fat, allergens, alternatives. A question with neither gets a short overview (score, band and
  the main reasons).

## Answering (`answerQuestion`)

- **ASSIST-4** The product is the top result of `/api/search` for the product words. Its data
  comes from `GET /products/{gtin}` through a web proxy. It's named in the answer as "{brand}
  {name}" so the user can tell if it picked the wrong one.
- **ASSIST-5** For each condition, the answer gives the relevant nutrients per 100 g (or 100 ml
  for drinks), rated **low / medium / high** with the UK Food Standards Agency front-of-pack
  thresholds:
  - foods: sugars low ≤ 5 g, high > 22.5 g; fat low ≤ 3 g, high > 17.5 g; saturated fat low ≤
    1.5 g, high > 5 g; salt low ≤ 0.3 g, high > 1.5 g;
  - drinks: sugars low ≤ 2.5 g, high > 11.25 g; fat low ≤ 1.5 g, high > 8.75 g; saturated fat
    low ≤ 0.75 g, high > 2.5 g; salt low ≤ 0.3 g, high > 0.75 g.

  Diabetes → sugars (and fibre if listed); blood pressure → salt; heart → saturated fat and
  fat; weight → energy in kcal, sugars and fat. A missing nutrient is said to be missing.
- **ASSIST-6** Allergy and diet conditions use the label's allergens, traces and vegan or
  vegetarian status (as in spec 018). Without label data, the answer says so and to check the
  label.
- **ASSIST-7** Every answer adds the score and band, and ends with "This is general label
  information, not medical advice. Your doctor or dietitian can tell you what fits your plan."
  It never says a product is "safe", or that someone "can" or "can't" eat it, and never uses
  "toxic", "dangerous" or "unsafe" (hard rule 4).
- **ASSIST-8** Product not found → "I couldn't find {words}. Try the brand and product name,
  or scan its barcode." Search or network failure → "I can't look that up right now."

## The page

- **ASSIST-9** `/assistant` has a large round microphone button that pulses while listening, a
  chat-style transcript (question, answer, and a link to the product page), and a text box
  that always works. It's linked from the header and the home page.
- **ASSIST-10** Speech: recognition starts only on a tap, after the one-time notice from spec 022
  (VOICE-7). Answers are spoken with `speechSynthesis` when available, with a Stop button.
  Without speech support, the page works by typing.
- **ASSIST-11** The page has no axe-detected WCAG 2.1 AA violations. The transcript is a polite
  live region, and the mic button's state is announced (`aria-pressed`, label).

## Later (production, not built here)

An LLM using tools over the same API (search, product, alternatives) to handle free-form and
follow-up questions, writing answers only from the returned data, with the ASSIST-7 rules as
system constraints and the template answer as a fallback. On-device speech recognition (e.g.
Whisper in the browser) to avoid sending audio to Google. Both need a cost and privacy
decision: hard rule 1 is $0/month.
