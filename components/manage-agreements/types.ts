export type KBEntry = {
  id: string;
  name: string;
  vectorStoreId: string;
};

export type KBIndexResponse = {
  central: KBEntry;
  systemKbs?: KBEntry[];
  userKbs: KBEntry[];
};

export type KBFilesResponse = {
  kbId: string;
  kbName: string;
  vectorStoreId: string;
  files: {
    id: string;
    file_id: string;
    filename: string | null;
    created_at: number;
    status: string;
    chapter?: string | null;
    localUnion?: string | null;
    agreementType?: string | null;
    states?: string | null;
    sharedToCbas?: boolean;
    fileUrl?: string | null;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
  }[];
};

export type AgreementRow = {
  id: string;
  agreementName: string;
  chapter: string;
  localUnion: string;
  agreementType: string;
  states: string;
  filename: string;
  uploadedAt: number;
  status: string;
  collectionId: string;
  collectionName: string;
  fileId: string;
  fileUrl: string | null;
  sharedToCbas: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

export type AgreementSort =
  | "uploaded_desc"
  | "uploaded_asc"
  | "name_asc"
  | "name_desc"
  | "chapter_asc"
  | "chapter_desc"
  | "local_union_asc"
  | "local_union_desc"
  | "agreement_type_asc"
  | "agreement_type_desc"
  | "states_asc"
  | "states_desc"
  | "effective_desc"
  | "effective_asc";

export type AgreementListResponse = {
  rows: AgreementRow[];
  totalRows: number;
  filteredRowsCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sort: AgreementSort;
  filterOptions: {
    chapterOptions: { value: string; label: string }[];
    localUnionOptions: { value: string; label: string }[];
    agreementTypeOptions: { value: string; label: string }[];
    stateOptions: { value: string; label: string }[];
  };
};

export type AgreementSearchResponse = {
  query: string;
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sort: AgreementSort;
  results: {
    id: string;
    agreementName: string;
    collectionId: string;
    filename: string;
    uploadedAt: number;
    chapter: string;
    localUnion: string;
    agreementType: string;
    states: string;
    sharedToCbas: boolean;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    snippet?: string;
    extractionState?: string;
    extractedAt?: number | null;
  }[];
};