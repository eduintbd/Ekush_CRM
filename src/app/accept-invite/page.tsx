import { Suspense } from "react";
import { AcceptInviteClient } from "./accept-invite-client";

// Server-component shell. The client form below uses useSearchParams(),
// which Next.js requires to sit inside a Suspense boundary during static
// generation — hence this two-file split.
export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteClient />
    </Suspense>
  );
}
