# Changelog

## [0.2.0](https://github.com/nikita-ravi/Glowgut-open/compare/v0.1.0...v0.2.0) (2026-10-13)


### Features

* accounts with Google sign-in (M5) ([#11](https://github.com/nikita-ravi/Glowgut-open/issues/11)) ([5efe497](https://github.com/nikita-ravi/Glowgut-open/commit/5efe497c0ad4158f99b576b41275a56ef67392cf))
* add a missing product from a label photo ([#10](https://github.com/nikita-ravi/Glowgut-open/issues/10)) ([12cd16e](https://github.com/nikita-ravi/Glowgut-open/commit/12cd16e4c3e7b7f6ef0dca96cb070d7e4b1ca284))
* add USDA FoodData Central as a gap-fill and live fallback ([#5](https://github.com/nikita-ravi/Glowgut-open/issues/5)) ([c594654](https://github.com/nikita-ravi/Glowgut-open/commit/c59465411a7a73c629a43529c452c58e3aa18d73))
* alternatives strip and FDA recall banner ([#1](https://github.com/nikita-ravi/Glowgut-open/issues/1)) ([fc2177c](https://github.com/nikita-ravi/Glowgut-open/commit/fc2177cc6090c4bc0abab5d1ba6c01ea453cd5e8))
* **api:** cache public responses in memory and serve them stale on outages ([#23](https://github.com/nikita-ravi/Glowgut-open/issues/23)) ([cc217a3](https://github.com/nikita-ravi/Glowgut-open/commit/cc217a36976283c6addcb50bf37fc15b1daa48d1))
* **api:** serve product scores via GET /products/{gtin} ([b79999d](https://github.com/nikita-ravi/Glowgut-open/commit/b79999d50e4ecd2009f9293e4bb9e0ba8eeb44d9))
* **db:** add the core schema and Alembic migrations ([f6f5f6e](https://github.com/nikita-ravi/Glowgut-open/commit/f6f5f6e07981ce200b9fecb1dec8ac607290c185))
* **gtin:** normalize and validate barcodes as GTIN-13 ([68b28ed](https://github.com/nikita-ravi/Glowgut-open/commit/68b28ed230418c8f91cbd46ebc446d279d91169b))
* methodology and about pages with a site-wide footer ([#12](https://github.com/nikita-ravi/Glowgut-open/issues/12)) ([8cf3473](https://github.com/nikita-ravi/Glowgut-open/commit/8cf3473a6b75a68f2ac9ca47c15ed79de218f3fd))
* **pipeline:** bulk-import US products from the Open Food Facts export ([#4](https://github.com/nikita-ravi/Glowgut-open/issues/4)) ([cb3468c](https://github.com/nikita-ravi/Glowgut-open/commit/cb3468ca92487d66b61de62df2d6c179054d8a64))
* **pipeline:** load the additives reference from the OFF taxonomy ([60dbd5e](https://github.com/nikita-ravi/Glowgut-open/commit/60dbd5e8961d3cbb7e45c1057c80640bcf38c2c3))
* redesign the app with a landing page, tabs and top foods by category ([#22](https://github.com/nikita-ravi/Glowgut-open/issues/22)) ([4d12451](https://github.com/nikita-ravi/Glowgut-open/commit/4d12451b6603883bfcd6fc664de7eae615a60429))
* **scoring:** add the additive and processing components ([340c460](https://github.com/nikita-ravi/Glowgut-open/commit/340c460e95911fdef6572de18be3ff0a740291eb))
* **scoring:** add the golden gate and fix two Nutri-Score porting bugs (engine 0.3.0) ([#8](https://github.com/nikita-ravi/Glowgut-open/issues/8)) ([52edabf](https://github.com/nikita-ravi/Glowgut-open/commit/52edabfecb6736f36a6235441826f9d5a615a3f1))
* **scoring:** combine components into a versioned, explained score ([6d947e3](https://github.com/nikita-ravi/Glowgut-open/commit/6d947e35c6a131d056bd5881958b372869ebf9ad))
* **scoring:** estimate missing inputs from the ingredient list (engine 0.2.0) ([#7](https://github.com/nikita-ravi/Glowgut-open/issues/7)) ([13cc948](https://github.com/nikita-ravi/Glowgut-open/commit/13cc9485599e71ea384385d328c0a21ff50e5133))
* **scoring:** port the 2023 Nutri-Score algorithm ([543837a](https://github.com/nikita-ravi/Glowgut-open/commit/543837a3509527b91198a22fb77defa2fd81e683))
* search products by name or brand ([#9](https://github.com/nikita-ravi/Glowgut-open/issues/9)) ([ed9b2db](https://github.com/nikita-ravi/Glowgut-open/commit/ed9b2dbd12d17e4b59f364aa5d2c95ae93cb08e4))
* show the US regulatory status of each additive ([#6](https://github.com/nikita-ravi/Glowgut-open/issues/6)) ([c947618](https://github.com/nikita-ravi/Glowgut-open/commit/c9476189f4635d36986455f9d5d074d352a193e6))
* **web:** a voice assistant tab for health questions about any product ([#19](https://github.com/nikita-ravi/Glowgut-open/issues/19)) ([ae6f920](https://github.com/nikita-ravi/Glowgut-open/commit/ae6f920fbe6e7d45295dee1a6a2949f22128bc7e))
* **web:** add the camera scanner and manual entry home page ([3885a84](https://github.com/nikita-ravi/Glowgut-open/commit/3885a84650f7bb6f2ea3c69a74d62d7d6ea810bb))
* **web:** add the product page ([7fc39fb](https://github.com/nikita-ravi/Glowgut-open/commit/7fc39fbeb8f7342e1e5dcc448623af23c249da31))
* **web:** ask about a product by voice or text, and hear it read aloud ([#15](https://github.com/nikita-ravi/Glowgut-open/issues/15)) ([839d859](https://github.com/nikita-ravi/Glowgut-open/commit/839d85974e88b68997d7255335b4e21d579cf364))
* **web:** make the app installable with an offline shell ([b6c0dd7](https://github.com/nikita-ravi/Glowgut-open/commit/b6c0dd771e584b0f49d87589b335a6cd07285733))
* **web:** show the GlowGut brand in the header ([#30](https://github.com/nikita-ravi/Glowgut-open/issues/30)) ([ffe3d63](https://github.com/nikita-ravi/Glowgut-open/commit/ffe3d631efc32f4342d53476fcbdee22c074aa99))
* **web:** sign in with an email and password ([#28](https://github.com/nikita-ravi/Glowgut-open/issues/28)) ([35fa985](https://github.com/nikita-ravi/Glowgut-open/commit/35fa98563344a3cf42b14940436cc93894de3b65))
* **web:** the assistant understands free-form questions with Groq ([#21](https://github.com/nikita-ravi/Glowgut-open/issues/21)) ([5cfc93f](https://github.com/nikita-ravi/Glowgut-open/commit/5cfc93f6fb02b46c2bb30db63bf55df2524fdb30))
* **web:** the assistant's mic uses Groq Whisper for speech to text ([#26](https://github.com/nikita-ravi/Glowgut-open/issues/26)) ([6331987](https://github.com/nikita-ravi/Glowgut-open/commit/6331987ad1b711381812b39dbfb6877a33b1b461))
* **web:** validate barcodes in the browser and self-host the detector ([6c3ae33](https://github.com/nikita-ravi/Glowgut-open/commit/6c3ae33787e68b10a147bbe9e84e1f2b377aba8f))


### Bug Fixes

* **pipeline:** don't fail the additives load when FDA's export is unavailable ([#18](https://github.com/nikita-ravi/Glowgut-open/issues/18)) ([ddbb6e9](https://github.com/nikita-ravi/Glowgut-open/commit/ddbb6e93249c98f471f036b20f90342862008ad4))
* round numbers for reading and explain empty additive lists ([#2](https://github.com/nikita-ravi/Glowgut-open/issues/2)) ([f4c28cb](https://github.com/nikita-ravi/Glowgut-open/commit/f4c28cb810f1143e4ee1b6f0943d6e40afa00ace))
* **scoring:** balanced scoring by Nutri-Score grade and a plain-language summary (engine 0.4.1) ([#16](https://github.com/nikita-ravi/Glowgut-open/issues/16)) ([cba0da0](https://github.com/nikita-ravi/Glowgut-open/commit/cba0da0b8d35eec170223317f5cbad0a1b9c747c))
* **web:** keep Sign in disabled until the page is ready ([#29](https://github.com/nikita-ravi/Glowgut-open/issues/29)) ([80b248e](https://github.com/nikita-ravi/Glowgut-open/commit/80b248e8c2fa28bf4e15a0f6ce6f14ca54dda421))
* **web:** the assistant adds the medical disclaimer to every answer ([#20](https://github.com/nikita-ravi/Glowgut-open/issues/20)) ([b196456](https://github.com/nikita-ravi/Glowgut-open/commit/b196456b64a520891061646b8ae5ac2143de768d))
* **web:** the assistant answers faster and always finds the named food ([#27](https://github.com/nikita-ravi/Glowgut-open/issues/27)) ([3481d03](https://github.com/nikita-ravi/Glowgut-open/commit/3481d032d1f8a5915a1c520197e05d09aa85b142))


### Documentation

* a README with screenshots, the scoring method and how to run it ([#31](https://github.com/nikita-ravi/Glowgut-open/issues/31)) ([9b8910b](https://github.com/nikita-ravi/Glowgut-open/commit/9b8910bc5b087ea1fb899b9e10c4ccf5b50167de))
* add the product spec, build plan and spec-driven workflow ([ac7f87d](https://github.com/nikita-ravi/Glowgut-open/commit/ac7f87d02c3c8b8f36bfd9891d921782abbaeaf0))
* **specs:** draft the scanner and product page specs ([78952a7](https://github.com/nikita-ravi/Glowgut-open/commit/78952a77bc989a5ecfbc3460c9c68bd951f9cf9f))
* update the plan and contributor notes for the web app ([be75b54](https://github.com/nikita-ravi/Glowgut-open/commit/be75b5441c137b6eef16b54bc657d79dfd0bb3af))
