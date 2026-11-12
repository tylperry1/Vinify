"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { rateLimit } from "@/lib/server/auth";
import { acceptCustomerInvite } from "@/lib/server/customer-invites";

export async function registerCustomer(_state: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (!process.env.DATABASE_URL) return { error: "Account registration is temporarily unavailable." };
  if (!/^[a-f0-9]{64}$/.test(token)) return { error: "Open the original invitation link to register." };
  if (password.length < 14 || password.length > 256) return { error: "Use a password with 14–256 characters." };
  if (form.get("confirmation") !== password) return { error: "The passwords do not match." };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  try {
    if (!await rateLimit(`register:${ip}`, 15, 900000)) return { error: "Too many attempts. Try again later." };
    if (!await acceptCustomerInvite(token, password)) return { error: "This invitation is no longer valid. Ask Vinify for a new link." };
  } catch {
    return { error: "The account could not be created. Try signing in or ask Vinify for help." };
  }
  redirect("/account/login?registered=1");
}
