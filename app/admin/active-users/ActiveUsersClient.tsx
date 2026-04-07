"use client";

import { useEffect, useMemo, useState } from "react";

type ChapterOption = {
  id: string;
  name: string;
  code: string | null;
};

type MembershipRole = "CHAPTER_ADMIN" | "USER";
type AccountStatus = "INVITED" | "ACTIVE" | "DENIED" | "DISABLED";
type GlobalRole = "SYSTEM_ADMIN" | "STANDARD";

type UserRow = {
  id: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  globalRole: GlobalRole;
  accountStatus: AccountStatus;
  createdAt: string;
  updatedAt: string;
  memberships: Array<{
    id: string;
    chapterId: string;
    role: MembershipRole;
    isActive: boolean;
    chapter: {
      id: string;
      name: string;
      code: string | null;
    } | null;
  }>;
};

type ActiveUsersResponse = {
  users: UserRow[];
};

type PublicChaptersResponse = {
  chapters?: ChapterOption[];
  error?: string;
};

type StatusFilter = "ALL" | AccountStatus;

type EditableMembership = {
  chapterId: string;
  role: MembershipRole;
};

type ActiveUsersClientProps = {
  refreshVersion: number;
};

function roleLabel(value: MembershipRole) {
  return value === "CHAPTER_ADMIN" ? "Chapter Staff" : "Member Contractor";
}

