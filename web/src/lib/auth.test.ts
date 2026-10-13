import { describe, expect, it } from "vitest";

import { authOptions, withoutProviderTokens } from "./auth";

describe("[ACC-1] Google is the only way to sign in", () => {
  it("configures Google and no passwords", () => {
    expect(Object.keys(authOptions.socialProviders)).toEqual(["google"]);
    expect(authOptions.emailAndPassword.enabled).toBe(false);
  });
});

describe("[ACC-2] no Google tokens are kept", () => {
  it("strips provider tokens before an account is stored", async () => {
    const account = { id: "a", userId: "u", providerId: "google", accessToken: "x", refreshToken: "y",
      idToken: "z", accessTokenExpiresAt: new Date(), refreshTokenExpiresAt: new Date() };
    const stored = withoutProviderTokens(account);
    expect(stored).toMatchObject({ id: "a", userId: "u", providerId: "google", accessToken: null,
      refreshToken: null, idToken: null, accessTokenExpiresAt: null, refreshTokenExpiresAt: null });
    const created = await authOptions.databaseHooks.account.create.before(account);
    expect(created.data.accessToken).toBeNull();
    const updated = await authOptions.databaseHooks.account.update.before(account);
    expect(updated.data.refreshToken).toBeNull(); // token refreshes are dropped too
  });
});

describe("[ACC-3] tokens for the API", () => {
  it("issues JWTs through the jwt plugin", () => {
    expect(authOptions.plugins.map((p) => p.id)).toContain("jwt");
  });
});
