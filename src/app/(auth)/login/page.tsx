import { isProspectsEnabled } from "@/lib/feature-flags";
import { LoginClient } from "./login-client";

// Server wrapper: reads the prospect-tier flag at request time and
// hands it to the client component as a prop. When the flag is off
// the Prospect tab is hidden — keeping the page identical to the
// pre-Phase-5 experience for investors.
export default function LoginPage() {
  return <LoginClient prospectsEnabled={isProspectsEnabled()} />;
}