export default function ActiveUsersClient({
  refreshVersion,
}: ActiveUsersClientProps) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [editGlobalRole, setEditGlobalRole] = useState<GlobalRole>("STANDARD");
  const [editAccountStatus, setEditAccountStatus] =
    useState<AccountStatus>("ACTIVE");
  const [editMemberships, setEditMemberships] = useState<EditableMembership[]>([]);
  const [chapterPicker, setChapterPicker] = useState("");
  const [newMembershipRole, setNewMembershipRole] =
    useState<MembershipRole>("USER");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [usersRes, chaptersRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/chapters/public"),
      ]);

      const usersData = (await usersRes.json()) as ActiveUsersResponse & {
        error?: string;
      };
      const chaptersData = (await chaptersRes.json()) as PublicChaptersResponse;

      if (!usersRes.ok) {
        throw new Error(usersData.error ?? "Failed to load users.");
      }

      if (!chaptersRes.ok) {
        throw new Error(chaptersData.error ?? "Failed to load chapters.");
      }

      setUsers(usersData.users ?? []);
      setChapters(chaptersData.chapters ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load active users.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [refreshVersion]);

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesStatus =
        statusFilter === "ALL" || user.accountStatus === statusFilter;

      const haystack = [
        user.name,
        user.email,
        user.phone ?? "",
        user.globalRole,
        user.accountStatus,
        ...user.memberships.flatMap((membership) => [
          membership.chapter?.name ?? "",
          membership.chapter?.code ?? "",
          membership.role,
        ]),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !needle || haystack.includes(needle);

      return matchesStatus && matchesSearch;
    });
  }, [users, search, statusFilter]);

  const availableChapterOptions = useMemo(() => {
    const assignedIds = new Set(editMemberships.map((membership) => membership.chapterId));
    return chapters.filter((chapter) => !assignedIds.has(chapter.id));
  }, [chapters, editMemberships]);

  const filteredAvailableChapters = useMemo(() => {
    const needle = chapterPicker.trim().toLowerCase();

    if (!needle) return availableChapterOptions.slice(0, 100);

    return availableChapterOptions
      .filter((chapter) =>
        `${chapter.name} ${chapter.code ?? ""}`.toLowerCase().includes(needle)
      )
      .slice(0, 100);
  }, [availableChapterOptions, chapterPicker]);

  function openUser(user: UserRow) {
    setSelectedUser(user);
    setEditGlobalRole(user.globalRole);
    setEditAccountStatus(user.accountStatus);
    setEditMemberships(
      user.memberships.map((membership) => ({
        chapterId: membership.chapterId,
        role: membership.role,
      }))
    );
    setChapterPicker("");
    setNewMembershipRole("USER");
    setSaveError(null);
  }

  function closeUser() {
    if (saving) return;
    setSelectedUser(null);
    setSaveError(null);
    setChapterPicker("");
    setNewMembershipRole("USER");
  }

  function addMembership(chapterId: string) {
    if (!chapterId) return;

    const exists = editMemberships.some(
      (membership) => membership.chapterId === chapterId
    );
    if (exists) return;

    setEditMemberships((current) => [
      ...current,
      {
        chapterId,
        role: newMembershipRole,
      },
    ]);
    setChapterPicker("");
    setNewMembershipRole("USER");
  }

  function removeMembership(chapterId: string) {
    setEditMemberships((current) =>
      current.filter((membership) => membership.chapterId !== chapterId)
    );
  }

  function updateMembershipRole(chapterId: string, role: MembershipRole) {
    setEditMemberships((current) =>
      current.map((membership) =>
        membership.chapterId === chapterId ? { ...membership, role } : membership
      )
    );
  }

  async function saveUser() {
    if (!selectedUser) return;

    try {
      setSaving(true);
      setSaveError(null);

      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(selectedUser.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            globalRole: editGlobalRole,
            accountStatus: editAccountStatus,
            memberships: editMemberships,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to update user.");
      }

      await loadData();
      closeUser();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update user.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 20,
          background: "var(--panel)",
          boxShadow: "var(--shadow-soft)",
          padding: 20,
          display: "grid",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
            Active Users
          </div>
          <div style={{ color: "var(--muted)" }}>
            Review existing users, update chapter assignments, and deactivate or
            reactivate accounts.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "220px minmax(0, 1fr)",
            gap: 12,
          }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              style={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                padding: "12px 14px",
                background: "white",
              }}
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
              <option value="INVITED">Invited</option>
              <option value="DENIED">Denied</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, status, role, or chapter"
              style={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                padding: "12px 14px",
                background: "white",
              }}
            />
          </label>
        </div>

        {error ? (
          <div
            style={{
              borderRadius: 12,
              border: "1px solid rgba(169, 68, 68, 0.25)",
              background: "rgba(169, 68, 68, 0.08)",
              color: "var(--danger)",
              padding: "10px 12px",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            overflowX: "auto",
            border: "1px solid var(--border)",
            borderRadius: 16,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 1100,
            }}
          >
            <thead>
              <tr>
                <th style={{ padding: "12px 14px", textAlign: "left" }}>Name</th>
                <th style={{ padding: "12px 14px", textAlign: "left" }}>Email</th>
                <th style={{ padding: "12px 14px", textAlign: "left" }}>Global Role</th>
                <th style={{ padding: "12px 14px", textAlign: "left" }}>Status</th>
                <th style={{ padding: "12px 14px", textAlign: "left" }}>Chapters</th>
                <th style={{ padding: "12px 14px", textAlign: "left" }}>Updated</th>
                <th style={{ padding: "12px 14px", textAlign: "left" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 18, color: "var(--muted)" }}>
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 18, color: "var(--muted)" }}>
                    No users match the current filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 700 }}>{user.name}</div>
                      {user.phone ? (
                        <div style={{ color: "var(--muted)", fontSize: 13 }}>
                          {user.phone}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: "12px 14px" }}>{user.email}</td>
                    <td style={{ padding: "12px 14px" }}>{user.globalRole}</td>
                    <td style={{ padding: "12px 14px" }}>{user.accountStatus}</td>
                    <td style={{ padding: "12px 14px" }}>
                      {user.memberships.length > 0
                        ? user.memberships
                            .map((membership) =>
                              membership.chapter?.name
                                ? `${membership.chapter.name} (${roleLabel(
                                    membership.role
                                  )})`
                                : roleLabel(membership.role)
                            )
                            .join(", ")
                        : "—"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      {new Date(user.updatedAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <button
                        type="button"
                        onClick={() => openUser(user)}
                        style={{
                          border: "1px solid var(--border)",
                          background: "var(--panel)",
                          borderRadius: 10,
                          padding: "8px 12px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser ? (
        <div
          onClick={closeUser}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(16, 24, 40, 0.28)",
            display: "grid",
            placeItems: "center",
            padding: 24,
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 880,
              borderRadius: 20,
              border: "1px solid var(--border)",
              background: "var(--panel)",
              boxShadow: "var(--shadow-strong)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px 22px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>
                  {selectedUser.name}
                </div>
                <div style={{ color: "var(--muted)", marginTop: 4 }}>
                  {selectedUser.email}
                </div>
              </div>

              <button
                type="button"
                onClick={closeUser}
                disabled={saving}
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--panel)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ padding: 22, display: "grid", gap: 18 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 14,
                }}
              >
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>Global Role</span>
                  <select
                    value={editGlobalRole}
                    onChange={(e) =>
                      setEditGlobalRole(e.target.value as GlobalRole)
                    }
                    style={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      padding: "12px 14px",
                      background: "white",
                    }}
                  >
                    <option value="STANDARD">STANDARD</option>
                    <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>
                    Account Status
                  </span>
                  <select
                    value={editAccountStatus}
                    onChange={(e) =>
                      setEditAccountStatus(e.target.value as AccountStatus)
                    }
                    style={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      padding: "12px 14px",
                      background: "white",
                    }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DISABLED">DISABLED</option>
                    <option value="INVITED">INVITED</option>
                    <option value="DENIED">DENIED</option>
                  </select>
                </label>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontWeight: 700 }}>Chapter Memberships</div>

                {editMemberships.length === 0 ? (
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      background: "var(--panel-strong)",
                      padding: 14,
                      color: "var(--muted)",
                    }}
                  >
                    No active chapter memberships assigned.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {editMemberships.map((membership) => {
                      const chapter = chapters.find(
                        (item) => item.id === membership.chapterId
                      );

                      return (
                        <div
                          key={membership.chapterId}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) 220px 120px",
                            gap: 10,
                            alignItems: "center",
                            border: "1px solid var(--border)",
                            borderRadius: 14,
                            background: "var(--panel-strong)",
                            padding: 14,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700 }}>
                              {chapter?.name ?? membership.chapterId}
                            </div>
                            {chapter?.code ? (
                              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                                {chapter.code}
                              </div>
                            ) : null}
                          </div>

                          <select
                            value={membership.role}
                            onChange={(e) =>
                              updateMembershipRole(
                                membership.chapterId,
                                e.target.value as MembershipRole
                              )
                            }
                            style={{
                              borderRadius: 12,
                              border: "1px solid var(--border)",
                              padding: "12px 14px",
                              background: "white",
                            }}
                          >
                            <option value="USER">USER</option>
                            <option value="CHAPTER_ADMIN">CHAPTER_ADMIN</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => removeMembership(membership.chapterId)}
                            style={{
                              border: "1px solid rgba(169, 68, 68, 0.25)",
                              background: "rgba(169, 68, 68, 0.08)",
                              color: "var(--danger)",
                              borderRadius: 10,
                              padding: "10px 12px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) 220px 120px",
                  gap: 10,
                  alignItems: "end",
                }}
              >
                <label style={{ display: "grid", gap: 6, position: "relative" }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>
                    Add Chapter
                  </span>
                  <input
                    type="text"
                    value={chapterPicker}
                    onChange={(e) => setChapterPicker(e.target.value)}
                    placeholder="Start typing a chapter name"
                    style={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      padding: "12px 14px",
                      background: "white",
                    }}
                  />
                  {chapterPicker ? (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: "100%",
                        marginTop: 6,
                        border: "1px solid var(--border)",
                        borderRadius: 14,
                        background: "var(--panel)",
                        boxShadow: "var(--shadow-strong)",
                        maxHeight: 220,
                        overflowY: "auto",
                        zIndex: 20,
                      }}
                    >
                      {filteredAvailableChapters.length > 0 ? (
                        filteredAvailableChapters.map((chapter) => (
                          <button
                            key={chapter.id}
                            type="button"
                            onClick={() => addMembership(chapter.id)}
                            style={{
                              display: "block",
                              width: "100%",
                              textAlign: "left",
                              padding: "12px 14px",
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              borderBottom:
                                "1px solid rgba(214, 222, 232, 0.5)",
                            }}
                          >
                            <div style={{ fontWeight: 700 }}>{chapter.name}</div>
                            {chapter.code ? (
                              <div
                                style={{ fontSize: 12, color: "var(--muted)" }}
                              >
                                {chapter.code}
                              </div>
                            ) : null}
                          </button>
                        ))
                      ) : (
                        <div
                          style={{
                            padding: "12px 14px",
                            color: "var(--muted)",
                            fontSize: 14,
                          }}
                        >
                          No matching chapters available.
                        </div>
                      )}
                    </div>
                  ) : null}
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>
                    Membership Role
                  </span>
                  <select
                    value={newMembershipRole}
                    onChange={(e) =>
                      setNewMembershipRole(e.target.value as MembershipRole)
                    }
                    style={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      padding: "12px 14px",
                      background: "white",
                    }}
                  >
                    <option value="USER">USER</option>
                    <option value="CHAPTER_ADMIN">CHAPTER_ADMIN</option>
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    const exactMatch = availableChapterOptions.find(
                      (chapter) =>
                        chapter.name.toLowerCase() === chapterPicker.trim().toLowerCase()
                    );
                    if (exactMatch) {
                      addMembership(exactMatch.id);
                    }
                  }}
                  style={{
                    border: "none",
                    background: "var(--brand-gradient)",
                    color: "white",
                    borderRadius: 10,
                    padding: "12px 14px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Add
                </button>
              </div>

              {saveError ? (
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(169, 68, 68, 0.25)",
                    background: "rgba(169, 68, 68, 0.08)",
                    color: "var(--danger)",
                    padding: "10px 12px",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {saveError}
                </div>
              ) : null}
            </div>

            <div
              style={{
                padding: "18px 22px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={closeUser}
                disabled={saving}
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--panel)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveUser}
                disabled={saving}
                style={{
                  border: "none",
                  background: "var(--brand-gradient)",
                  color: "white",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving..." : "Save User"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}