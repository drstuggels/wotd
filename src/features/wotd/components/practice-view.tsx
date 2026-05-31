"use client";

import { ExampleBrowser } from "./example-browser";
import { RelatedWordBox } from "./related-word-box";
import { practiceDirections } from "../constants";
import type {
  DefinitionOption,
  HiddenField,
  PracticeDirection,
  PracticeMark,
  PracticeStats,
  SavedWord,
  SynonymOption,
} from "../types";
import {
  directionLabel,
  formatDate,
  formatDefinitionSource,
  formatPartsOfSpeech,
  getDefinitionExamples,
  getDefinitionIndex,
  getNymWords,
} from "../words";

type PracticeViewProps = {
  currentDefinition: DefinitionOption | undefined;
  currentDefinitionIndex: number;
  currentDefinitionOptions: DefinitionOption[];
  currentSynonyms: SynonymOption[];
  currentWord: SavedWord | null;
  definitionFirstPracticeStats: PracticeStats;
  hiddenField: HiddenField;
  isRevealed: boolean;
  markPractice: (mark: PracticeMark) => void;
  openSynonym: (synonym: SynonymOption) => void;
  practiceDirection: PracticeDirection;
  previewDefinition: (id: string, direction: -1 | 1) => void;
  selectPreviewDefinition: (id: string) => void;
  setDirection: (direction: PracticeDirection) => void;
  setIsRevealed: (isRevealed: boolean) => void;
  totalPracticeStats: PracticeStats;
  wordFirstPracticeStats: PracticeStats;
};

