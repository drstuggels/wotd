import { categoryPenalty, defaultSynonymCategories } from "./constants";
import type {
  AppSettings,
  DefinitionLookupResult,
  DefinitionOption,
  ExampleOption,
  HiddenField,
  PracticeDirection,
  SavedWord,
  StoredSynonym,
  SynonymCategory,
  SynonymOption,
  WiktApiExample,
  WiktApiSynonym,
} from "./types";

export function normalizeWord(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeTag(value: string) {
  return normalizeWord(value).replace(/\s+/g, "-");
}

export function parseWordList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n\r;|/\\]+/)
        .map(normalizeWord)
        .filter(Boolean),
    ),
  );
}

export function getSynonymCategories(tags: string[]) {
  const normalizedTags = tags.map(normalizeTag);
  const categories = new Set<SynonymCategory>();

  if (
    normalizedTags.some((tag) =>
      [
        "multicultural-london-english",
        "slang",
      ].includes(tag),
    )
  ) {
    categories.add("slang");
  }

  if (
    normalizedTags.some((tag) =>
      [
        "australia",
        "britain",
        "canada",
        "dialectal",
        "india",
        "jamaica",
        "new-zealand",
        "regional",
        "uk",
        "us",
      ].includes(tag),
    )
  ) {
    categories.add("regional");
  }

  if (
    normalizedTags.some((tag) =>
      ["archaic", "dated", "obsolete"].includes(tag),
    )
  ) {
    categories.add("archaic");
  }

  if (normalizedTags.some((tag) => ["literary", "poetic"].includes(tag))) {
    categories.add("literary");
  }

  if (normalizedTags.some((tag) => ["nonstandard", "uncommon"].includes(tag))) {
    categories.add("nonstandard");
  }

  if (
    normalizedTags.some((tag) =>
      ["ethnic", "slur", "vulgar"].includes(tag),
    )
  ) {
    categories.add("offensive");
  }

  return Array.from(categories);
}

export function synonymScore(synonym: SynonymOption) {
  const categoryScore = synonym.categories.reduce(
    (total, category) => total + categoryPenalty[category],
    0,
  );

  return (
    categoryScore +
    synonym.tags.length * 4 +
    (synonym.word.includes(" ") ? 8 : 0) +
    synonym.word.length / 10
  );
}

export function normalizeSynonym(synonym: StoredSynonym): SynonymOption | null {
  if (typeof synonym === "string") {
    const word = normalizeWord(synonym);

    return word ? { word, tags: [], categories: [] } : null;
  }

  const word = normalizeWord(synonym.word);
  if (!word) {
    return null;
  }

  const tags = Array.from(
    new Set((synonym.tags ?? []).map((tag) => tag.trim()).filter(Boolean)),
  );
  return {
    word,
    tags,
    categories: getSynonymCategories(tags),
  };
}

export function getSortedSynonyms(synonyms: StoredSynonym[] = []) {
  const deduped = new Map<string, SynonymOption>();

  for (const synonym of synonyms) {
    const normalized = normalizeSynonym(synonym);
    if (!normalized) {
      continue;
    }

    const existing = deduped.get(normalized.word);
    if (existing) {
      const tags = Array.from(new Set([...existing.tags, ...normalized.tags]));
      const categories = Array.from(
        new Set([...existing.categories, ...normalized.categories]),
      );
      deduped.set(normalized.word, {
        ...existing,
        tags,
        categories,
      });
      continue;
    }

    deduped.set(normalized.word, normalized);
  }

  return Array.from(deduped.values()).sort((a, b) => {
    const score = synonymScore(a) - synonymScore(b);

    if (score !== 0) {
      return score;
    }

    return a.word.localeCompare(b.word);
  });
}

export function getVisibleSynonyms(
  synonyms: StoredSynonym[] = [],
  settings: AppSettings,
) {
  const sortedSynonyms = getSortedSynonyms(synonyms);
  const defaultSynonyms = sortedSynonyms.filter(
    (synonym) => !synonym.categories.length,
  );
  const enabledTaggedSynonyms = sortedSynonyms.filter(
    (synonym) =>
      synonym.categories.length &&
      synonym.categories.some(
        (category) => settings.synonymCategories[category],
      ),
  );

  return [
    ...defaultSynonyms.slice(0, 12),
    ...enabledTaggedSynonyms.slice(0, 36),
  ];
}

export function getAllSynonyms(synonyms: StoredSynonym[] = []) {
  return getSortedSynonyms(synonyms);
}

export function getSynonymsFromApi(synonyms: WiktApiSynonym[], word: string) {
  return getSortedSynonyms(
    synonyms.flatMap((synonym) => {
      const text = normalizeWord(synonym.word ?? "");

      if (!text || text === normalizeWord(word)) {
        return [];
      }

      const tags = (synonym.tags ?? [])
        .map((tag) => tag.trim())
        .filter(Boolean);

      return [
        {
          word: text,
          tags,
          categories: getSynonymCategories(tags),
        },
      ];
    }),
  );
}

