import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendWelcomeEmailForInvestor } from "@/lib/mail/send-welcome";
import { STAFF_ROLES } from "@/lib/roles";


export const runtime = "nodejs";

// Manual resend of the welcome email. Used by the "Send Now" button on the
// investor edit form when the auto-send at approval time failed, or when
// an admin wants to re-send the credentials email.
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendWelcomeEmailForInvestor(params.id, {
      sentById: (session.user as any).id,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Manual welcome resend error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed" },
      { status: 500 },
    );
  }
}
