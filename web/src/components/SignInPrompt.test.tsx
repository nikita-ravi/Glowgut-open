import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const social = vi.hoisted(() => vi.fn());
vi.mock("better-auth/react", () => ({
  createAuthClient: () => ({ signIn: { social }, useSession: vi.fn(), signOut: vi.fn() }),
}));

import { SignInPrompt } from "./SignInPrompt";

describe("[ACC-1] signing in", () => {
  it("signs in with Google and returns to the account page", () => {
    render(<SignInPrompt />);
    expect(screen.getByText(/Everything else works without an account/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));
    expect(social).toHaveBeenCalledWith({ provider: "google", callbackURL: "/account" });
  });
});
