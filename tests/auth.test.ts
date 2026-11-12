import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ token: undefined as string | undefined, session: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => mocks.token ? { value: mocks.token } : undefined }) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("../src/lib/server/db", () => ({ db: { session: { findUnique: mocks.session } } }));
import { currentUser, requireAdmin } from "../src/lib/server/auth";
import { digest } from "../src/lib/security";
beforeEach(() => { vi.clearAllMocks(); process.env.DATABASE_URL = "postgresql://test"; mocks.token = "opaque-token"; });
describe("server-side access controls", () => {
  it("rejects missing and expired sessions", async () => {
    mocks.token = undefined; expect(await currentUser()).toBeNull();
    await expect(requireAdmin()).rejects.toThrow("redirect:/account/login");
    mocks.token = "opaque-token"; mocks.session.mockResolvedValue({ expires: new Date(0), user: { role: "ADMIN" } });
    expect(await currentUser()).toBeNull();
    expect(mocks.session).toHaveBeenCalledWith(expect.objectContaining({ where: { sessionToken: digest("opaque-token") } }));
  });
  it("rejects suspended users and non-admins", async () => {
    mocks.session.mockResolvedValue({ expires: new Date(Date.now() + 60000), user: { role: "ADMIN", deletedAt: new Date() } });
    expect(await currentUser()).toBeNull();
    mocks.session.mockResolvedValue({ expires: new Date(Date.now() + 60000), user: { role: "CUSTOMER", deletedAt: null } });
    await expect(requireAdmin()).rejects.toThrow("redirect:/account");
  });
  it("restricts sensitive mutations to Super Admin", async () => {
    mocks.session.mockResolvedValue({ expires: new Date(Date.now() + 60000), user: { role: "ADMIN", deletedAt: null } });
    expect((await requireAdmin()).role).toBe("ADMIN");
    await expect(requireAdmin(true)).rejects.toThrow("Super Admin");
    mocks.session.mockResolvedValue({ expires: new Date(Date.now() + 60000), user: { role: "SUPER_ADMIN", deletedAt: null } });
    expect((await requireAdmin(true)).role).toBe("SUPER_ADMIN");
  });
});
