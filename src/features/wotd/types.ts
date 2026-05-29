export type View = "practice" | "edit" | "settings";
export type EditPage = "words" | "bulk";
export type HiddenField = "word" | "definition";
export type PracticeMark = "known" | "review";
export type PracticeDirection = "word-first" | "definition-first" | "random";
export type SettingsPage = "data" | "synonyms" | "backup";
export type SynonymCategory =
  | "archaic"
  | "literary"
  | "nonstandard"
  | "offensive"
  | "regional"
  | "slang";

export type SavedWord = {
  id: string;
  word: string;
  definition: string;
  definitions?: DefinitionOption[];
  selectedDefinitionIndex?: number;
  partOfSpeech?: string;
  partsOfSpeech?: string[];
  example?: string;
  createdAt: string;
  updatedAt: string;
  seenCount: number;
  knownCount: number;
  reviewCount: number;
  lastPracticedAt?: string;
};

export type DefinitionOption = {
  definition: string;
  partOfSpeech?: string;
  example?: string;
  examples?: ExampleOption[];
  source?: "datamuse" | "wiktapi";
  synonyms?: StoredSynonym[];
};

export type ExampleOption = {
  boldTextOffsets?: Array<[number, number]>;
  ref?: string;
  text: string;
  type?: string;
  year?: number;
};

export type StoredSynonym = string | SynonymOption;

export type SynonymOption = {
  word: string;
  tags: string[];
  categories: SynonymCategory[];
};

export type WiktApiExample = {
  bold_text_offsets?: Array<[number, number]>;
  ref?: string;
  text?: string;
  type?: string;
};

export type WiktApiSynonym = {
  word?: string;
  tags?: string[];
};

export type WiktApiSense = {
  glosses?: string[];
  examples?: Array<string | WiktApiExample>;
  synonyms?: WiktApiSynonym[];
};

export type WiktApiEntry = {
  pos?: string;
  senses?: WiktApiSense[];
  synonyms?: WiktApiSynonym[];
};

export type WiktApiResponse = {
  entries?: WiktApiEntry[];
};

export type DatamuseDefinitionEntry = {
  defs?: string[];
  word?: string;
};

export type DefinitionLookupResult = {
  definition: string;
  definitions: DefinitionOption[];
  example?: string;
  partOfSpeech?: string;
  partsOfSpeech: string[];
};

export type SuggestionEntry = {
  word?: string;
};

export type AppSettings = {
  practiceDirection: PracticeDirection;
  synonymCategories: Record<SynonymCategory, boolean>;
};
