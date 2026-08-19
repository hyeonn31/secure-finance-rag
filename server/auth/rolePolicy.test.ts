import { describe, expect, it } from "vitest";
import { shouldBootstrapAdmin, validateRoleChange } from "./rolePolicy";

describe("role policy", () => {
  it("bootstraps only the configured project owner", () => {
    expect(shouldBootstrapAdmin("owner-1", "owner-1")).toBe(true);
    expect(shouldBootstrapAdmin("member-2", "owner-1")).toBe(false);
    expect(shouldBootstrapAdmin("owner-1", "")).toBe(false);
  });

  it("requires an admin and protects the final administrator", () => {
    expect(validateRoleChange({ actorRole: "user", actorId: 2, targetId: 3, targetRole: "user", nextRole: "admin", adminCount: 1 })).toContain("관리자만");
    expect(validateRoleChange({ actorRole: "admin", actorId: 2, targetId: 2, targetRole: "admin", nextRole: "user", adminCount: 2 })).toContain("현재 로그인");
    expect(validateRoleChange({ actorRole: "admin", actorId: 2, targetId: 3, targetRole: "admin", nextRole: "user", adminCount: 1 })).toContain("마지막 관리자");
    expect(validateRoleChange({ actorRole: "admin", actorId: 2, targetId: 3, targetRole: "user", nextRole: "admin", adminCount: 1 })).toBeNull();
  });
});
