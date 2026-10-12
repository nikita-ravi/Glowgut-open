import { defineConfig, devices } from "@playwright/test";

import { E2E_DATABASE_URL } from "./e2e/global-setup";

const API_PORT = 8001;
const WEB_PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    ...devices["Pixel 7"],
    launchOptions: {
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    },
  },
  webServer: [
    {
      // OFF_BASE_URL points at a closed port: e2e never calls the real Open Food Facts.
      command: `uv run uvicorn app.main:app --port ${API_PORT}`,
      cwd: "..",
      url: `http://127.0.0.1:${API_PORT}/health`,
      env: {
        DATABASE_URL: E2E_DATABASE_URL,
        OFF_BASE_URL: "http://127.0.0.1:9",
        OFF_CONTACT: "e2e",
      },
      reuseExistingServer: false,
    },
    {
      // Production build: the service worker only registers in production.
      command: `pnpm build && pnpm start -p ${WEB_PORT}`,
      url: `http://127.0.0.1:${WEB_PORT}`,
      env: { API_URL: `http://127.0.0.1:${API_PORT}` },
      timeout: 180_000,
      reuseExistingServer: false,
    },
  ],
});
