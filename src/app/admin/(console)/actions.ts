"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/auth";
import { encryptSecret } from "@/lib/security";
import { decodeVin } from "@/lib/nhtsa";
import { monitored } from "@/lib/server/providers";
export async function saveProvider(form: FormData) {
  const actor = await requireAdmin(true);
  const id = String(form.get("provider")), secret = String(form.get("secret") ?? "");
  if (!["nhtsa", "licensed-history"].includes(id)) throw new Error("Unknown provider");
  if (secret.length > 4096) throw new Error("Credential is too long");
  const enabled = form.get("enabled") === "on";
  const costCents = Number(form.get("costCents"));
  if (!Number.isInteger(costCents) || costCents < 0 || costCents > 100000) throw new Error("Invalid cost");
  if (id === "nhtsa" && (secret || costCents !== 0)) throw new Error("NHTSA does not require a key or charge per call");
  const encryptedSecret = form.get("clearSecret") === "on" ? null : secret ? encryptSecret(secret, id) : undefined;
  await db.$transaction([
    db.apiProvider.upsert({ where: { id }, create: { id, enabled, costCents, encryptedSecret }, update: { enabled, costCents, encryptedSecret } }),
    db.auditLog.create({ data: { actorId: actor.id, action: "PROVIDER_UPDATED", target: id, meta: { enabled, costCents, credentialChanged: encryptedSecret !== undefined } } }),
  ]);
  revalidatePath("/admin/api-center");
}
export async function testNhtsa() {
  const actor = await requireAdmin();
  const success = await monitored("nhtsa", "connection_test", () => decodeVin("1HGCM82633A004352", { signal: AbortSignal.timeout(10000) })).then(() => true, () => false);
  await db.auditLog.create({ data: { actorId: actor.id, action: "PROVIDER_TEST", target: "nhtsa", meta: { success } } });
  revalidatePath("/admin/api-center");
}
export async function updateCustomer(form: FormData) {
  const actor = await requireAdmin(), id = String(form.get("id"));
  await db.$transaction(async tx => {
    const user = await tx.user.findUniqueOrThrow({ where: { id } });
    if (user.role !== "CUSTOMER") throw new Error("Use the staff role controls for staff accounts");
    const deletedAt = form.get("suspended") === "on" ? new Date() : null;
    await tx.user.update({ where: { id }, data: { deletedAt } });
    if (deletedAt) await tx.session.deleteMany({ where: { userId: id } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: deletedAt ? "CUSTOMER_SUSPENDED" : "CUSTOMER_RESTORED", target: id } });
  });
  revalidatePath("/admin/customers");
}
export async function adjustCredits(form: FormData) {
  const actor = await requireAdmin(true), id = String(form.get("id"));
  const delta = Number(form.get("delta")), note = String(form.get("note") ?? "").trim();
  const key = String(form.get("key") ?? "");
  if (!Number.isInteger(delta) || !delta || Math.abs(delta) > 100 || note.length < 5 || note.length > 500 || !/^[a-f0-9-]{36}$/.test(key)) throw new Error("Invalid adjustment");
  await db.$transaction(async tx => {
    if (await tx.creditLedger.findUnique({ where: { idempotencyKey: `admin:${key}` } })) return;
    await tx.user.findUniqueOrThrow({ where: { id } });
    const balance = await tx.creditLedger.aggregate({ where: { userId: id }, _sum: { delta: true } });
    if ((balance._sum.delta ?? 0) + delta < 0) throw new Error("Adjustment would overdraw credits");
    await tx.creditLedger.create({ data: { userId: id, delta, reason: "ADMIN_ADJUSTMENT", actorId: actor.id, note, idempotencyKey: `admin:${key}` } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "CREDIT_ADJUSTED", target: id, meta: { delta, note } } });
  }, { isolationLevel: "Serializable" });
  revalidatePath("/admin/customers");
}
export async function updateStaff(form: FormData) {
  const actor = await requireAdmin(true), id = String(form.get("id")), role = String(form.get("role"));
  if (id === actor.id || !["ADMIN", "SUPER_ADMIN"].includes(role)) throw new Error("Cannot change your own role or assign this role");
  await db.$transaction(async tx => {
    await tx.user.update({ where: { id }, data: { role: role as "ADMIN" | "SUPER_ADMIN" } });
    await tx.session.deleteMany({ where: { userId: id } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "STAFF_ROLE_UPDATED", target: id, meta: { role } } });
  });
  revalidatePath("/admin/settings");
}
export async function updateTicket(form: FormData) {
  const actor = await requireAdmin(), id = String(form.get("id")), status = String(form.get("status"));
  if (!["open", "in_progress", "resolved"].includes(status)) throw new Error("Invalid status");
  await db.$transaction([
    db.supportTicket.update({ where: { id }, data: { status } }),
    db.auditLog.create({ data: { actorId: actor.id, action: "TICKET_UPDATED", target: id, meta: { status } } }),
  ]); revalidatePath("/admin/support");
}

export async function releaseStaleReports() {
  const actor = await requireAdmin(true);
  await db.$transaction(async tx => {
    const stale = await tx.reportRequest.findMany({ where: { status: "FETCHING", updatedAt: { lt: new Date(Date.now() - 600000) }, report: null }, take: 100 });
    for (const request of stale) {
      await tx.reportRequest.update({ where: { id: request.id }, data: { status: "FAILED", lastError: "Timed-out reservation released by Super Admin" } });
      await tx.creditLedger.upsert({ where: { idempotencyKey: `release:${request.id}` }, update: {}, create: { userId: request.userId, reportRequestId: request.id, delta: 1, reason: "RELEASE", idempotencyKey: `release:${request.id}` } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "STALE_REPORT_RELEASED", target: request.id } });
    }
  }, { isolationLevel: "Serializable" });
  revalidatePath("/admin/reports");
}
