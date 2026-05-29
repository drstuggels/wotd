"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type View = "practice" | "edit" | "settings";
type EditPage = "words" | "bulk";
type HiddenField = "word" | "definition";
type PracticeMark = "known" | "review";
type PracticeDirection = "word-first" | "definition-first" | "random";
type SettingsPage = "data" | "synonyms" | "backup";
type SynonymCategory =
  | "archaic"
  | "literary"
  | "nonstandard"
  | "offensive"
  | "regional"
  | "slang";

type SavedWord = {
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

type DefinitionOption = {
  definition: string;
  partOfSpeech?: string;
  example?: string;
  examples?: ExampleOption[];
  source?: "datamuse" | "wiktapi";
  synonyms?: StoredSynonym[];
};

type ExampleOption = {
  boldTextOffsets?: Array<[number, number]>;
  ref?: string;
  text: string;
  type?: string;
  year?: number;
};

type StoredSynonym = string | SynonymOption;

type SynonymOption = {
  word: string;
  tags: string[];
  categories: SynonymCategory[];
};

type WiktApiExample = {
  bold_text_offsets?: Array<[number, number]>;
  ref?: string;
  text?: string;
  type?: string;
};

type WiktApiSynonym = {
  word?: string;
  tags?: string[];
};

type WiktApiSense = {
  glosses?: string[];
  examples?: Array<string | WiktApiExample>;
  synonyms?: WiktApiSynonym[];
};

type WiktApiEntry = {
  pos?: string;
  senses?: WiktApiSense[];
  synonyms?: WiktApiSynonym[];
};

type WiktApiResponse = {
  entries?: WiktApiEntry[];
};

type DatamuseDefinitionEntry = {
  defs?: string[];
  score?: number;
  tags?: string[];
  word?: string;
};

type DefinitionLookupResult = {
  definition: string;
  definitions: DefinitionOption[];
  example?: string;
  partOfSpeech?: string;
  partsOfSpeech: string[];
};

type SuggestionEntry = {
  word?: string;
};

type AppSettings = {
  practiceDirection: PracticeDirection;
  synonymCategories: Record<SynonymCategory, boolean>;
};

const STORAGE_KEY = "wotd:v1";
const SETTINGS_KEY = "wotd:settings:v1";
const views: View[] = ["practice", "edit", "settings"];
const editPages: EditPage[] = ["words", "bulk"];
const practiceDirections: PracticeDirection[] = [
  "word-first",
  "definition-first",
  "random",
];
const settingsPages: SettingsPage[] = ["data", "synonyms", "backup"];
const synonymCategories: Array<{
  category: SynonymCategory;
  description: string;
  label: string;
}> = [
  {
    category: "slang",
    description: "Casual, informal, or community-specific terms.",
    label: "slang",
  },
  {
    category: "regional",
    description: "Country, dialect, and regional variants.",
    label: "regional",
  },
  {
    category: "archaic",
    description: "Old, obsolete, dated, or rarely current words.",
    label: "archaic",
  },
  {
    category: "literary",
    description: "Literary or poetic alternatives.",
    label: "literary",
  },
  {
    category: "nonstandard",
    description: "Uncommon or nonstandard forms.",
    label: "nonstandard",
  },
  {
    category: "offensive",
    description: "Vulgar, slur-tagged, or sensitive terms.",
    label: "offensive",
  },
];
const defaultSynonymCategories: Record<SynonymCategory, boolean> = {
  archaic: false,
  literary: false,
  nonstandard: false,
  offensive: false,
  regional: false,
  slang: false,
};
const categoryPenalty: Record<SynonymCategory, number> = {
  offensive: 100,
  nonstandard: 60,
  archaic: 50,
  slang: 40,
  regional: 30,
  literary: 20,
};

function normalizeWord(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeTag(value: string) {
  return normalizeWord(value).replace(/\s+/g, "-");
}

function parseWordList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n\r;|/\\]+/)
        .map(normalizeWord)
        .filter(Boolean),
    ),
  );
}

