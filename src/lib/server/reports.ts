import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { historyProvider } from "./providers";
export async function generateReport(userId: string, vin: string, key: string) {
  const provider = await historyProvider();
  if (!provider) return { status: 503, error: "Licensed vehicle history is not available" };
  const request = await db.$transaction(async tx => {
    const existing = await tx.reportRequest.findUnique({ where: { idempotencyKey: `${userId}:${key}` }, include: { report: true } });
    if (existing) {
      if (existing.vin !== vin) throw new Error("Idempotency key belongs to another VIN");
      return existing;
    }
    const balance = await tx.creditLedger.aggregate({ where: { userId }, _sum: { delta: true } });
    if ((balance._sum.delta ?? 0) < 1) throw new Error("No report credits available");
    const created = await tx.reportRequest.create({ data: { userId, vin, idempotencyKey: `${userId}:${key}`, status: "FETCHING", attempts: 1 }, include: { report: true } });
    await tx.creditLedger.create({ data: { userId, delta: -1, reason: "RESERVE", reportRequestId: created.id, idempotencyKey: `reserve:${created.id}` } });
    return created;
  }, { isolationLevel: "Serializable" });
  if (request.report) return { status: 200, reportId: request.report.publicId };
  // Only the transaction that inserted the reservation may call the paid supplier.
  // A unique claim prevents concurrent retries from making duplicate supplier calls.
  const claim = await db.reportRequest.updateMany({ where: { id: request.id, status: "FETCHING", attempts: 1 }, data: { attempts: 2 } });
  if (!claim.count) return { status: request.status === "FAILED" ? 409 : 202, requestId: request.id };
  const started = Date.now();
  let supplierSucceeded = false;
  try {
    const report = await provider.fetchReport(vin, { idempotencyKey: request.id, signal: AbortSignal.timeout(20000) });
    supplierSucceeded = true;
    if (report.vin !== vin || report.provider !== provider.id) throw new Error("Supplier returned mismatched vehicle or source");
    const result = await db.$transaction(async tx => {
      const active = await tx.reportRequest.updateMany({ where: { id: request.id, status: "FETCHING" }, data: { status: "SUCCEEDED" } });
      if (!active.count) throw new Error("Report request was already settled");
      const data = { vin, provider: report.provider, providerReportId: report.providerReportId, sourceAsOf: report.sourceAsOf, sections: report.sections };
      const saved = await tx.report.create({ data: { userId, reportRequestId: request.id, vin, publicId: `VNF-${randomUUID()}`, provider: provider.id, providerReportId: report.providerReportId, sourceAsOf: report.sourceAsOf ? new Date(report.sourceAsOf) : null, data: JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue } });
      await tx.creditLedger.create({ data: { userId, delta: 0, reason: "CONSUME", reportRequestId: request.id, idempotencyKey: `consume:${request.id}` } });
      await tx.supplierRequest.create({ data: { reportRequestId: request.id, provider: provider.id, attempt: 1, success: true, billable: true, costCents: provider.costCents, latencyMs: Date.now() - started } });
      await tx.apiUsage.create({ data: { provider: provider.id, operation: "history_report", success: true, costCents: provider.costCents, latencyMs: Date.now() - started } });
      return saved;
    });
    return { status: 200, reportId: result.publicId };
  } catch (error) {
    const billable = supplierSucceeded || !!(error && typeof error === "object" && "billable" in error && error.billable === true);
    const saved = await db.report.findUnique({ where: { reportRequestId: request.id } });
    if (saved) return { status: 200, reportId: saved.publicId };
    await db.$transaction(async tx => {
      const active = await tx.reportRequest.updateMany({ where: { id: request.id, status: "FETCHING" }, data: { status: "FAILED" } });
      if (!active.count) return;
      await tx.reportRequest.update({ where: { id: request.id }, data: { status: "FAILED", lastError: "Supplier request failed; credit released" } });
      await tx.creditLedger.upsert({ where: { idempotencyKey: `release:${request.id}` }, update: {}, create: { userId, delta: 1, reason: "RELEASE", reportRequestId: request.id, idempotencyKey: `release:${request.id}` } });
      await tx.supplierRequest.create({ data: { reportRequestId: request.id, provider: provider.id, attempt: 1, success: false, billable, costCents: billable ? provider.costCents : 0, latencyMs: Date.now() - started, error: "Supplier request failed" } });
      await tx.apiUsage.create({ data: { provider: provider.id, operation: "history_report", success: false, costCents: billable ? provider.costCents : 0, latencyMs: Date.now() - started } });
    });
    return { status: 502, error: "Report unavailable. Your credit was returned." };
  }
}
