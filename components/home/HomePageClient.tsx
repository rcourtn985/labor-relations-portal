"use client";

import React, { useState } from "react";
import ActiveScopeBar from "./ActiveScopeBar";
import AgreementChatPanel from "./AgreementChatPanel";
import AgreementFilters from "./AgreementFilters";
import HomeHero from "./HomeHero";
import RoleSimulator from "./RoleSimulator";
import {
  ChatRequestBody,
  ChatScopeFilters,
  Msg,
  UserRole,
} from "./types";
import useAgreementFilterOptions from "./useAgreementFilterOptions";
import { summarizeMultiSelect } from "./utils";

export default function HomePageClient() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState<ChatScopeFilters>({
    chapters: [],
    localUnions: [],
    agreementTypes: [],
    states: [],
    includeNationalAgreements: false,
  });

  const [currentUserRole, setCurrentUserRole] =
    useState<UserRole>("CHAPTER_ADMIN");

  const canManageAgreements =
    currentUserRole === "CHAPTER_ADMIN" || currentUserRole === "SUPER_ADMIN";

  const { filterOptions, filterOptionsLoading, filterOptionsError } =
    useAgreementFilterOptions({
      selectedChapters: filters.chapters,
      setFilters,
    });

  async function send() {
    if (!input.trim() || loading) return;

    const nextMessages: Msg[] = [...messages, { role: "user", content: input }];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const requestBody: ChatRequestBody = {
        messages: nextMessages,
        filters,
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.text ?? data.error ?? "(no response)",
        },
      ]);
    } catch {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: "Error calling the server route.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const activeChapterSummary = summarizeMultiSelect(
    filters.chapters,
    filterOptions.chapterOptions,
    "All",
    "chapters selected"
  );

  const activeLocalUnionSummary = summarizeMultiSelect(
    filters.localUnions,
    filterOptions.localUnionOptions,
    "All",
    "locals selected"
  );

  const activeAgreementTypeSummary = summarizeMultiSelect(
    filters.agreementTypes,
    filterOptions.agreementTypeOptions,
    "All",
    "types selected"
  );

  const activeStateSummary = summarizeMultiSelect(
    filters.states,
    filterOptions.stateOptions,
    "All",
    "states selected"
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 24px" }}>
      <RoleSimulator
        currentUserRole={currentUserRole}
        onChange={setCurrentUserRole}
      />

      <HomeHero
        filters={filters}
        setFilters={setFilters}
        canManageAgreements={canManageAgreements}
      />

      <AgreementFilters
        filters={filters}
        setFilters={setFilters}
        filterOptions={filterOptions}
        filterOptionsLoading={filterOptionsLoading}
        filterOptionsError={filterOptionsError}
        currentUserRole={currentUserRole}
      />

      <ActiveScopeBar
        activeChapterSummary={activeChapterSummary}
        activeLocalUnionSummary={activeLocalUnionSummary}
        activeAgreementTypeSummary={activeAgreementTypeSummary}
        activeStateSummary={activeStateSummary}
        includeNationalAgreements={filters.includeNationalAgreements}
      />

      <AgreementChatPanel
        messages={messages}
        input={input}
        loading={loading}
        setInput={setInput}
        onSend={send}
      />
    </div>
  );
}