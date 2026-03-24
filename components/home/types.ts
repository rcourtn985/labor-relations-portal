export type Msg = {
  role: "user" | "assistant";
  content: string;
};

export type FilterOption = {
  value: string;
  label: string;
};

export type ChatScopeFilters = {
  chapters: string[];
  localUnions: string[];
  agreementTypes: string[];
  states: string[];
  includeNationalAgreements: boolean;
};

export type ChatRequestBody = {
  kbId?: string;
  messages: Msg[];
  filters: ChatScopeFilters;
};

export type FilterOptionsResponse = {
  chapterOptions: FilterOption[];
  localUnionOptions: FilterOption[];
  agreementTypeOptions: FilterOption[];
  stateOptions: FilterOption[];
};

export type UserRole = "USER" | "CHAPTER_ADMIN" | "SUPER_ADMIN";