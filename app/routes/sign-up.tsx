import { SignUp } from "@clerk/react-router";
import { CLERK_ROUTES } from "../lib/constants";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Start your Japanese learning journey today
          </p>
        </div>
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <SignUp 
            routing="path" 
            path={CLERK_ROUTES.SIGN_UP}
            signInUrl={CLERK_ROUTES.SIGN_IN}
            forceRedirectUrl={CLERK_ROUTES.AFTER_SIGN_UP}
          />
        </div>
      </div>
    </div>
  );
}