function getSynonymCategories(tags: string[]) {
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

function synonymScore(synonym: SynonymOption) {
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

function normalizeSynonym(synonym: StoredSynonym): SynonymOption | null {
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

function getSortedSynonyms(synonyms: StoredSynonym[] = []) {
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

function getVisibleSynonyms(
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

function getAllSynonyms(synonyms: StoredSynonym[] = []) {
  return getSortedSynonyms(synonyms);
}

function getSynonymsFromApi(synonyms: WiktApiSynonym[], word: string) {
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

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isSavedWord(value: unknown): value is SavedWord {
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

function isAppSettings(value: unknown): value is AppSettings {
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

function getSavedSynonymCategories(value: unknown) {
  if (!value || typeof value !== "object") {
    return defaultSynonymCategories;
  }

  const settings = value as Partial<AppSettings>;
  return {
    ...defaultSynonymCategories,
    ...(settings.synonymCategories ?? {}),
  };
}

function getExampleYear(ref?: string) {
  const match = ref?.match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/);
  return match ? Number(match[1]) : undefined;
}

function getExampleText(example: string | WiktApiExample) {
  return typeof example === "string" ? example : example.text?.trim() ?? "";
}

function getSortedExamples(examples: Array<string | WiktApiExample> = []) {
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

function parseDatamuseDefinition(rawDefinition: string): DefinitionOption | null {
  const [partOfSpeech, ...definitionParts] = rawDefinition.split("\t");
  const definition = definitionParts.join("\t").trim();

  if (!definition) {
    return null;
  }

  return {
    definition,
    partOfSpeech: normalizeWord(partOfSpeech),
    source: "datamuse",
    synonyms: [],
  };
}

async function fetchDatamuseDefinition(
  word: string,
): Promise<DefinitionLookupResult> {
  const response = await fetch(
    `https://api.datamuse.com/words?sp=${encodeURIComponent(
      word,
    )}&qe=sp&md=d&max=5`,
  );

  if (!response.ok) {
    throw new Error("No definition found.");
  }

  const entries = (await response.json()) as DatamuseDefinitionEntry[];
  const exactEntry =
    entries.find((entry) => normalizeWord(entry.word ?? "") === word) ??
    entries.find((entry) => normalizeWord(entry.word ?? "") === normalizeWord(word));
  const definitions = (exactEntry?.defs ?? [])
    .flatMap((definition) => {
      const parsedDefinition = parseDatamuseDefinition(definition);
      return parsedDefinition ? [parsedDefinition] : [];
    })
    .filter(
      (definition, index, allDefinitions) =>
        allDefinitions.findIndex(
          (candidate) => candidate.definition === definition.definition,
        ) === index,
    );
  const match = definitions[0];

  if (!match) {
    throw new Error("No definition found.");
  }

  const partsOfSpeech = Array.from(
    new Set(
      definitions
        .map((definition) => normalizeWord(definition.partOfSpeech ?? ""))
        .filter(Boolean),
    ),
  );

  return {
    definition: match.definition,
    definitions,
    example: match.example,
    partOfSpeech: match.partOfSpeech,
    partsOfSpeech,
  };
}

async function fetchWiktApiDefinition(
  word: string,
): Promise<DefinitionLookupResult> {
  const response = await fetch(
    `https://api.wiktapi.dev/v1/en/word/${encodeURIComponent(
      word,
    )}?lang=en`,
  );

  if (!response.ok) {
    throw new Error("No definition found.");
  }

  const entries = (await response.json()) as WiktApiResponse;
  const definitions: DefinitionOption[] = (entries.entries ?? [])
    .flatMap((entry) =>
      (entry.senses ?? []).flatMap((sense) =>
        (sense.glosses ?? []).flatMap((gloss) => {
          const text = gloss.trim();

          if (!text) {
            return [];
          }

          const examples = getSortedExamples(sense.examples);
          const example = examples[0]?.text;
          const synonyms = getSynonymsFromApi(
            [...(sense.synonyms ?? []), ...(entry.synonyms ?? [])],
            word,
          );

          const definitionOption: DefinitionOption = {
            definition: text,
            example,
            examples,
            partOfSpeech: entry.pos,
            source: "wiktapi",
            synonyms,
          };

          return [definitionOption];
        }),
      ),
    )
    .filter(
      (definition, index, allDefinitions) =>
        allDefinitions.findIndex(
          (candidate) => candidate.definition === definition.definition,
        ) === index,
    );
  const partsOfSpeech = Array.from(
    new Set(
      definitions
        .map((definition) => normalizeWord(definition.partOfSpeech ?? ""))
        .filter(Boolean),
    ),
  );
  const match = definitions[0];

  if (!match) {
    throw new Error("No definition found.");
  }

  return {
    definition: match.definition,
    definitions,
    example: match.example,
    partOfSpeech: match.partOfSpeech,
    partsOfSpeech,
  };
}

async function fetchDefinition(word: string): Promise<DefinitionLookupResult> {
  const normalizedWord = normalizeWord(word);

  try {
    return await fetchWiktApiDefinition(normalizedWord);
  } catch (error) {
    if (!normalizedWord.includes(" ")) {
      throw error;
    }

    return fetchDatamuseDefinition(normalizedWord);
  }
}

async function fetchSuggestions(query: string) {
  const response = await fetch(
    `https://api.datamuse.com/sug?s=${encodeURIComponent(query)}&max=6`,
  );

  if (!response.ok) {
    return [];
  }

  const entries = (await response.json()) as SuggestionEntry[];
  return entries
    .map((entry) => normalizeWord(entry.word ?? ""))
    .filter(Boolean)
    .slice(0, 6);
}

function formatDate(value?: string) {
  if (!value) {
    return "not practiced";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function createSavedWord(
  word: string,
  result: Awaited<ReturnType<typeof fetchDefinition>>,
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

function getHiddenField(direction: PracticeDirection): HiddenField {
  if (direction === "definition-first") {
    return "word";
  }

  if (direction === "random") {
    return Math.random() > 0.5 ? "word" : "definition";
  }

  return "definition";
}

function directionLabel(direction: PracticeDirection) {
  if (direction === "definition-first") {
    return "definition first";
  }

  if (direction === "random") {
    return "random";
  }

  return "word first";
}

function getDefinitionOptions(word?: SavedWord) {
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

function getDefinitionIndex(word?: SavedWord) {
  const definitions = getDefinitionOptions(word);

  if (!word || !definitions.length) {
    return 0;
  }

  return Math.min(
    Math.max(word.selectedDefinitionIndex ?? 0, 0),
    definitions.length - 1,
  );
}

function getActiveDefinition(word?: SavedWord) {
  const definitions = getDefinitionOptions(word);
  return definitions[getDefinitionIndex(word)];
}

function formatPartsOfSpeech(word?: SavedWord) {
  if (!word) {
    return "definition";
  }

  const activeDefinition = getActiveDefinition(word);
  const partsOfSpeech = activeDefinition?.partOfSpeech
    ? [activeDefinition.partOfSpeech]
    : word.partsOfSpeech?.length
      ? word.partsOfSpeech
      : [word.partOfSpeech ?? "definition"];

  return partsOfSpeech.filter(Boolean).join(", ");
}

function formatDefinitionSource(definition?: DefinitionOption | null) {
  if (definition?.source === "datamuse") {
    return "source: datamuse";
  }

  return "source: wiktapi";
}

function getDefinitionExamples(definition?: DefinitionOption | null) {
  if (!definition) {
    return [];
  }

  if (definition.examples?.length) {
    return definition.examples;
  }

  return definition.example ? [{ text: definition.example }] : [];
}

function formatExampleRef(ref?: string) {
  if (!ref) {
    return "";
  }

  return ref
    .replace(/→[A-Z]+/g, "")
    .replace(/\s+/g, " ")
    .replace(/:\s*$/, "")
    .trim();
}

function renderExampleText(example: ExampleOption) {
  const offsets = (example.boldTextOffsets ?? [])
    .filter(([start, end]) => start >= 0 && end > start && end <= example.text.length)
    .sort((a, b) => a[0] - b[0]);

  if (!offsets.length) {
    return example.text;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const [index, [start, end]] of offsets.entries()) {
    if (start > cursor) {
      parts.push(example.text.slice(cursor, start));
    }

    parts.push(
      <strong className="font-black" key={`${start}-${end}-${index}`}>
        {example.text.slice(start, end)}
      </strong>,
    );
    cursor = end;
  }

  if (cursor < example.text.length) {
    parts.push(example.text.slice(cursor));
  }

  return parts;
}

function ExampleBrowser({ examples }: { examples: ExampleOption[] }) {
  const [index, setIndex] = useState(0);

  if (!examples.length) {
    return null;
  }

  const safeIndex = Math.min(index, examples.length - 1);
  const example = examples[safeIndex];

  function move(direction: -1 | 1) {
    setIndex((current) => {
      const nextIndex =
        (((current + direction) % examples.length) + examples.length) %
        examples.length;

      return nextIndex;
    });
  }

  return (
    <div className="border-4 border-black bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs uppercase">examples</p>
        <p className="font-mono text-[10px] uppercase text-neutral-600">
          {[example.year, example.type].filter(Boolean).join(" · ")}
        </p>
      </div>
      <p className="mt-2 font-mono text-sm leading-relaxed">
        {renderExampleText(example)}
      </p>
      {example.ref && (
        <p className="mt-3 line-clamp-2 font-mono text-[10px] uppercase text-neutral-600">
          {formatExampleRef(example.ref)}
        </p>
      )}
      {!example.ref && !example.type && examples.length === 1 && (
        <p className="mt-3 font-mono text-[10px] uppercase text-neutral-600">
          Refetch definitions for source metadata.
        </p>
      )}
      {examples.length > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            aria-label="Previous example"
            className="border-2 border-black bg-white px-2 py-1 font-mono text-xs font-black uppercase hover:bg-lime-200 focus:bg-lime-200"
            onClick={() => move(-1)}
            type="button"
          >
            ←
          </button>
          <div className="flex flex-wrap justify-center gap-1">
            {examples.map((item, dotIndex) => (
              <button
                aria-label={`Show example ${dotIndex + 1}`}
                className={`h-2.5 w-2.5 border-2 border-black ${
                  dotIndex === safeIndex ? "bg-black" : "bg-white"
                }`}
                key={`${item.text.slice(0, 16)}-${dotIndex}`}
                onClick={() => setIndex(dotIndex)}
                type="button"
              />
            ))}
          </div>
          <button
            aria-label="Next example"
            className="border-2 border-black bg-white px-2 py-1 font-mono text-xs font-black uppercase hover:bg-lime-200 focus:bg-lime-200"
            onClick={() => move(1)}
            type="button"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("practice");
  const [editPage, setEditPage] = useState<EditPage>("words");
  const [settingsPage, setSettingsPage] = useState<SettingsPage>("data");
  const [words, setWords] = useState<SavedWord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [bulkWords, setBulkWords] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceDirection, setPracticeDirection] =
    useState<PracticeDirection>("word-first");
  const [synonymCategorySettings, setSynonymCategorySettings] = useState(
    defaultSynonymCategories,
  );
  const [hiddenField, setHiddenField] = useState<HiddenField>("definition");
  const [isRevealed, setIsRevealed] = useState(false);
  const [previewDefinitionIndices, setPreviewDefinitionIndices] = useState<
    Record<string, number>
  >({});
  const [selectedSynonym, setSelectedSynonym] = useState<SynonymOption | null>(
    null,
  );
  const [synonymLookup, setSynonymLookup] = useState<Awaited<
    ReturnType<typeof fetchDefinition>
  > | null>(null);
  const [isSynonymLookupLoading, setIsSynonymLookupLoading] = useState(false);
  const [synonymLookupError, setSynonymLookupError] = useState("");
  const [synonymModalStatus, setSynonymModalStatus] = useState("");
  const [synonymDefinitionIndex, setSynonymDefinitionIndex] = useState(0);
  const [importValue, setImportValue] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as unknown;
          if (Array.isArray(parsed) && parsed.every(isSavedWord)) {
            setWords(parsed);
          }
        }

        const savedSettings = localStorage.getItem(SETTINGS_KEY);
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings) as unknown;
          if (isAppSettings(parsedSettings)) {
            setPracticeDirection(parsedSettings.practiceDirection);
            setHiddenField(getHiddenField(parsedSettings.practiceDirection));
            setSynonymCategorySettings(
              getSavedSynonymCategories(parsedSettings),
            );
          }
        }
      } catch {
        setStatus("Local data could not be read.");
      } finally {
        setLoaded(true);
      }
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
    }
  }, [loaded, words]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          practiceDirection,
          synonymCategories: synonymCategorySettings,
        }),
      );
    }
  }, [loaded, practiceDirection, synonymCategorySettings]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeSynonym();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    if (!selectedSynonym) {
      return;
    }

    let ignore = false;

    void fetchDefinition(selectedSynonym.word)
      .then((result) => {
        if (!ignore) {
          setSynonymLookup(result);
          setSynonymDefinitionIndex(0);
        }
      })
      .catch((error) => {
        if (!ignore) {
          setSynonymLookupError(
            error instanceof Error ? error.message : "Lookup failed.",
          );
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsSynonymLookupLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [selectedSynonym]);

  useEffect(() => {
    const query = normalizeWord(newWord);
    if (query.length < 2) {
      queueMicrotask(() => setSuggestions([]));
      return;
    }

    const timeout = window.setTimeout(() => {
      void fetchSuggestions(query).then((nextSuggestions) => {
        setSuggestions(
          nextSuggestions.filter(
            (suggestion) => !words.some((word) => word.word === suggestion),
          ),
        );
      });
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [newWord, words]);

  const filteredWords = useMemo(() => {
    const query = normalizeWord(search);
    if (!query) {
      return words;
    }

    return words.filter(
      (word) => {
        const definitions = getDefinitionOptions(word);
        const partsOfSpeech = word.partsOfSpeech?.length
          ? word.partsOfSpeech
          : [word.partOfSpeech ?? ""];

        return (
          word.word.includes(query) ||
          definitions.some((definition) =>
            definition.definition.toLowerCase().includes(query),
          ) ||
          definitions.some((definition) =>
            getAllSynonyms(definition.synonyms).some((synonym) =>
              synonym.word.includes(query),
            ),
          ) ||
          partsOfSpeech.some((partOfSpeech) =>
            normalizeWord(partOfSpeech).includes(query),
          )
        );
      },
    );
  }, [search, words]);

  const practiceWords = useMemo(
    () =>
      [...words].sort((a, b) => {
        const aTime = a.lastPracticedAt ?? a.createdAt;
        const bTime = b.lastPracticedAt ?? b.createdAt;
        return aTime.localeCompare(bTime);
      }),
    [words],
  );

  const safePracticeIndex = practiceWords.length
    ? Math.min(practiceIndex, practiceWords.length - 1)
    : 0;
  const currentWord = practiceWords[safePracticeIndex] ?? null;
  const currentDefinitionOptions = getDefinitionOptions(currentWord);
  const currentDefinitionIndex = getPreviewDefinitionIndex(currentWord);
  const currentDefinition = currentDefinitionOptions[currentDefinitionIndex];
  const appSettings = useMemo(
    () => ({
      practiceDirection,
      synonymCategories: synonymCategorySettings,
    }),
    [practiceDirection, synonymCategorySettings],
  );
  const currentSynonyms = getVisibleSynonyms(
    currentDefinition?.synonyms,
    appSettings,
  );
  const selectedSynonymAlreadySaved = selectedSynonym
    ? words.some((word) => word.word === selectedSynonym.word)
    : false;
  const synonymDefinitionOptions = synonymLookup?.definitions ?? [];
  const safeSynonymDefinitionIndex = synonymDefinitionOptions.length
    ? Math.min(synonymDefinitionIndex, synonymDefinitionOptions.length - 1)
    : 0;
  const synonymDefinition =
    synonymDefinitionOptions[safeSynonymDefinitionIndex] ?? null;
  const synonymDefinitionSynonyms = getVisibleSynonyms(
    synonymDefinition?.synonyms,
    appSettings,
  );
  const exportedJson = useMemo(() => JSON.stringify(words, null, 2), [words]);

  function getPreviewDefinitionIndex(word?: SavedWord) {
    const definitions = getDefinitionOptions(word);
    if (!word || !definitions.length) {
      return 0;
    }

    const previewIndex = previewDefinitionIndices[word.id];
    if (typeof previewIndex !== "number") {
      return getDefinitionIndex(word);
    }

    return Math.min(Math.max(previewIndex, 0), definitions.length - 1);
  }

  async function handleAddWord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const word = normalizeWord(newWord);
    setStatus("");

    if (!word) {
      setStatus("Enter a word.");
      return;
    }

    if (words.some((savedWord) => savedWord.word === word)) {
      setStatus("That word is already saved.");
      return;
    }

    setIsAdding(true);
    try {
      const result = await fetchDefinition(word);
      const savedWord = createSavedWord(word, result);

      setWords((current) => [savedWord, ...current]);
      setNewWord("");
      setSuggestions([]);
      setStatus(`Saved "${word}".`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Lookup failed.");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleBulkAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    const parsedWords = parseWordList(bulkWords);
    if (!parsedWords.length) {
      setStatus("Enter at least one word.");
      return;
    }

    const existingWords = new Set(words.map((word) => word.word));
    const lookupWords = parsedWords.filter((word) => !existingWords.has(word));
    const skippedCount = parsedWords.length - lookupWords.length;

    if (!lookupWords.length) {
      setStatus("All parsed words are already saved.");
      return;
    }

    setIsBulkAdding(true);
    try {
      const savedWords: SavedWord[] = [];
      const failedWords: string[] = [];

      for (const word of lookupWords) {
        try {
          const result = await fetchDefinition(word);
          savedWords.push(createSavedWord(word, result));
        } catch {
          failedWords.push(word);
        }
      }

      if (savedWords.length) {
        setWords((current) => [...savedWords, ...current]);
        setBulkWords("");
      }

      const summary = [
        savedWords.length ? `Saved ${savedWords.length}` : "Saved 0",
        skippedCount ? `skipped ${skippedCount} duplicate` : "",
        failedWords.length ? `failed: ${failedWords.slice(0, 6).join(", ")}` : "",
      ].filter(Boolean);

      setStatus(`${summary.join(" / ")}.`);
    } finally {
      setIsBulkAdding(false);
    }
  }

  function deleteWord(id: string) {
    setWords((current) => current.filter((word) => word.id !== id));
    setPreviewDefinitionIndices((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setIsRevealed(false);
  }

  function setDefinitionIndex(id: string, index: number) {
    setWords((current) =>
      current.map((word) => {
        if (word.id !== id) {
          return word;
        }

        const definitions = getDefinitionOptions(word);
        if (!definitions.length) {
          return word;
        }

        const nextIndex =
          ((index % definitions.length) + definitions.length) %
          definitions.length;
        const nextDefinition = definitions[nextIndex];

        return {
          ...word,
          definition: nextDefinition.definition,
          example: nextDefinition.example,
          partOfSpeech: nextDefinition.partOfSpeech,
          definitions: definitions.map((definition, definitionIndex) =>
            definitionIndex === nextIndex
              ? {
                  ...definition,
                  synonyms: nextDefinition.synonyms,
                }
              : definition,
          ),
          selectedDefinitionIndex: nextIndex,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
    setPreviewDefinitionIndices((current) => ({ ...current, [id]: index }));
  }

  function previewDefinition(id: string, direction: -1 | 1) {
    const word = words.find((savedWord) => savedWord.id === id);
    if (!word) {
      return;
    }

    const definitions = getDefinitionOptions(word);
    if (!definitions.length) {
      return;
    }

    const currentIndex = getPreviewDefinitionIndex(word);
    const nextIndex =
      (((currentIndex + direction) % definitions.length) + definitions.length) %
      definitions.length;

    setPreviewDefinitionIndices((current) => ({
      ...current,
      [id]: nextIndex,
    }));
  }

  function selectPreviewDefinition(id: string) {
    const word = words.find((savedWord) => savedWord.id === id);
    if (!word) {
      return;
    }

    setDefinitionIndex(id, getPreviewDefinitionIndex(word));
  }

  function markPractice(mark: PracticeMark) {
    if (!currentWord) {
      return;
    }

    const now = new Date().toISOString();
    setWords((current) =>
      current.map((word) =>
        word.id === currentWord.id
          ? {
              ...word,
              seenCount: word.seenCount + 1,
              knownCount: mark === "known" ? word.knownCount + 1 : word.knownCount,
              reviewCount:
                mark === "review" ? word.reviewCount + 1 : word.reviewCount,
              lastPracticedAt: now,
              updatedAt: now,
            }
          : word,
      ),
    );
    setIsRevealed(false);
    setPreviewDefinitionIndices((current) => {
      const next = { ...current };
      delete next[currentWord.id];
      return next;
    });
    setHiddenField(getHiddenField(practiceDirection));
    setPracticeIndex(
      safePracticeIndex >= practiceWords.length - 1 ? 0 : safePracticeIndex,
    );
  }

  function setDirection(direction: PracticeDirection) {
    setPracticeDirection(direction);
    setHiddenField(getHiddenField(direction));
    setIsRevealed(false);
  }

  function toggleSynonymCategory(category: SynonymCategory) {
    setSynonymCategorySettings((current) => ({
      ...current,
      [category]: !current[category],
    }));
  }

  function openSynonym(synonym: SynonymOption) {
    setSynonymLookup(null);
    setSynonymLookupError("");
    setSynonymModalStatus("");
    setSynonymDefinitionIndex(0);
    setIsSynonymLookupLoading(true);
    setSelectedSynonym(synonym);
  }

  function closeSynonym() {
    setSelectedSynonym(null);
    setSynonymLookup(null);
    setIsSynonymLookupLoading(false);
    setSynonymLookupError("");
    setSynonymModalStatus("");
    setSynonymDefinitionIndex(0);
  }

  function addSelectedSynonymWord() {
    if (!selectedSynonym || !synonymLookup || !synonymDefinition) {
      return;
    }

    if (selectedSynonymAlreadySaved) {
      setSynonymModalStatus("Already saved.");
      return;
    }

    const savedWord = {
      ...createSavedWord(selectedSynonym.word, synonymLookup),
      definition: synonymDefinition.definition,
      selectedDefinitionIndex: safeSynonymDefinitionIndex,
      partOfSpeech: synonymDefinition.partOfSpeech,
      example: synonymDefinition.example,
    };
    setWords((current) => {
      if (current.some((word) => word.word === selectedSynonym.word)) {
        return current;
      }

      return [savedWord, ...current];
    });
    setSynonymModalStatus(`Saved "${selectedSynonym.word}".`);
  }

  function previewSynonymDefinition(direction: -1 | 1) {
    if (!synonymDefinitionOptions.length) {
      return;
    }

    setSynonymDefinitionIndex((current) => {
      const nextIndex =
        (((current + direction) % synonymDefinitionOptions.length) +
          synonymDefinitionOptions.length) %
        synonymDefinitionOptions.length;

      return nextIndex;
    });
    setSynonymModalStatus("");
  }

  async function refetchDefinitions() {
    setStatus("");

    if (!words.length) {
      setStatus("No words to refetch.");
      return;
    }

    setIsRefetching(true);
    try {
      const refreshedWords: SavedWord[] = [];
      const failedWords: string[] = [];

      for (const savedWord of words) {
        try {
          const result = await fetchDefinition(savedWord.word);
          const selectedDefinitionIndex = Math.min(
            getDefinitionIndex(savedWord),
            result.definitions.length - 1,
          );
          const selectedDefinition =
            result.definitions[selectedDefinitionIndex] ?? result.definitions[0];

          refreshedWords.push({
            ...savedWord,
            definition: selectedDefinition.definition,
            definitions: result.definitions,
            selectedDefinitionIndex,
            partOfSpeech: selectedDefinition.partOfSpeech,
            partsOfSpeech: result.partsOfSpeech,
            example: selectedDefinition.example,
            updatedAt: new Date().toISOString(),
          });
        } catch {
          failedWords.push(savedWord.word);
          refreshedWords.push(savedWord);
        }
      }

      const refreshedById = new Map(
        refreshedWords.map((word) => [word.id, word]),
      );
      setWords((current) =>
        current.map((word) => refreshedById.get(word.id) ?? word),
      );

      const refreshedCount = words.length - failedWords.length;
      const summary = [
        `Refetched ${refreshedCount}`,
        failedWords.length
          ? `failed: ${failedWords.slice(0, 6).join(", ")}`
          : "",
      ].filter(Boolean);

      setStatus(`${summary.join(" / ")}.`);
    } finally {
      setIsRefetching(false);
    }
  }

  function clearWords() {
    if (window.confirm("Clear all saved words?")) {
      setWords([]);
      setPracticeIndex(0);
      setIsRevealed(false);
      setStatus("All words cleared.");
    }
  }

  function importWords() {
    setStatus("");

    try {
      const parsed = JSON.parse(importValue) as unknown;
      if (!Array.isArray(parsed) || !parsed.every(isSavedWord)) {
        setStatus("Import must be a wotd JSON array.");
        return;
      }

      const deduped = Array.from(
        new Map(parsed.map((word) => [normalizeWord(word.word), word])).values(),
      );
      setWords(deduped);
      setImportValue("");
      setStatus(`Imported ${deduped.length} words.`);
      setView("edit");
      setEditPage("words");
    } catch {
      setStatus("Import JSON could not be parsed.");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col sm:px-6 sm:py-4 lg:px-8">
      <header className="bg-white sm:border-4 sm:border-black">
        <div className="flex flex-col justify-between gap-4 border-b-4 border-black p-3 sm:flex-row sm:items-end sm:p-4">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase">local vocabulary deck</p>
            <h1 className="text-5xl font-black leading-none sm:text-7xl">wotd</h1>
          </div>
        </div>

        <nav className="grid grid-cols-3 border-b-4 border-black sm:border-b-0">
          {views.map((item) => (
            <button
              className={`border-r-4 border-black px-2 py-4 text-xs font-black uppercase last:border-r-0 hover:bg-lime-200 min-[380px]:text-sm sm:px-3 ${
                view === item ? "bg-lime-300" : "bg-white"
              }`}
              key={item}
              onClick={() => {
                setView(item);
                setStatus("");
                setPreviewDefinitionIndices({});
              }}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>
      </header>

      <section className="flex-1 bg-white p-3 sm:border-x-4 sm:border-b-4 sm:border-black sm:p-6">
        {view === "practice" && (
          <div className="flex min-h-[560px] flex-col gap-4">
            <div className="border-4 border-black p-3">
              <p className="font-mono text-xs uppercase">direction</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {practiceDirections.map((direction) => (
                  <button
                    className={`border-4 border-black px-3 py-3 text-left text-sm font-black uppercase hover:bg-lime-200 min-[380px]:text-base sm:text-center ${
                      practiceDirection === direction ? "bg-lime-300" : "bg-white"
                    }`}
                    key={direction}
                    onClick={() => setDirection(direction)}
                    type="button"
                  >
                    {directionLabel(direction)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
              <div className="group grid min-h-[42rem] w-full grid-rows-[1fr_auto] overflow-hidden border-4 border-black bg-neutral-50 text-left hover:bg-lime-100">
                <div
                  className={`grid min-h-0 w-full grid-rows-[auto_1fr_auto] overflow-hidden bg-transparent p-3 text-left min-[380px]:p-4 sm:p-6 ${
                    currentWord && !isRevealed ? "cursor-pointer" : ""
                  }`}
                  onClick={() => currentWord && !isRevealed && setIsRevealed(true)}
                  onKeyDown={(event) => {
                    if (
                      currentWord &&
                      !isRevealed &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      setIsRevealed(true);
                    }
                  }}
                  role={currentWord && !isRevealed ? "button" : undefined}
                  tabIndex={currentWord && !isRevealed ? 0 : undefined}
                >
                  {currentWord ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2 font-mono text-xs uppercase">
                        <span className="border-2 border-black px-2 py-1">
                          {formatPartsOfSpeech(currentWord)}
                        </span>
                        <span className="border-2 border-black px-2 py-1">
                          added {formatDate(currentWord.createdAt)}
                        </span>
                      </div>

                      <div className="grid min-h-0 content-start gap-3 overflow-y-auto py-4 sm:gap-4 sm:py-5">
                        <div className="h-36 overflow-hidden border-4 border-black bg-white p-4">
                          <p className="font-mono text-xs uppercase">word</p>
                          <div className="mt-3 h-20 overflow-y-auto break-words text-4xl font-black leading-tight sm:text-6xl">
                            {hiddenField === "word" && !isRevealed ? (
                              <span
                                aria-label="hidden word"
                                className="block h-full w-full border-4 border-black bg-[repeating-linear-gradient(135deg,#050505_0,#050505_10px,#f4f4f0_10px,#f4f4f0_20px)]"
                              />
                            ) : (
                              currentWord.word
                            )}
                          </div>
                        </div>

                        <div className="border-4 border-black bg-white p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-mono text-xs uppercase">
                              definition
                            </p>
                            {isRevealed && currentDefinition && (
                              <span className="font-mono text-[10px] uppercase text-neutral-600">
                                {formatDefinitionSource(currentDefinition)}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 text-xl font-semibold leading-snug [overflow-wrap:anywhere] sm:text-2xl">
                            {hiddenField === "definition" && !isRevealed ? (
                              <span
                                aria-label="hidden definition"
                                className="block h-40 w-full border-4 border-black bg-[repeating-linear-gradient(135deg,#050505_0,#050505_10px,#f4f4f0_10px,#f4f4f0_20px)]"
                              />
                            ) : (
                              currentDefinition?.definition
                            )}
                          </div>
                        </div>

                        {isRevealed &&
                          getDefinitionExamples(currentDefinition).length > 0 && (
                            <ExampleBrowser
                              examples={getDefinitionExamples(currentDefinition)}
                            />
                          )}

                        {isRevealed &&
                          currentSynonyms.length > 0 && (
                            <div className="border-4 border-black bg-white p-4">
                              <p className="font-mono text-xs uppercase">
                                synonyms
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {currentSynonyms.map((synonym) => (
                                  <span
                                    className="border-2 border-black px-2 py-1 font-mono text-xs uppercase hover:bg-lime-200 focus:bg-lime-200"
                                    key={synonym.word}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openSynonym(synonym);
                                    }}
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                      ) {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        openSynonym(synonym);
                                      }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                  >
                                    {synonym.word}
                                    {synonym.categories.length > 0 && (
                                      <span className="ml-1 text-[10px] font-black">
                                        {synonym.categories.join("/")}
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>

                      <span className="sr-only">
                        {isRevealed ? "grade this card" : "tap card to reveal"}
                      </span>
                    </>
                  ) : (
                    <>
                      <span />
                      <span className="flex min-h-0 items-center overflow-y-auto text-5xl font-black leading-tight">
                        no words saved
                      </span>
                      <span />
                    </>
                  )}
                </div>

                <div className="grid content-end px-3 pb-3 group-hover:bg-lime-100 min-[380px]:px-4 min-[380px]:pb-4">
                  {isRevealed && currentWord ? (
                    <div className="grid gap-3">
                      {currentDefinitionOptions.length > 1 && (
                        <div className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[auto_1fr_auto]">
                          <button
                            className="border-4 border-black bg-white px-3 py-3 text-sm font-black uppercase hover:bg-lime-200 focus:bg-lime-200 min-[380px]:text-base sm:px-4"
                            onClick={() => previewDefinition(currentWord.id, -1)}
                            type="button"
                          >
                            Prev
                          </button>
                          <div className="order-first col-span-2 flex min-w-0 items-center justify-center gap-2 sm:order-none sm:col-span-1">
                            <p className="min-w-0 text-center font-mono text-xs font-black uppercase">
                              definition {currentDefinitionIndex + 1} /{" "}
                              {currentDefinitionOptions.length}
                            </p>
                            <button
                              aria-label={
                                currentDefinitionIndex ===
                                getDefinitionIndex(currentWord)
                                  ? "Selected definition"
                                  : "Select definition"
                              }
                              className="h-8 w-8 border-4 border-black bg-white font-black hover:bg-lime-200 focus:bg-lime-200 disabled:bg-lime-300"
                              disabled={
                                currentDefinitionIndex ===
                                getDefinitionIndex(currentWord)
                              }
                              onClick={() =>
                                selectPreviewDefinition(currentWord.id)
                              }
                              type="button"
                            >
                              {currentDefinitionIndex ===
                              getDefinitionIndex(currentWord)
                                ? "✓"
                                : "+"}
                            </button>
                          </div>
                          <button
                            className="border-4 border-black bg-white px-3 py-3 text-sm font-black uppercase hover:bg-lime-200 focus:bg-lime-200 min-[380px]:text-base sm:px-4"
                            onClick={() => previewDefinition(currentWord.id, 1)}
                            type="button"
                          >
                            Next
                          </button>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          className="border-4 border-black bg-white px-3 py-4 text-sm font-black uppercase hover:bg-lime-200 focus:bg-lime-200 min-[380px]:text-base sm:px-4 sm:py-5"
                          disabled={!isRevealed || !currentWord}
                          onClick={() => markPractice("known")}
                          type="button"
                        >
                          Knew it
                        </button>
                        <button
                          className="border-4 border-black bg-white px-3 py-4 text-sm font-black uppercase hover:bg-lime-200 focus:bg-lime-200 min-[380px]:text-base sm:px-4 sm:py-5"
                          disabled={!isRevealed || !currentWord}
                          onClick={() => markPractice("review")}
                          type="button"
                        >
                          Wasn&apos;t sure
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="px-4 py-3 text-center font-mono text-sm font-black uppercase">
                      tap card to reveal
                    </p>
                  )}
                </div>
              </div>

              <aside className="flex flex-col gap-4">
                <div className="border-4 border-black p-4">
                  <p className="font-mono text-xs uppercase">stats</p>
                  <p className="mt-4 font-mono text-sm">
                    Seen {currentWord?.seenCount ?? 0} / Known{" "}
                    {currentWord?.knownCount ?? 0} / Review{" "}
                    {currentWord?.reviewCount ?? 0}
                  </p>
                </div>
              </aside>
            </div>
          </div>
        )}

        {view === "edit" && (
          <div className="flex flex-col gap-4">
            <nav className="grid grid-cols-2 border-4 border-black">
              {editPages.map((item) => (
                <button
                  className={`border-r-4 border-black px-3 py-3 font-black uppercase last:border-r-0 hover:bg-lime-200 ${
                    editPage === item ? "bg-lime-300" : "bg-white"
                  }`}
                  key={item}
                  onClick={() => {
                    setEditPage(item);
                    setStatus("");
                  }}
                  type="button"
                >
                  {item === "words" ? "words" : "bulk add"}
                </button>
              ))}
            </nav>

            {editPage === "words" && (
              <div className="grid gap-4 lg:grid-cols-[24rem_1fr]">
                <div className="flex h-fit flex-col gap-4">
                  <form
                    className="flex flex-col gap-3 border-4 border-black p-4"
                    onSubmit={handleAddWord}
                  >
                    <label className="font-mono text-xs uppercase" htmlFor="word">
                      word
                    </label>
                    <input
                      autoComplete="off"
                      className="border-4 border-black px-3 py-4 text-2xl font-black outline-none focus:bg-lime-100"
                      id="word"
                      onChange={(event) => setNewWord(event.target.value)}
                      placeholder="serendipity"
                      value={newWord}
                    />
                    {suggestions.length > 0 && (
                      <div className="grid gap-2">
                        {suggestions.map((suggestion) => (
                          <button
                            className="border-4 border-black bg-white px-3 py-2 text-left font-mono text-sm uppercase hover:bg-lime-200"
                            key={suggestion}
                            onClick={() => {
                              setNewWord(suggestion);
                              setSuggestions([]);
                            }}
                            type="button"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      className="border-4 border-black bg-lime-300 px-4 py-4 font-black uppercase disabled:bg-neutral-200"
                      disabled={isAdding || isBulkAdding}
                      type="submit"
                    >
                      {isAdding ? "Looking up" : "Add word"}
                    </button>
                  </form>

                  {status && (
                    <p className="border-4 border-black p-3 font-mono text-sm">
                      {status}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  <label className="font-mono text-xs uppercase" htmlFor="search">
                    search
                  </label>
                  <input
                    className="border-4 border-black px-3 py-4 font-mono text-lg outline-none focus:bg-lime-100"
                    id="search"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="word, definition, part of speech"
                    value={search}
                  />
                  <div className="grid gap-3">
                    {filteredWords.map((word) => {
                      const definitions = getDefinitionOptions(word);
                      const definitionIndex = getPreviewDefinitionIndex(word);
                      const definition = definitions[definitionIndex];
                      const visibleSynonyms = getVisibleSynonyms(
                        definition?.synonyms,
                        appSettings,
                      );

                      return (
                        <article className="border-4 border-black p-4" key={word.id}>
                          <div className="flex flex-col justify-between gap-3 sm:flex-row">
                            <div>
                              <h2 className="text-3xl font-black">{word.word}</h2>
                              <p className="font-mono text-xs uppercase">
                                {formatPartsOfSpeech(word)} / added{" "}
                                {formatDate(word.createdAt)}
                              </p>
                            </div>
                            <button
                              className="border-4 border-black bg-red-500 px-4 py-2 font-black uppercase text-white hover:bg-red-600"
                              onClick={() => deleteWord(word.id)}
                              type="button"
                            >
                              Delete
                            </button>
                          </div>

                          {definitions.length > 1 && (
                            <div className="mt-4 grid grid-cols-2 items-center gap-2 sm:grid-cols-[auto_1fr_auto]">
                              <button
                                className="border-4 border-black bg-white px-3 py-3 text-sm font-black uppercase hover:bg-lime-200 focus:bg-lime-200 min-[380px]:text-base sm:px-4"
                                onClick={() => previewDefinition(word.id, -1)}
                                type="button"
                              >
                                Prev
                              </button>
                              <div className="order-first col-span-2 flex min-w-0 items-center justify-center gap-2 sm:order-none sm:col-span-1">
                                <p className="min-w-0 text-center font-mono text-xs font-black uppercase">
                                  definition {definitionIndex + 1} /{" "}
                                  {definitions.length}
                                </p>
                                <button
                                  aria-label={
                                    definitionIndex === getDefinitionIndex(word)
                                      ? "Selected definition"
                                      : "Select definition"
                                  }
                                  className="h-8 w-8 border-4 border-black bg-white font-black hover:bg-lime-200 focus:bg-lime-200 disabled:bg-lime-300"
                                  disabled={
                                    definitionIndex === getDefinitionIndex(word)
                                  }
                                  onClick={() => selectPreviewDefinition(word.id)}
                                  type="button"
                                >
                                  {definitionIndex === getDefinitionIndex(word)
                                    ? "✓"
                                    : "+"}
                                </button>
                              </div>
                              <button
                                className="border-4 border-black bg-white px-3 py-3 text-sm font-black uppercase hover:bg-lime-200 focus:bg-lime-200 min-[380px]:text-base sm:px-4"
                                onClick={() => previewDefinition(word.id, 1)}
                                type="button"
                              >
                                Next
                              </button>
                            </div>
                          )}

                          <p className="mt-4 max-w-3xl text-lg font-semibold [overflow-wrap:anywhere]">
                            {definition?.definition}
                          </p>
                          {definition && (
                            <p className="mt-2 font-mono text-[10px] uppercase text-neutral-600">
                              {formatDefinitionSource(definition)}
                            </p>
                          )}
                          {getDefinitionExamples(definition).length > 0 && (
                            <div className="mt-4">
                              <ExampleBrowser
                                examples={getDefinitionExamples(definition)}
                              />
                            </div>
                          )}
                          {visibleSynonyms.length > 0 && (
                              <div className="mt-4">
                                <p className="font-mono text-xs uppercase">
                                  synonyms
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {visibleSynonyms.map((synonym) => (
                                    <button
                                      className="border-2 border-black bg-white px-2 py-1 font-mono text-xs uppercase hover:bg-lime-200 focus:bg-lime-200"
                                      key={synonym.word}
                                      onClick={() => openSynonym(synonym)}
                                      type="button"
                                    >
                                      {synonym.word}
                                      {synonym.categories.length > 0 && (
                                        <span className="ml-1 text-[10px] font-black">
                                          {synonym.categories.join("/")}
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                        </article>
                      );
                    })}
                    {!filteredWords.length && (
                      <div className="border-4 border-black p-8">
                        <p className="text-3xl font-black">no matches</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {editPage === "bulk" && (
              <div className="grid gap-4 lg:grid-cols-[24rem_1fr]">
                <form
                  className="flex h-fit flex-col gap-3 border-4 border-black p-4"
                  onSubmit={handleBulkAdd}
                >
                  <label
                    className="font-mono text-xs uppercase"
                    htmlFor="bulk-words"
                  >
                    bulk words
                  </label>
                  <textarea
                    className="min-h-64 resize-y border-4 border-black p-3 font-mono text-sm outline-none focus:bg-lime-100"
                    id="bulk-words"
                    onChange={(event) => setBulkWords(event.target.value)}
                    placeholder={"solace, liminal; brio\nverdant tenet"}
                    value={bulkWords}
                  />
                  <button
                    className="border-4 border-black bg-lime-300 px-4 py-4 font-black uppercase disabled:bg-neutral-200"
                    disabled={isAdding || isBulkAdding}
                    type="submit"
                  >
                    {isBulkAdding ? "Looking up list" : "Add list"}
                  </button>
                  {status && <p className="font-mono text-sm">{status}</p>}
                </form>

                <div className="border-4 border-black p-4">
                  <p className="font-mono text-xs uppercase">parsed words</p>
                  <p className="mt-3 text-5xl font-black">
                    {parseWordList(bulkWords).length}
                  </p>
                  <p className="mt-4 font-mono text-sm">
                    Separators: comma, newline, semicolon, slash, pipe. Spaces stay
                    inside terms.
                  </p>
                  <p className="mt-4 font-mono text-sm">
                    Existing words are skipped. Words with no dictionary match are
                    reported after lookup.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {view === "settings" && (
          <div className="flex flex-col gap-4">
            <nav className="grid grid-cols-3 border-4 border-black">
              {settingsPages.map((item) => (
                <button
                  className={`border-r-4 border-black px-3 py-3 font-black uppercase last:border-r-0 hover:bg-lime-200 ${
                    settingsPage === item ? "bg-lime-300" : "bg-white"
                  }`}
                  key={item}
                  onClick={() => {
                    setSettingsPage(item);
                    setStatus("");
                  }}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </nav>

            {settingsPage === "data" && (
              <section className="max-w-2xl border-4 border-black p-4">
                <h2 className="text-3xl font-black">data</h2>
                <dl className="mt-4 border-4 border-black font-mono text-sm uppercase">
                  <div className="p-4">
                    <dt>saved words</dt>
                    <dd className="mt-2 text-4xl font-black">{words.length}</dd>
                  </div>
                </dl>
                <button
                  className="mt-4 w-full border-4 border-black bg-lime-300 px-4 py-4 font-black uppercase disabled:bg-neutral-200"
                  disabled={!words.length || isRefetching}
                  onClick={refetchDefinitions}
                  type="button"
                >
                  {isRefetching ? "Refetching definitions" : "Refetch definitions"}
                </button>
                <button
                  className="mt-4 w-full border-4 border-black bg-black px-4 py-4 font-black uppercase text-white disabled:bg-neutral-500"
                  disabled={!words.length || isRefetching}
                  onClick={clearWords}
                  type="button"
                >
                  Clear all data
                </button>
                {status && <p className="mt-3 font-mono text-sm">{status}</p>}
              </section>
            )}

            {settingsPage === "synonyms" && (
              <section className="max-w-3xl border-4 border-black p-4">
                <h2 className="text-3xl font-black">synonyms</h2>
                <p className="mt-3 max-w-2xl font-mono text-sm">
                  Tagged synonym groups are
                  stored, sorted lower, and hidden unless enabled here.
                </p>
                <div className="mt-4 grid gap-3">
                  {synonymCategories.map((item) => (
                    <button
                      aria-pressed={synonymCategorySettings[item.category]}
                      className={`border-4 border-black p-4 text-left hover:bg-lime-200 ${
                        synonymCategorySettings[item.category]
                          ? "bg-lime-300"
                          : "bg-white"
                      }`}
                      key={item.category}
                      onClick={() => toggleSynonymCategory(item.category)}
                      type="button"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-black uppercase">{item.label}</span>
                        <span className="font-mono text-xs uppercase">
                          {synonymCategorySettings[item.category] ? "on" : "off"}
                        </span>
                      </span>
                      <span className="mt-2 block font-mono text-sm">
                        {item.description}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {settingsPage === "backup" && (
              <section className="max-w-3xl border-4 border-black p-4">
                <h2 className="text-3xl font-black">backup</h2>
                <label
                  className="mt-4 block font-mono text-xs uppercase"
                  htmlFor="export"
                >
                  export json
                </label>
                <textarea
                  className="mt-2 min-h-48 w-full resize-y border-4 border-black p-3 font-mono text-xs outline-none"
                  id="export"
                  readOnly
                  value={exportedJson}
                />
                <label
                  className="mt-4 block font-mono text-xs uppercase"
                  htmlFor="import"
                >
                  import json
                </label>
                <textarea
                  className="mt-2 min-h-32 w-full resize-y border-4 border-black p-3 font-mono text-xs outline-none focus:bg-lime-100"
                  id="import"
                  onChange={(event) => setImportValue(event.target.value)}
                  value={importValue}
                />
                <button
                  className="mt-3 w-full border-4 border-black bg-lime-300 px-4 py-4 font-black uppercase disabled:bg-neutral-200"
                  disabled={!importValue.trim()}
                  onClick={importWords}
                  type="button"
                >
                  Import backup
                </button>
                {status && <p className="mt-3 font-mono text-sm">{status}</p>}
              </section>
            )}
          </div>
        )}
      </section>

      {selectedSynonym && (
        <div
          aria-labelledby="synonym-dialog-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={closeSynonym}
          role="dialog"
        >
          <div
            className="grid max-h-[90dvh] w-full max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-4 border-black bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b-4 border-black p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-xs uppercase">word</p>
                  <h2
                    className="break-words text-4xl font-black"
                    id="synonym-dialog-title"
                  >
                    {selectedSynonym.word}
                  </h2>
                </div>
                <button
                  aria-label="Close synonym details"
                  className="h-10 w-10 shrink-0 border-4 border-black bg-white font-black hover:bg-lime-200 focus:bg-lime-200"
                  onClick={closeSynonym}
                  type="button"
                >
                  ×
                </button>
              </div>

              <p className="mt-3 font-mono text-xs uppercase text-neutral-600">
                Tags:{" "}
                {selectedSynonym.tags.length
                  ? selectedSynonym.tags.join(", ")
                  : "none"}{" "}
                / Categories:{" "}
                {selectedSynonym.categories.length
                  ? selectedSynonym.categories.join(", ")
                  : "default"}
              </p>
            </div>

            <div className="grid min-h-0 content-start gap-4 overflow-y-auto p-4">
              {synonymDefinition?.partOfSpeech && (
                <div className="flex flex-wrap gap-2">
                  <span className="border-2 border-black px-2 py-1 font-mono text-xs uppercase">
                    {synonymDefinition.partOfSpeech}
                  </span>
                  <span className="px-2 py-1 font-mono text-[10px] uppercase text-neutral-600">
                    {formatDefinitionSource(synonymDefinition)}
                  </span>
                </div>
              )}
              {isSynonymLookupLoading && (
                <div className="border-4 border-black p-4">
                  <p className="font-mono text-sm uppercase">looking up</p>
                </div>
              )}
              {synonymLookupError && (
                <div className="border-4 border-black p-4">
                  <p className="font-mono text-sm uppercase">
                  {synonymLookupError}
                  </p>
                </div>
              )}
              {synonymDefinition && (
                <>
                  <div className="border-4 border-black p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-xs uppercase">definition</p>
                      <span className="font-mono text-[10px] uppercase text-neutral-600">
                        {formatDefinitionSource(synonymDefinition)}
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-semibold [overflow-wrap:anywhere]">
                      {synonymDefinition.definition}
                    </p>
                  </div>

                  {getDefinitionExamples(synonymDefinition).length > 0 && (
                    <ExampleBrowser
                      examples={getDefinitionExamples(synonymDefinition)}
                    />
                  )}

                  {synonymDefinitionSynonyms.length > 0 && (
                    <div className="border-4 border-black p-4">
                      <p className="font-mono text-xs uppercase">synonyms</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {synonymDefinitionSynonyms.map((synonym) => (
                          <button
                            className="border-2 border-black bg-white px-2 py-1 font-mono text-xs uppercase hover:bg-lime-200 focus:bg-lime-200"
                            key={synonym.word}
                            onClick={() => openSynonym(synonym)}
                            type="button"
                          >
                            {synonym.word}
                            {synonym.categories.length > 0 && (
                              <span className="ml-1 text-[10px] font-black">
                                {synonym.categories.join("/")}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </>
              )}
            </div>

            <div className="border-t-4 border-black p-4">
              {synonymDefinitionOptions.length > 1 && (
                <div className="mb-3 grid grid-cols-2 items-center gap-2 sm:grid-cols-[auto_1fr_auto]">
                  <button
                    className="border-4 border-black bg-white px-3 py-3 text-sm font-black uppercase hover:bg-lime-200 focus:bg-lime-200"
                    onClick={() => previewSynonymDefinition(-1)}
                    type="button"
                  >
                    Prev
                  </button>
                  <p className="order-first col-span-2 text-center font-mono text-xs font-black uppercase sm:order-none sm:col-span-1">
                    definition {safeSynonymDefinitionIndex + 1} /{" "}
                    {synonymDefinitionOptions.length}
                  </p>
                  <button
                    className="border-4 border-black bg-white px-3 py-3 text-sm font-black uppercase hover:bg-lime-200 focus:bg-lime-200"
                    onClick={() => previewSynonymDefinition(1)}
                    type="button"
                  >
                    Next
                  </button>
                </div>
              )}
              <button
                className="w-full border-4 border-black bg-lime-300 px-4 py-4 font-black uppercase disabled:bg-neutral-200"
                disabled={
                  isSynonymLookupLoading ||
                  !synonymLookup ||
                  selectedSynonymAlreadySaved
                }
                onClick={addSelectedSynonymWord}
                type="button"
              >
                {selectedSynonymAlreadySaved ? "Already saved" : "Add word"}
              </button>
              {synonymModalStatus && (
                <p className="mt-3 font-mono text-sm">{synonymModalStatus}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
