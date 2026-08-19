export type ManagedRole = "admin" | "user";

export function shouldBootstrapAdmin(openId: string, ownerOpenId: string) {
  return Boolean(ownerOpenId) && openId === ownerOpenId;
}

export function validateRoleChange(input: { actorRole: ManagedRole; actorId: number; targetId: number; targetRole: ManagedRole; nextRole: ManagedRole; adminCount: number }) {
  if (input.actorRole !== "admin") return "사용자 권한 관리는 관리자만 변경할 수 있습니다.";
  if (input.actorId === input.targetId) return "현재 로그인한 계정의 역할은 이 화면에서 변경할 수 없습니다.";
  if (input.targetRole === "admin" && input.nextRole === "user" && input.adminCount <= 1) return "마지막 관리자 계정은 일반 사용자로 변경할 수 없습니다.";
  return null;
}
