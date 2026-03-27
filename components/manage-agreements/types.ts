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
