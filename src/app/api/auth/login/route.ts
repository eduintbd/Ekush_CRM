import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { login, password } = await req.json();

  if (!login?.trim() || !password) {
    return NextResponse.json(
      { error: "Please provide login credentials" },
      { status: 400 }
    );
  }

  const loginTrimmed = (login as string).trim();

  // 1. Find user in Prisma by email, phone, or investor code
  let user: Awaited<ReturnType<typeof prisma.user.findFirst>> & {
    investor?: { id: string; investorCode: string; name: string } | null;
  };

  try {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginTrimmed },
          { phone: loginTrimmed },
          { investor: { investorCode: loginTrimmed.toUpperCase() } },
        ],
      },
      include: { investor: true },
    }) as any;
  } catch {
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // 1b. Active investors must log in with their Investor Code. Email/phone
  // lookups are only allowed while the account is still PENDING (so
  // approvals staff and KYC helpers can reach new sign-ups). Admin / staff
  // users have no investor record, so this guard doesn't affect them.
  if (user.status === "ACTIVE" && user.investor) {
    const enteredUpper = loginTrimmed.toUpperCase();
    if (enteredUpper !== user.investor.investorCode.toUpperCase()) {
      return NextResponse.json(
        {
          error:
            "Active investors must log in with their Investor Code. Please enter your code (e.g. A00002) instead of an email or phone number.",
        },
        { status: 401 },
      );
    }
  }

  // 2. Check account lock
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return NextResponse.json(
      { error: "Account is temporarily locked. Please try again later." },
      { status: 401 }
    );
  }

  // 3. Check account status
  if (user.status === "SUSPENDED" || user.status === "CLOSED") {
    return NextResponse.json(
      { error: "Account is not active. Please contact support." },
      { status: 401 }
    );
  }

  // 4. Verify password against bcrypt hash
  const isValid = await compare(password, user.passwordHash);

  if (!isValid) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: { increment: 1 },
        ...(user.failedLoginCount >= 4
          ? { lockedUntil: new Date(Date.now() + 30 * 60 * 1000) }
          : {}),
      },
    });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // 5. Prepare user metadata to store in Supabase Auth
  const investor = (user as any).investor as
    | { id: string; investorCode: string; name: string }
    | null;

  const userMeta = {
    prismaUserId: user.id,
    role: user.role,
    status: user.status,
    investorId: investor?.id,
    investorCode: investor?.investorCode,
    name: investor?.name ?? "User",
  };

  // Use email for Supabase Auth; fall back to a deterministic internal address
  const authEmail = user.email ?? `${user.phone ?? user.id}@ekush.internal`;

  // 6. Sync user with Supabase Auth (create on first login, update on subsequent)
  let supabaseUserId = user.supabaseId;

  if (!supabaseUserId) {
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: userMeta,
      });

    if (createErr) {
      // If user already exists in Supabase, try to find and link them
      if (createErr.message?.includes("already been registered")) {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existing = existingUsers?.users?.find((u) => u.email === authEmail);
        if (existing) {
          supabaseUserId = existing.id;
          await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
            password,
            user_metadata: userMeta,
          });
          await prisma.user.update({
            where: { id: user.id },
            data: { supabaseId: supabaseUserId },
          });
        } else {
          console.error("Supabase createUser error:", createErr.message);
          return NextResponse.json(
            { error: "Authentication failed. Please try again." },
            { status: 500 }
          );
        }
      } else {
        console.error("Supabase createUser error:", createErr.message);
        return NextResponse.json(
          { error: "Authentication failed. Please try again." },
          { status: 500 }
        );
      }
    } else {
      supabaseUserId = created.user.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { supabaseId: supabaseUserId },
      });
    }
  } else {
    // Keep Supabase email, password, and metadata in sync
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
      email: authEmail,
      password,
      user_metadata: userMeta,
    });
    if (updateErr) {
      console.error("Supabase updateUser error:", updateErr.message);
    }
  }

  // 7. Sign in via Supabase to get a session (sets auth cookies)
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password,
  });

  if (signInError) {
    console.error("Supabase signIn error:", signInError.message);
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }

  // 8. Update Prisma login tracking
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, role: user.role });
}
