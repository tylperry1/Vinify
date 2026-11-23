import "server-only";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

/**
 * Transactional email.
 *
 * Resend is used when RESEND_API_KEY and EMAIL_FROM are configured. Without
 * them, development writes messages to `.local-test/mail.log`; production
 * reports `delivered: false` — the app never claims an email was delivered
 * unless the provider accepted it.
 */

export interface EmailResult {
  delivered: boolean;
  provider: "resend" | "console" | "none";
  id?: string;
  error?: string;
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function siteUrl(pathname: string): string {
  try {
    return new URL(pathname, process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").toString();
  } catch {
    return new URL(pathname, "http://localhost:3001").toString();
  }
}

function branded(title: string, body: string, action: { href: string; label: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f7fb;padding:32px 16px;font-family:ui-sans-serif,system-ui,sans-serif;color:#0b1430">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e3e8f2;border-radius:18px;overflow:hidden">
    <div style="background:#0a1733;padding:22px 28px"><span style="color:#7dd3fc;font-weight:700;letter-spacing:.14em;font-size:12px">VINIFY</span></div>
    <div style="padding:28px"><h1 style="margin:0 0 12px;font-size:22px">${title}</h1><div style="color:#55617d;line-height:1.6">${body}</div>
    <p style="margin:26px 0 0"><a href="${action.href}" style="display:inline-block;background:#2563ff;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">${action.label}</a></p>
    <p style="margin:22px 0 0;font-size:12px;color:#8a94ab">If you didn't request this, you can ignore this email. Vinify · Vehicle History. Made Simple.</p></div>
  </div></body></html>`;
}

export function verificationEmail(url: string) {
  return {
    subject: "Verify your Vinify email",
    text: `Confirm your Vinify email address: ${url}\n\nThis link expires in 24 hours. If you didn't create an account, ignore this email.`,
    html: branded(
      "Confirm your email",
      "Verify this address to secure your Vinify account and keep access to your reports. This link expires in 24 hours.",
      { href: url, label: "Verify email" },
    ),
  };
}

export function resetEmail(url: string) {
  return {
    subject: "Reset your Vinify password",
    text: `Reset your Vinify password: ${url}\n\nThis link expires in one hour. If you didn't ask for a reset, ignore this email — your password is unchanged.`,
    html: branded(
      "Reset your password",
      "Choose a new password with the link below. It expires in one hour. If you didn't ask for this, ignore the email — your password stays the same.",
      { href: url, label: "Reset password" },
    ),
  };
}

export async function sendEmail(message: { to: string; subject: string; text: string; html: string }): Promise<EmailResult> {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      try {
        await mkdir(".local-test", { recursive: true });
        await appendFile(
          path.join(".local-test", "mail.log"),
          `${new Date().toISOString()}\t${message.to}\t${message.subject}\n${message.text}\n\n`,
        );
      } catch {
        // Local logging is best-effort; the caller still reports "not sent".
      }
      return { delivered: false, provider: "console" };
    }
    return { delivered: false, provider: "none", error: "email_not_configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { delivered: false, provider: "resend", error: `provider_${response.status}` };
    const json = (await response.json().catch(() => null)) as { id?: string } | null;
    return { delivered: Boolean(json?.id), provider: "resend", id: json?.id };
  } catch {
    return { delivered: false, provider: "resend", error: "network_error" };
  }
}