export function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function isSavedWord(value: unknown): value is SavedWord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const word = value as Partial<SavedWord>;
  return (
    typeof word.id === "string" &&
    typeof word.word === "string" &&
    typeof word.definition === "string" &&
    typeof word.createdAt === "string" &&
    typeof word.updatedAt === "string" &&
    typeof word.seenCount === "number" &&
    typeof word.knownCount === "number" &&
    typeof word.reviewCount === "number"
  );
}

export function isAppSettings(value: unknown): value is AppSettings {
  if (!value || typeof value !== "object") {
    return false;
  }

  const settings = value as Partial<AppSettings>;
  return (
    settings.practiceDirection === "word-first" ||
    settings.practiceDirection === "definition-first" ||
    settings.practiceDirection === "random"
  );
}

export function getSavedSynonymCategories(value: unknown) {
  if (!value || typeof value !== "object") {
    return defaultSynonymCategories;
  }

  const settings = value as Partial<AppSettings>;
  return {
    ...defaultSynonymCategories,
    ...(settings.synonymCategories ?? {}),
  };
}

export function getExampleYear(ref?: string) {
  const match = ref?.match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/);
  return match ? Number(match[1]) : undefined;
}

export function getExampleText(example: string | WiktApiExample) {
  return typeof example === "string" ? example : example.text?.trim() ?? "";
}

export function getSortedExamples(examples: Array<string | WiktApiExample> = []) {
  const normalizedExamples: ExampleOption[] = examples
    .flatMap((example) => {
      const text = getExampleText(example);

      if (!text) {
        return [];
      }

      if (typeof example === "string") {
        return [{ text }];
      }

      return [
        {
          boldTextOffsets: example.bold_text_offsets,
          ref: example.ref,
          text,
          type: example.type,
          year: getExampleYear(example.ref),
        },
      ];
    });

  return normalizedExamples.sort((a, b) => {
      const aYear = a.year ?? 0;
      const bYear = b.year ?? 0;

      if (aYear !== bYear) {
        return bYear - aYear;
      }

      return a.text.length - b.text.length;
    });
}

export function formatDate(value?: string) {
  if (!value) {
    return "not practiced";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function createSavedWord(
  word: string,
  result: DefinitionLookupResult,
): SavedWord {
  const now = new Date().toISOString();

  return {
    id: newId(),
    word,
    definition: result.definition,
    definitions: result.definitions,
    selectedDefinitionIndex: 0,
    partOfSpeech: result.partOfSpeech,
    partsOfSpeech: result.partsOfSpeech,
    example: result.example,
    createdAt: now,
    updatedAt: now,
    seenCount: 0,
    knownCount: 0,
    reviewCount: 0,
  };
}

export function getHiddenField(direction: PracticeDirection): HiddenField {
  if (direction === "definition-first") {
    return "word";
  }

  if (direction === "random") {
    return Math.random() > 0.5 ? "word" : "definition";
  }

  return "definition";
}

export function directionLabel(direction: PracticeDirection) {
  if (direction === "definition-first") {
    return "definition first";
  }

  if (direction === "random") {
    return "random";
  }

  return "word first";
}

export function getDefinitionOptions(word?: SavedWord | null) {
  if (!word) {
    return [];
  }

  if (word.definitions?.length) {
    return word.definitions;
  }

  const legacyDefinition: DefinitionOption = {
      definition: word.definition,
      example: word.example,
      examples: word.example ? [{ text: word.example }] : [],
      partOfSpeech: word.partOfSpeech,
      source: "wiktapi",
      synonyms: [],
  };

  return [legacyDefinition];
}

export function getDefinitionIndex(word?: SavedWord | null) {
  const definitions = getDefinitionOptions(word);

  if (!word || !definitions.length) {
    return 0;
  }

  return Math.min(
    Math.max(word.selectedDefinitionIndex ?? 0, 0),
    definitions.length - 1,
  );
}

export function getActiveDefinition(word?: SavedWord | null) {
  const definitions = getDefinitionOptions(word);
  return definitions[getDefinitionIndex(word)];
}

export function formatPartsOfSpeech(word?: SavedWord | null) {
  if (!word) {
    return "";
  }

  const activeDefinition = getActiveDefinition(word);
  const partsOfSpeech = activeDefinition?.partOfSpeech
    ? [activeDefinition.partOfSpeech]
    : word.partsOfSpeech?.length
      ? word.partsOfSpeech
      : [word.partOfSpeech ?? ""];

  return partsOfSpeech.filter(Boolean).join(", ");
}

export function formatDefinitionSource(definition?: DefinitionOption | null) {
  if (definition?.source === "datamuse") {
    return "source: datamuse";
  }

  return "source: wiktapi";
}

export function getDefinitionExamples(definition?: DefinitionOption | null) {
  if (!definition) {
    return [];
  }

  if (definition.examples?.length) {
    return definition.examples;
  }

  return definition.example ? [{ text: definition.example }] : [];
}
