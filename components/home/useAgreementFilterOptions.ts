"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatScopeFilters, FilterOptionsResponse } from "./types";
import { arraysEqual } from "./utils";

type UseAgreementFilterOptionsArgs = {
  selectedChapters: ChatScopeFilters["chapters"];
  setFilters: React.Dispatch<React.SetStateAction<ChatScopeFilters>>;
};

type UseAgreementFilterOptionsResult = {
  filterOptions: FilterOptionsResponse;
  filterOptionsLoading: boolean;
  filterOptionsError: string | null;
  reloadFilterOptions: () => Promise<void>;
};

export default function useAgreementFilterOptions({
  selectedChapters,
  setFilters,
}: UseAgreementFilterOptionsArgs): UseAgreementFilterOptionsResult {
  const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse>({
    chapterOptions: [],
    localUnionOptions: [],
    agreementTypeOptions: [],
    stateOptions: [],
  });

  const [filterOptionsLoading, setFilterOptionsLoading] = useState(true);
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null);

  const normalizedSelectedChapters = useMemo(
    () => [...selectedChapters].sort(),
    [selectedChapters]
  );

  const loadFilterOptions = useCallback(async () => {
    setFilterOptionsLoading(true);
    setFilterOptionsError(null);

    try {
      const params = new URLSearchParams();

      for (const chapter of normalizedSelectedChapters) {
        params.append("chapters", chapter);
      }

      const queryString = params.toString();
      const url = queryString
        ? `/api/chat/filter-options?${queryString}`
        : "/api/chat/filter-options";

      const res = await fetch(url, { cache: "no-store" });

      if (!res.ok) {
        throw new Error(`Failed to load filter options (${res.status})`);
      }

      const data: FilterOptionsResponse = await res.json();

      setFilterOptions({
        chapterOptions: data.chapterOptions ?? [],
        localUnionOptions: data.localUnionOptions ?? [],
        agreementTypeOptions: data.agreementTypeOptions ?? [],
        stateOptions: data.stateOptions ?? [],
      });

      setFilters((current) => {
        const validChapterValues = new Set(
          (data.chapterOptions ?? []).map((option) => option.value)
        );
        const validLocalUnionValues = new Set(
          (data.localUnionOptions ?? []).map((option) => option.value)
        );
        const validAgreementTypeValues = new Set(
          (data.agreementTypeOptions ?? []).map((option) => option.value)
        );
        const validStateValues = new Set(
          (data.stateOptions ?? []).map((option) => option.value)
        );

        const nextChapters = current.chapters.filter((value) =>
          validChapterValues.has(value)
        );
        const nextLocalUnions = current.localUnions.filter((value) =>
          validLocalUnionValues.has(value)
        );
        const nextAgreementTypes = current.agreementTypes.filter((value) =>
          validAgreementTypeValues.has(value)
        );
        const nextStates = current.states.filter((value) => validStateValues.has(value));

        const unchanged =
          arraysEqual(nextChapters, current.chapters) &&
          arraysEqual(nextLocalUnions, current.localUnions) &&
          arraysEqual(nextAgreementTypes, current.agreementTypes) &&
          arraysEqual(nextStates, current.states);

        if (unchanged) {
          return current;
        }

        return {
          ...current,
          chapters: nextChapters,
          localUnions: nextLocalUnions,
          agreementTypes: nextAgreementTypes,
          states: nextStates,
        };
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load agreement filters.";

      setFilterOptionsError(message);
    } finally {
      setFilterOptionsLoading(false);
    }
  }, [normalizedSelectedChapters, setFilters]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    function handleWindowFocus() {
      loadFilterOptions();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadFilterOptions();
      }
    }

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadFilterOptions]);

  return {
    filterOptions,
    filterOptionsLoading,
    filterOptionsError,
    reloadFilterOptions: loadFilterOptions,
  };
}