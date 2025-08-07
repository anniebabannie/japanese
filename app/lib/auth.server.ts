import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";

/**
 * Get the current user from a request
 * Returns the user ID if authenticated, null if not
 */
export async function getCurrentUser(args: any) {
  const { userId } = await getAuth(args);
  return userId;
}

/**
 * Require authentication for a route
 * Redirects to sign-in if not authenticated
 * Returns the user ID if authenticated
 */
export async function requireAuth(args: any, redirectTo: string = "/sign-in") {
  const { userId } = await getAuth(args);
  
  if (!userId) {
    // Preserve the current URL to redirect back after sign-in
    const url = new URL(args.request.url);
    const searchParams = new URLSearchParams({ redirect_url: url.pathname + url.search });
    throw redirect(`${redirectTo}?${searchParams}`);
  }
  
  return userId;
}

/**
 * Get the current user and redirect if not authenticated
 * This is a helper that combines getCurrentUser and requireAuth
 */
export async function getUserOrRedirect(request: Request, redirectTo: string = "/sign-in") {
  return await requireAuth(request, redirectTo);
}

/**
 * Check if user is authenticated without redirecting
 * Useful for conditional logic in loaders
 */
export async function isAuthenticated(request: Request): Promise<boolean> {
  const userId = await getCurrentUser(request);
  return !!userId;
}