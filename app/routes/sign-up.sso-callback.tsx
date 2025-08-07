import { AuthenticateWithRedirectCallback } from "@clerk/react-router";

export default function SSOCallback() {
  return <AuthenticateWithRedirectCallback />;
}