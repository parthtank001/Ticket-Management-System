import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";
import { Role } from "./types";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: Role.AGENT,
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
  trustedOrigins: (process.env.TRUSTED_ORIGIN || "http://localhost:5173").split(",").map(origin => origin.trim()),
});
