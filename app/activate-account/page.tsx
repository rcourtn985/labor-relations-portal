import ActivateAccountForm from "./ActivateAccountForm";

type ActivateAccountPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function ActivateAccountPage({
  searchParams,
}: ActivateAccountPageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token.trim() : "";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "var(--background)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          border: "1px solid var(--border)",
          borderRadius: 20,
          background: "var(--panel)",
          boxShadow: "var(--shadow-soft)",
          padding: 24,
        }}
      >
        <h1 style={{ margin: 0, marginBottom: 8, fontSize: 28 }}>
          Create Password
        </h1>
        <p style={{ marginTop: 0, marginBottom: 20, color: "var(--muted)" }}>
          Set your password to activate your account and sign in to the portal.
        </p>

        <ActivateAccountForm token={token} />
      </div>
    </div>
  );
}