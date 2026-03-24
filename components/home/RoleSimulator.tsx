import { UserRole } from "./types";

type RoleSimulatorProps = {
  currentUserRole: UserRole;
  onChange: (role: UserRole) => void;
};

export default function RoleSimulator({
  currentUserRole,
  onChange,
}: RoleSimulatorProps) {
  return (
    <div
      style={{
        marginBottom: 18,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--panel)",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <label
          htmlFor="role-simulator"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--muted-strong)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}
        >
          Role Simulator
        </label>

        <select
          id="role-simulator"
          value={currentUserRole}
          onChange={(e) => onChange(e.target.value as UserRole)}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid var(--input-border)",
            background: "var(--input-bg)",
            color: "var(--foreground)",
            fontWeight: 600,
          }}
        >
          <option value="USER">USER</option>
          <option value="CHAPTER_ADMIN">CHAPTER_ADMIN</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
        </select>
      </div>
    </div>
  );
}