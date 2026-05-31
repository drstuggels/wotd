"use client";

import { ExampleBrowser } from "./example-browser";
import { RelatedWordBox } from "./related-word-box";
import type {
  DefinitionLookupResult,
  DefinitionOption,
  SynonymOption,
} from "../types";
import {
  formatDefinitionSource,
  getDefinitionExamples,
  getNymWords,
} from "../words";

type SynonymDialogProps = {
  addSelectedSynonymWord: () => void;
  closeSynonym: () => void;
  isSynonymLookupLoading: boolean;
  openSynonym: (synonym: SynonymOption) => void;
  previewSynonymDefinition: (direction: -1 | 1) => void;
  safeSynonymDefinitionIndex: number;
  selectedSynonym: SynonymOption;
  selectedSynonymAlreadySaved: boolean;
  synonymDefinition: DefinitionOption | null;
  synonymDefinitionOptions: DefinitionOption[];
  synonymDefinitionSynonyms: SynonymOption[];
  synonymLookup: DefinitionLookupResult | null;
  synonymLookupError: string;
  synonymModalStatus: string;
};

export function SynonymDialog({
  addSelectedSynonymWord,
  closeSynonym,
  isSynonymLookupLoading,
  openSynonym,
  previewSynonymDefinition,
  safeSynonymDefinitionIndex,
  selectedSynonym,
  selectedSynonymAlreadySaved,
  synonymDefinition,
  synonymDefinitionOptions,
  synonymDefinitionSynonyms,
  synonymLookup,
  synonymLookupError,
  synonymModalStatus,
}: SynonymDialogProps) {
  const synonymDefinitionForms =
    synonymDefinition?.forms?.map((form) => ({
      tags: form.tags,
      word: form.form,
    })) ?? [];
  const synonymDefinitionNyms = getNymWords(synonymDefinition);
  const selectedWordMetadata = [
    selectedSynonym.tags.length
      ? `tags: ${selectedSynonym.tags.join(", ")}`
      : "",
    selectedSynonym.categories.length
      ? `categories: ${selectedSynonym.categories.join(", ")}`
      : "",
  ].filter(Boolean);

  return (
    <div
      aria-labelledby="synonym-dialog-title"
      aria-modal="true"
      className="modal-backdrop fixed inset-0 z-50 grid place-items-center bg-black/60 p-2 sm:p-4"
      onClick={closeSynonym}
      role="dialog"
    >
      <div
        className="modal-card grid max-h-[96dvh] w-full max-w-2xl min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-4 border-black bg-white sm:max-h-[90dvh]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-w-0 border-b-4 border-black p-3 sm:p-4">
          <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <p className="font-mono text-xs uppercase">word</p>
              <h2
                className="break-words text-3xl font-black sm:text-4xl"
                id="synonym-dialog-title"
              >
                {selectedSynonym.word}
              </h2>
            </div>
            <button
              aria-label="Close word details"
              className="h-10 w-10 shrink-0 border-4 border-black bg-white font-black hover:bg-lime-200 focus:bg-lime-200"
              onClick={closeSynonym}
              type="button"
            >
              ×
            </button>
          </div>

          {selectedWordMetadata.length > 0 && (
            <p className="mt-3 break-words font-mono text-xs uppercase text-neutral-600">
              {selectedWordMetadata.join(" / ")}
            </p>
          )}
        </div>

        <div className="grid min-h-0 min-w-0 content-start gap-3 overflow-y-auto p-3 sm:gap-4 sm:p-4">
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
            <div className="min-w-0 border-4 border-black p-3 sm:p-4">
              <p className="font-mono text-sm uppercase">looking up</p>
            </div>
          )}
          {synonymLookupError && (
            <div className="min-w-0 border-4 border-black p-3 sm:p-4">
              <p className="font-mono text-sm uppercase">
                {synonymLookupError}
              </p>
            </div>
          )}
          {synonymDefinition && (
            <>
              <div
                className="carousel-swap min-w-0 border-4 border-black p-3 sm:p-4"
                key={`${selectedSynonym.word}-definition-${safeSynonymDefinitionIndex}`}
              >
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

              <RelatedWordBox
                items={synonymDefinitionSynonyms}
                label="synonyms"
                openSynonym={openSynonym}
              />
              <RelatedWordBox
                items={synonymDefinition.linkedWords ?? []}
                label="linked words"
                openSynonym={openSynonym}
              />
              <RelatedWordBox
                collapsible
                items={synonymDefinitionForms}
                label="word forms"
                openSynonym={openSynonym}
              />
              <RelatedWordBox
                collapsible
                items={synonymDefinitionNyms}
                label="nyms"
                openSynonym={openSynonym}
              />
            </>
          )}
        </div>

        <div className="min-w-0 border-t-4 border-black p-3 sm:p-4">
          {synonymDefinitionOptions.length > 1 && (
            <div className="carousel-controls mb-3 grid min-w-0 grid-cols-[auto_1fr_auto] items-center gap-2">
              <button
                aria-label="Previous definition"
                className="h-10 w-10 border-4 border-black bg-white font-black hover:bg-lime-200 focus:bg-lime-200"
                onClick={() => previewSynonymDefinition(-1)}
                type="button"
              >
                ←
              </button>
              <p
                className="carousel-swap min-w-0 text-center font-mono text-[10px] font-black uppercase sm:text-xs"
                key={`${selectedSynonym.word}-definition-label-${safeSynonymDefinitionIndex}`}
              >
                definition {safeSynonymDefinitionIndex + 1} /{" "}
                {synonymDefinitionOptions.length}
              </p>
              <button
                aria-label="Next definition"
                className="h-10 w-10 border-4 border-black bg-white font-black hover:bg-lime-200 focus:bg-lime-200"
                onClick={() => previewSynonymDefinition(1)}
                type="button"
              >
                →
              </button>
            </div>
          )}
          <button
            className="w-full min-w-0 border-4 border-black bg-lime-300 px-4 py-4 font-black uppercase disabled:bg-neutral-200"
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
  );
}
