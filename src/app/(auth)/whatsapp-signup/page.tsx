import { notFound } from "next/navigation";
import { isProspectsEnabled } from "@/lib/feature-flags";
import { WhatsAppSignupClient } from "./whatsapp-signup-client";

// Page-level flag gate — server-rendered notFound() means the URL
// returns a real 404 response (not a redirect) when prospects are off,
// so external probes don't reveal the route exists.
export default function WhatsAppSignupPage() {
  if (!isProspectsEnabled()) notFound();
  return <WhatsAppSignupClient />;
}
