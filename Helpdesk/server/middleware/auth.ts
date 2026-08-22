import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";

// Extend Express Request interface to include authenticated user & session types
declare global {
  namespace Express {
    interface Request {
      user?: typeof auth.$Infer.Session.user;
      session?: typeof auth.$Infer.Session.session;
    }
  }
}

/**
 * Reusable Express middleware to enforce authentication.
 * Verifies the database session via Better Auth and attaches `user` & `session` to `req`.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
  try {
    const sessionData = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!sessionData || !sessionData.session || !sessionData.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required. Please sign in.",
      });
    }

    req.user = sessionData.user;
    req.session = sessionData.session;

    return next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Session verification failed.",
    });
  }
}

import { Role } from "../types";

/**
 * Express middleware to enforce role-based authorization.
 * Usage: requireRole(Role.ADMIN) or requireRole([Role.ADMIN, Role.AGENT])
 */
export function requireRole(allowedRoles: Role | Role[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, res: Response, next: NextFunction): void | Response => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required.",
      });
    }

    const userRole = (req.user as { role?: Role }).role;

    if (!userRole || !roles.includes(userRole as Role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Access denied. Insufficient role permissions.",
      });
    }

    return next();
  };
}

