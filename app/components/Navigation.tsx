import { SignedIn, SignedOut, UserButton } from "@clerk/react-router";
import { Link } from "react-router";
import Button from "./Button";
import { CLERK_ROUTES } from "../lib/constants";

export default function Navigation() {

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and App Name */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-3xl font-bold text-teal-600">
                自学
              </span>
              <span className="text-xl font-bold text-gray-900">
                Jigaku
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            {/* Public Navigation - when signed out */}
            <SignedOut>
              <Link
                to="/"
                className="text-gray-700 hover:text-teal-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Home
              </Link>
              <Link to={CLERK_ROUTES.SIGN_IN}>
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to={CLERK_ROUTES.SIGN_UP}>
                <Button size="sm">
                  Sign Up
                </Button>
              </Link>
            </SignedOut>

            {/* Authenticated Navigation - when signed in */}
            <SignedIn>
              <Link
                to="/"
                className="text-gray-700 hover:text-teal-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Home
              </Link>
              <Link
                to={CLERK_ROUTES.AFTER_SIGN_IN}
                className="text-gray-700 hover:text-teal-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                My Lessons
              </Link>
              <Link to="/generate-lesson">
                <Button size="sm" className="inline-flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Generate Lesson
                </Button>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </div>
    </nav>
  );
} 