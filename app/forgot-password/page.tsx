import ForgotPasswordForm from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
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
          Forgot Password
        </h1>
        <p style={{ marginTop: 0, marginBottom: 20, color: "var(--muted)" }}>
          Enter your email address and, if an eligible account exists, a password
          reset link will be generated.
        </p>

        <ForgotPasswordForm />
      </div>
    </div>
  );
}