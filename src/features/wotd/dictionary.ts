import type {
  DatamuseDefinitionEntry,
  DefinitionLookupResult,
  DefinitionOption,
  SuggestionEntry,
  WiktApiResponse,
} from "./types";
import {
  getFormsFromApi,
  getLinkedWordsFromApi,
  getRelatedWordsFromApi,
  getSortedExamples,
  getSynonymsFromApi,
  normalizeWord,
} from "./words";

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
    linkedWords: [],
    forms: [],
    antonyms: [],
    hypernyms: [],
    hyponyms: [],
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
    .flatMap((entry) => {
      const forms = getFormsFromApi(entry.forms, word);

      return (entry.senses ?? []).flatMap((sense) =>
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
          const linkedWords = getLinkedWordsFromApi(sense.links, word);
          const antonyms = getRelatedWordsFromApi(sense.antonyms, word);
          const hypernyms = getRelatedWordsFromApi(sense.hypernyms, word);
          const hyponyms = getRelatedWordsFromApi(sense.hyponyms, word);

          const definitionOption: DefinitionOption = {
            definition: text,
            example,
            examples,
            partOfSpeech: entry.pos,
            source: "wiktapi",
            synonyms,
            linkedWords,
            forms,
            antonyms,
            hypernyms,
            hyponyms,
          };

          return [definitionOption];
        }),
      );
    })
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

export async function fetchDefinition(word: string): Promise<DefinitionLookupResult> {
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

export async function fetchSuggestions(query: string) {
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
