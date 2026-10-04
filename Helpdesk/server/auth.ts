import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";

/**
 * Resolves and normalizes the application base URL for Better Auth.
 * Handles Render's RENDER_EXTERNAL_URL and converts bare service hostnames
 * (e.g. "helpdesk-ai-system") into valid fully qualified HTTPS URLs.
 */
function resolveBaseUrl(): string | undefined {
  const rawUrl = (process.env.BETTER_AUTH_URL || process.env.RENDER_EXTERNAL_URL || "").trim();
  if (!rawUrl) return undefined;

  // If already a valid full http:// or https:// URL
  if (/^https?:\/\//i.test(rawUrl)) {
    // If it's a bare internal host without a domain (e.g. "http://helpdesk-ai-system") and RENDER_EXTERNAL_URL is available
    if (process.env.RENDER_EXTERNAL_URL && !rawUrl.includes(".") && !rawUrl.includes("localhost") && !rawUrl.includes("127.0.0.1")) {
      return process.env.RENDER_EXTERNAL_URL.trim();
    }
    return rawUrl;
  }

  // If Render provided RENDER_EXTERNAL_URL (e.g. "https://helpdesk-ai-system.onrender.com")
  if (process.env.RENDER_EXTERNAL_URL && /^https?:\/\//i.test(process.env.RENDER_EXTERNAL_URL)) {
    return process.env.RENDER_EXTERNAL_URL.trim();
  }

  // If rawUrl is just a hostname like "helpdesk-ai-system" or "helpdesk-ai-system.onrender.com"
  if (rawUrl.includes(".")) {
    return `https://${rawUrl}`;
  }
  return `https://${rawUrl}.onrender.com`;
}

export const resolvedBaseUrl = resolveBaseUrl();

const configuredTrustedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  ...(process.env.RENDER_EXTERNAL_URL ? [process.env.RENDER_EXTERNAL_URL.trim()] : []),
  ...(resolvedBaseUrl ? [resolvedBaseUrl] : []),
  ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL.trim()] : []),
  ...(process.env.TRUSTED_ORIGIN ? process.env.TRUSTED_ORIGIN.split(",").map(o => o.trim()) : [])
];

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: resolvedBaseUrl,
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || "default-secret-change-in-production",
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "AGENT",
        input: false,
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
      deletedAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  trustedOrigins: configuredTrustedOrigins,
});
