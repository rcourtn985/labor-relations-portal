"use client";

import { useEffect, useState } from "react";
import { ChapterOption } from "../SearchableChapterSelect";
import {
  PublicChaptersResponse,
  SessionMembership,
  ViewerPermissions,
  normalizeValue,
} from "../manageAgreementsPageUtils";

export function useManageAgreementsAccess() {
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [permissions, setPermissions] = useState<ViewerPermissions>({
    isSystemAdmin: false,
    isChapterAdmin: false,
    canManageAgreements: false,
    managedChapterNames: [],
    managedChapterIds: [],
  });

  const [publicChapterOptions, setPublicChapterOptions] = useState<ChapterOption[]>([]);
  const [publicChaptersLoading, setPublicChaptersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPermissions() {
      try {
        const res = await fetch("/api/auth/session");
        const data = (await res.json()) as {
          user?: {
            globalRole?: "SYSTEM_ADMIN" | "STANDARD";
            memberships?: SessionMembership[];
          };
        };

        if (cancelled) return;

        const memberships = (data?.user?.memberships ?? []) as SessionMembership[];
        const isSystemAdmin = data?.user?.globalRole === "SYSTEM_ADMIN";
        const adminMemberships = memberships.filter(
          (membership) => membership.role === "CHAPTER_ADMIN"
        );

        const managedChapterNames = adminMemberships
          .map((membership) => normalizeValue(membership.chapterName))
          .filter(Boolean);

        const managedChapterIds = adminMemberships
          .map((membership) => normalizeValue(membership.chapterId))
          .filter(Boolean);

        setPermissions({
          isSystemAdmin,
          isChapterAdmin: adminMemberships.length > 0,
          canManageAgreements: isSystemAdmin || adminMemberships.length > 0,
          managedChapterNames: [...new Set(managedChapterNames)],
          managedChapterIds: [...new Set(managedChapterIds)],
        });
      } catch {
        if (cancelled) return;

        setPermissions({
          isSystemAdmin: false,
          isChapterAdmin: false,
          canManageAgreements: false,
          managedChapterNames: [],
          managedChapterIds: [],
        });
      } finally {
        if (!cancelled) {
          setPermissionsLoading(false);
        }
      }
    }

    void loadPermissions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPublicChapters() {
      try {
        setPublicChaptersLoading(true);

        const res = await fetch("/api/chapters/public");
        const data = (await res.json()) as PublicChaptersResponse;

        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load chapters.");
        }

        if (!cancelled) {
          setPublicChapterOptions(data.chapters ?? []);
        }
      } catch {
        if (!cancelled) {
          setPublicChapterOptions([]);
        }
      } finally {
        if (!cancelled) {
          setPublicChaptersLoading(false);
        }
      }
    }

    void loadPublicChapters();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    permissionsLoading,
    permissions,
    publicChapterOptions,
    publicChaptersLoading,
  };
}