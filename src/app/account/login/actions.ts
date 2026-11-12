"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/server/db";
import { cookieName, rateLimit } from "@/lib/server/auth";
import { digest, isAdmin, verifyPassword } from "@/lib/security";

const dummyPasswordHash = "00000000000000000000000000000000:" + "00".repeat(64);

export async function signIn(form: FormData) {
  if (!process.env.DATABASE_URL) redirect("/account/login?error=setup");
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const password = String(form.get("password") ?? "");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  let destination = "/account/login?error=credentials";

  try {
    if (await rateLimit(`login-ip:${ip}`, 20, 900000) && await rateLimit(`login:${email}`, 5, 900000)) {
      const user = await db.user.findUnique({ where: { email } });
      const valid = verifyPassword(password, user?.passwordHash ?? dummyPasswordHash);
      if (user && user.passwordHash && valid && !user.deletedAt) {
        const token = randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 8 * 3600000);
        const staff = isAdmin(user.role);
        await db.$transaction([
          db.session.create({ data: { userId: user.id, sessionToken: digest(token), expires } }),
          db.auditLog.create({ data: { actorId: user.id, action: staff ? "LOGIN" : "CUSTOMER_LOGIN" } }),
        ]);
        (await cookies()).set(cookieName, token, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          expires,
        });
        destination = staff ? "/admin" : "/account";
      } else {
        await db.auditLog.create({ data: { action: "LOGIN_FAILED" } });
      }
    }
  } catch {
    console.error("Vinify sign-in could not reach its account store");
    destination = "/account/login?error=unavailable";
  }
  redirect(destination);
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) await db.session.deleteMany({ where: { sessionToken: digest(token) } });
  jar.delete(cookieName);
  redirect("/account/login");
}
