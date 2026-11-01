import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/launchboard_test",
      AUTH_SECRET: "test-secret-test-secret-test-secret-123",
      PAYMENTS_MOCK: "true",
      RAZORPAY_KEY_ID: "rzp_test_key",
      RAZORPAY_KEY_SECRET: "rzp_test_secret",
      RAZORPAY_WEBHOOK_SECRET: "rzp_webhook_secret",
      FREE_LISTING_LIMIT: "5",
    },
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
