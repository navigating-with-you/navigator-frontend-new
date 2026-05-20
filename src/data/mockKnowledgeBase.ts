// Define a type for knowledge base entry input
type EntryType = "folder" | "file" | "url";

interface Entry {
    name: string;
    type: EntryType;
    folder: string;
    owner: string;
}

const ENTRIES: Entry[] = [];

export interface KnowledgeBaseItem extends Entry {
    id: string;
    createdDate: string;
}

export const MOCK_KB: KnowledgeBaseItem[] = ENTRIES.map((e, i) => ({
    id: `KB${String(i + 1).padStart(4, "0")}`,
    ...e,
    createdDate: "28 April 2026",
}));