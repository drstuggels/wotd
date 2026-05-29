"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { EditView } from "./components/edit-view";
import { PracticeView } from "./components/practice-view";
import { SettingsView } from "./components/settings-view";
import { SynonymDialog } from "./components/synonym-dialog";
import {
  defaultSynonymCategories,
  SETTINGS_KEY,
  STORAGE_KEY,
  views,
} from "./constants";
import { fetchDefinition, fetchSuggestions } from "./dictionary";
import { getRouteState, routeUrl } from "./routing";
import type { RouteState } from "./routing";
import type {
  EditPage,
  HiddenField,
  PracticeDirection,
  PracticeMark,
  SavedWord,
  SettingsPage,
  SynonymCategory,
  SynonymOption,
  View,
} from "./types";
import {
  createSavedWord,
  getAllSynonyms,
  getDefinitionIndex,
  getDefinitionOptions,
  getHiddenField,
  getSavedSynonymCategories,
  getVisibleSynonyms,
  isAppSettings,
  isSavedWord,
  normalizeWord,
  parseWordList,
} from "./words";

export function WotdApp() {
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
    function syncRouteState() {
      const nextRouteState = getRouteState();
      setView(nextRouteState.view);
      setEditPage(nextRouteState.editPage);
      setSettingsPage(nextRouteState.settingsPage);
      setStatus("");
      setPreviewDefinitionIndices({});
    }

    syncRouteState();
    window.addEventListener("popstate", syncRouteState);
    return () => window.removeEventListener("popstate", syncRouteState);
  }, []);

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
      setView("edit");
      setEditPage("words");
      pushRouteState({ editPage: "words", settingsPage, view: "edit" });
      setStatus(`Imported ${deduped.length} words.`);
    } catch {
      setStatus("Import JSON could not be parsed.");
    }
  }

  function pushRouteState(nextRouteState: RouteState) {
    const nextUrl = routeUrl(nextRouteState);
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl !== currentUrl) {
      window.history.pushState(null, "", nextUrl);
    }
  }

  function navigateView(nextView: View) {
    setView(nextView);
    setStatus("");
    setPreviewDefinitionIndices({});
    pushRouteState({ editPage, settingsPage, view: nextView });
  }

  function navigateEditPage(nextEditPage: EditPage) {
    setEditPage(nextEditPage);
    setStatus("");
    pushRouteState({
      editPage: nextEditPage,
      settingsPage,
      view: "edit",
    });
  }

  function navigateSettingsPage(nextSettingsPage: SettingsPage) {
    setSettingsPage(nextSettingsPage);
    setStatus("");
    pushRouteState({
      editPage,
      settingsPage: nextSettingsPage,
      view: "settings",
    });
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
              onClick={() => navigateView(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>
      </header>

      <section className="flex-1 bg-white p-3 sm:border-x-4 sm:border-b-4 sm:border-black sm:p-6">
        {view === "practice" && (
          <PracticeView
            currentDefinition={currentDefinition}
            currentDefinitionIndex={currentDefinitionIndex}
            currentDefinitionOptions={currentDefinitionOptions}
            currentSynonyms={currentSynonyms}
            currentWord={currentWord}
            hiddenField={hiddenField}
            isRevealed={isRevealed}
            markPractice={markPractice}
            openSynonym={openSynonym}
            practiceDirection={practiceDirection}
            previewDefinition={previewDefinition}
            selectPreviewDefinition={selectPreviewDefinition}
            setDirection={setDirection}
            setIsRevealed={setIsRevealed}
          />
        )}

        {view === "edit" && (
          <EditView
            appSettings={appSettings}
            bulkWords={bulkWords}
            deleteWord={deleteWord}
            editPage={editPage}
            filteredWords={filteredWords}
            getPreviewDefinitionIndex={getPreviewDefinitionIndex}
            handleAddWord={handleAddWord}
            handleBulkAdd={handleBulkAdd}
            isAdding={isAdding}
            isBulkAdding={isBulkAdding}
            newWord={newWord}
            openSynonym={openSynonym}
            previewDefinition={previewDefinition}
            search={search}
            selectPreviewDefinition={selectPreviewDefinition}
            setBulkWords={setBulkWords}
            setEditPage={navigateEditPage}
            setNewWord={setNewWord}
            setSearch={setSearch}
            setStatus={setStatus}
            setSuggestions={setSuggestions}
            status={status}
            suggestions={suggestions}
          />
        )}

        {view === "settings" && (
          <SettingsView
            clearWords={clearWords}
            exportedJson={exportedJson}
            importValue={importValue}
            importWords={importWords}
            isRefetching={isRefetching}
            refetchDefinitions={refetchDefinitions}
            setImportValue={setImportValue}
            setSettingsPage={navigateSettingsPage}
            setStatus={setStatus}
            settingsPage={settingsPage}
            status={status}
            synonymCategorySettings={synonymCategorySettings}
            toggleSynonymCategory={toggleSynonymCategory}
            words={words}
          />
        )}
      </section>

      {selectedSynonym && (
        <SynonymDialog
          addSelectedSynonymWord={addSelectedSynonymWord}
          closeSynonym={closeSynonym}
          isSynonymLookupLoading={isSynonymLookupLoading}
          openSynonym={openSynonym}
          previewSynonymDefinition={previewSynonymDefinition}
          safeSynonymDefinitionIndex={safeSynonymDefinitionIndex}
          selectedSynonym={selectedSynonym}
          selectedSynonymAlreadySaved={selectedSynonymAlreadySaved}
          synonymDefinition={synonymDefinition}
          synonymDefinitionOptions={synonymDefinitionOptions}
          synonymDefinitionSynonyms={synonymDefinitionSynonyms}
          synonymLookup={synonymLookup}
          synonymLookupError={synonymLookupError}
          synonymModalStatus={synonymModalStatus}
        />
      )}
      <footer className="px-3 py-4 text-center font-mono text-[10px] uppercase text-neutral-600 sm:px-0">
        made by{" "}
        <a
          className="underline decoration-2 underline-offset-2 hover:text-black focus:text-black"
          href="https://github.com/drstuggels"
          rel="noreferrer"
          target="_blank"
        >
          nuua
        </a>
      </footer>
    </main>
  );
}