export function PracticeView({
  currentDefinition,
  currentDefinitionIndex,
  currentDefinitionOptions,
  currentSynonyms,
  currentWord,
  definitionFirstPracticeStats,
  hiddenField,
  isRevealed,
  markPractice,
  openSynonym,
  practiceDirection,
  previewDefinition,
  selectPreviewDefinition,
  setDirection,
  setIsRevealed,
  totalPracticeStats,
  wordFirstPracticeStats,
}: PracticeViewProps) {
  const currentPartsOfSpeech = formatPartsOfSpeech(currentWord);
  const currentForms =
    currentDefinition?.forms?.map((form) => ({
      tags: form.tags,
      word: form.form,
    })) ?? [];
  const currentNyms = getNymWords(currentDefinition);
  const statsRows = [
    {
      isActive: hiddenField === "definition",
      label: "word first",
      stats: wordFirstPracticeStats,
    },
    {
      isActive: hiddenField === "word",
      label: "definition first",
      stats: definitionFirstPracticeStats,
    },
  ];

  function formatPercentage(value: number, total: number) {
    if (!total) {
      return "0%";
    }

    return `${Math.round((value / total) * 100)}%`;
  }

  return (
    <div className="flex min-h-[560px] flex-col gap-4">
      <div className="border-4 border-black p-3">
        <p className="font-mono text-xs uppercase">direction</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {practiceDirections.map((direction) => (
            <button
              className={`border-4 border-black px-3 py-3 text-left text-sm font-black uppercase hover:bg-lime-200 min-[380px]:text-base sm:text-center ${
                practiceDirection === direction
                  ? "bg-black text-white hover:bg-black focus:bg-black"
                  : "bg-white"
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
        <div
          className={`motion-card group grid min-h-[42rem] w-full grid-rows-[1fr_auto] overflow-hidden border-4 border-black bg-neutral-50 text-left hover:bg-lime-100 ${
            isRevealed ? "practice-card-revealed" : ""
          }`}
        >
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
                  {currentPartsOfSpeech && (
                    <span className="border-2 border-black px-2 py-1">
                      {currentPartsOfSpeech}
                    </span>
                  )}
                  <span className="border-2 border-black px-2 py-1">
                    added {formatDate(currentWord.createdAt)}
                  </span>
                </div>

                <div className="grid min-h-0 content-start gap-3 overflow-y-auto py-4 sm:gap-4 sm:py-5">
                  <div className="h-36 overflow-hidden border-4 border-black bg-[var(--prompt-surface)] p-4">
                    <p className="font-mono text-xs uppercase">word</p>
                    <div
                      className="mt-3 h-20 overflow-hidden break-words text-4xl font-black leading-tight sm:text-6xl"
                      key={`${currentWord.id}-${hiddenField}-word-${isRevealed}`}
                    >
                      {hiddenField === "word" && !isRevealed ? (
                        <span
                          aria-label="hidden word"
                          className="block h-full w-full border-4 border-black bg-[repeating-linear-gradient(135deg,var(--foreground)_0,var(--foreground)_10px,var(--prompt-surface)_10px,var(--prompt-surface)_20px)]"
                        />
                      ) : (
                        <span className={isRevealed ? "answer-reveal block" : ""}>
                          {currentWord.word}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border-4 border-black bg-[var(--prompt-surface)] p-4">
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
                    <div
                      className="mt-2 text-xl font-semibold leading-snug [overflow-wrap:anywhere] sm:text-2xl"
                      key={`${currentWord.id}-${hiddenField}-definition-${currentDefinitionIndex}-${isRevealed}`}
                    >
                      {hiddenField === "definition" && !isRevealed ? (
                        <span
                          aria-label="hidden definition"
                          className="block h-40 w-full border-4 border-black bg-[repeating-linear-gradient(135deg,var(--foreground)_0,var(--foreground)_10px,var(--prompt-surface)_10px,var(--prompt-surface)_20px)]"
                        />
                      ) : (
                        <span
                          className={`block ${
                            isRevealed && hiddenField === "definition"
                              ? "answer-reveal"
                              : "carousel-swap"
                          }`}
                        >
                          {currentDefinition?.definition}
                        </span>
                      )}
                    </div>
                  </div>

                  {isRevealed &&
                    getDefinitionExamples(currentDefinition).length > 0 && (
                      <ExampleBrowser
                        examples={getDefinitionExamples(currentDefinition)}
                      />
                    )}

                  {isRevealed && (
                    <>
                      <RelatedWordBox
                        items={currentSynonyms}
                        label="synonyms"
                        openSynonym={openSynonym}
                        variant="card"
                      />
                      <RelatedWordBox
                        items={currentDefinition?.linkedWords ?? []}
                        label="linked words"
                        openSynonym={openSynonym}
                        variant="card"
                      />
                      <RelatedWordBox
                        collapsible
                        items={currentForms}
                        label="word forms"
                        openSynonym={openSynonym}
                        variant="card"
                      />
                      <RelatedWordBox
                        collapsible
                        items={currentNyms}
                        label="nyms"
                        openSynonym={openSynonym}
                        variant="card"
                      />
                    </>
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
                  <div className="carousel-controls grid grid-cols-[auto_1fr_auto] items-center gap-2">
                    <button
                      aria-label="Previous definition"
                      className="h-10 w-10 border-4 border-black bg-white font-black hover:bg-lime-200 focus:bg-lime-200"
                      onClick={() => previewDefinition(currentWord.id, -1)}
                      type="button"
                    >
                      ←
                    </button>
                    <div className="flex min-w-0 items-center justify-center gap-2">
                      <p
                        className="carousel-swap min-w-0 text-center font-mono text-xs font-black uppercase"
                        key={`${currentWord.id}-definition-label-${currentDefinitionIndex}`}
                      >
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
                        className="h-8 w-8 border-4 border-black bg-white font-black hover:bg-lime-200 focus:bg-lime-200 disabled:bg-black disabled:text-white"
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
                      aria-label="Next definition"
                      className="h-10 w-10 border-4 border-black bg-white font-black hover:bg-lime-200 focus:bg-lime-200"
                      onClick={() => previewDefinition(currentWord.id, 1)}
                      type="button"
                    >
                      →
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
            <p className="mt-4 font-mono text-xs uppercase text-neutral-600">
              total practiced
            </p>
            <p className="mt-2 text-3xl font-black">
              {totalPracticeStats.seenCount}
            </p>
            <div className="mt-4 grid gap-2">
              {statsRows.map((row) => (
                <div
                  className={`border-2 border-black p-2 ${
                    row.isActive ? "bg-black text-white" : ""
                  }`}
                  key={row.label}
                >
                  <p className="font-mono text-xs uppercase">{row.label}</p>
                  <p className="mt-1 font-mono text-xs">
                    known{" "}
                    {formatPercentage(
                      row.stats.knownCount,
                      row.stats.seenCount,
                    )}{" "}
                    / review{" "}
                    {formatPercentage(
                      row.stats.reviewCount,
                      row.stats.seenCount,
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
