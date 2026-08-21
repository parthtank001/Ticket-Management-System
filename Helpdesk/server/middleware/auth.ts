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
