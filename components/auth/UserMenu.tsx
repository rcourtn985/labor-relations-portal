"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

type UserMenuProps = {
  firstName: string;
};

export default function UserMenu({ firstName }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleSignOut() {
    try {
      setLoggingOut(true);
      await signOut({
        callbackUrl: "/login",
      });
    } catch (error) {
      console.error("Sign out failed:", error);
      setLoggingOut(false);
    }
  }

  return (
    <div ref={rootRef} className="os-user-menu">
      <button
        type="button"
        className="os-user-menu__trigger"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="os-user-menu__avatar" aria-hidden="true">
          {firstName.slice(0, 1).toUpperCase()}
        </div>

        <div className="os-user-menu__identity">
          <div className="os-user-menu__name">{firstName}</div>
          <div className="os-user-menu__meta">Account</div>
        </div>

        <div className="os-user-menu__caret" aria-hidden="true">
          ▾
        </div>
      </button>

      {open ? (
        <div className="os-user-menu__dropdown" role="menu">
          <Link
            href="/profile"
            className="os-user-menu__item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>

          <button
            type="button"
            className="os-user-menu__item os-user-menu__item--danger"
            role="menuitem"
            onClick={handleSignOut}
            disabled={loggingOut}
          >
            {loggingOut ? "Signing out..." : "Log out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}