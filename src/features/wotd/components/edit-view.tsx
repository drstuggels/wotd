"use client";

import type { FormEvent } from "react";
import { ExampleBrowser } from "./example-browser";
import { editPages } from "../constants";
import type {
  AppSettings,
  EditPage,
  SavedWord,
  SynonymOption,
} from "../types";
import {
  formatDate,
  formatDefinitionSource,
  formatPartsOfSpeech,
  getDefinitionExamples,
  getDefinitionIndex,
  getDefinitionOptions,
  getVisibleSynonyms,
  parseWordList,
} from "../words";

type EditViewProps = {
  appSettings: AppSettings;
  bulkWords: string;
  deleteWord: (id: string) => void;
  editPage: EditPage;
  filteredWords: SavedWord[];
  getPreviewDefinitionIndex: (word?: SavedWord) => number;
  handleAddWord: (event: FormEvent<HTMLFormElement>) => void;
  handleBulkAdd: (event: FormEvent<HTMLFormElement>) => void;
  isAdding: boolean;
  isBulkAdding: boolean;
  newWord: string;
  openSynonym: (synonym: SynonymOption) => void;
  previewDefinition: (id: string, direction: -1 | 1) => void;
  search: string;
  selectPreviewDefinition: (id: string) => void;
  setBulkWords: (value: string) => void;
  setEditPage: (page: EditPage) => void;
  setNewWord: (value: string) => void;
  setSearch: (value: string) => void;
  setStatus: (value: string) => void;
  setSuggestions: (suggestions: string[]) => void;
  status: string;
  suggestions: string[];
};

export function EditView({
  appSettings,
  bulkWords,
  deleteWord,
  editPage,
  filteredWords,
  getPreviewDefinitionIndex,
  handleAddWord,
  handleBulkAdd,
  isAdding,
  isBulkAdding,
  newWord,
  openSynonym,
  previewDefinition,
  search,
  selectPreviewDefinition,
  setBulkWords,
  setEditPage,
  setNewWord,
  setSearch,
  setStatus,
  setSuggestions,
  status,
  suggestions,
}: EditViewProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <nav className="grid min-w-0 grid-cols-2 border-4 border-black">
        {editPages.map((item) => (
          <button
            className={`min-w-0 border-r-4 border-black px-2 py-3 text-sm font-black uppercase last:border-r-0 hover:bg-lime-200 sm:px-3 sm:text-base ${
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
        <div className="grid min-w-0 gap-4 lg:grid-cols-[24rem_1fr]">
          <div className="flex h-fit min-w-0 flex-col gap-4">
            <form
              className="flex min-w-0 flex-col gap-3 border-4 border-black p-3 sm:p-4"
              onSubmit={handleAddWord}
            >
              <label className="font-mono text-xs uppercase" htmlFor="word">
                word
              </label>
              <input
                autoComplete="off"
                className="w-full min-w-0 border-4 border-black px-3 py-4 text-xl font-black outline-none focus:bg-lime-100 sm:text-2xl"
                id="word"
                onChange={(event) => setNewWord(event.target.value)}
                placeholder="serendipity"
                value={newWord}
              />
              {suggestions.length > 0 && (
                <div className="grid gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      className="min-w-0 break-words border-4 border-black bg-white px-3 py-2 text-left font-mono text-sm uppercase hover:bg-lime-200"
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
                className="w-full min-w-0 border-4 border-black bg-lime-300 px-4 py-4 font-black uppercase disabled:bg-neutral-200"
                disabled={isAdding || isBulkAdding}
                type="submit"
              >
                {isAdding ? "Looking up" : "Add word"}
              </button>
            </form>

            {status && (
              <p className="min-w-0 break-words border-4 border-black p-3 font-mono text-sm">
                {status}
              </p>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <label className="font-mono text-xs uppercase" htmlFor="search">
              search
            </label>
            <input
              className="w-full min-w-0 border-4 border-black px-3 py-4 font-mono text-base outline-none focus:bg-lime-100 sm:text-lg"
              id="search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="word, definition, part of speech"
              value={search}
            />
            <div className="grid min-w-0 gap-3">
              {filteredWords.map((word) => {
                const definitions = getDefinitionOptions(word);
                const definitionIndex = getPreviewDefinitionIndex(word);
                const definition = definitions[definitionIndex];
                const visibleSynonyms = getVisibleSynonyms(
                  definition?.synonyms,
                  appSettings,
                );
                const partsOfSpeech = formatPartsOfSpeech(word);

                return (
                  <article
                    className="min-w-0 border-4 border-black p-3 sm:p-4"
                    key={word.id}
                  >
                    <div className="flex min-w-0 flex-col justify-between gap-3 sm:flex-row">
                      <div className="min-w-0">
                        <h2 className="break-words text-2xl font-black sm:text-3xl">
                          {word.word}
                        </h2>
                        <p className="break-words font-mono text-xs uppercase">
                          {partsOfSpeech ? `${partsOfSpeech} / ` : ""}added{" "}
                          {formatDate(word.createdAt)}
                        </p>
                      </div>
                      <button
                        className="w-full min-w-0 border-4 border-black bg-red-500 px-4 py-2 font-black uppercase text-white hover:bg-red-600 sm:w-auto"
                        onClick={() => deleteWord(word.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>

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
                        <div className="mt-4 min-w-0">
                          <p className="font-mono text-xs uppercase">
                            synonyms
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {visibleSynonyms.map((synonym) => (
                              <button
                                className="min-w-0 break-words border-2 border-black bg-white px-2 py-1 font-mono text-xs uppercase hover:bg-lime-200 focus:bg-lime-200"
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
                    {definitions.length > 1 && (
                      <div className="mt-4 grid min-w-0 grid-cols-[auto_1fr_auto] items-center gap-2">
                        <button
                          aria-label="Previous definition"
                          className="h-10 w-10 border-4 border-black bg-white font-black hover:bg-lime-200 focus:bg-lime-200"
                          onClick={() => previewDefinition(word.id, -1)}
                          type="button"
                        >
                          ←
                        </button>
                        <div className="flex min-w-0 items-center justify-center gap-2">
                          <p className="min-w-0 text-center font-mono text-[10px] font-black uppercase sm:text-xs">
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
                          aria-label="Next definition"
                          className="h-10 w-10 border-4 border-black bg-white font-black hover:bg-lime-200 focus:bg-lime-200"
                          onClick={() => previewDefinition(word.id, 1)}
                          type="button"
                        >
                          →
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
              {!filteredWords.length && (
                <div className="min-w-0 border-4 border-black p-6 sm:p-8">
                  <p className="text-2xl font-black sm:text-3xl">no matches</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editPage === "bulk" && (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[24rem_1fr]">
          <form
            className="flex h-fit min-w-0 flex-col gap-3 border-4 border-black p-3 sm:p-4"
            onSubmit={handleBulkAdd}
          >
            <label
              className="font-mono text-xs uppercase"
              htmlFor="bulk-words"
            >
              bulk words
            </label>
            <textarea
              className="min-h-64 w-full min-w-0 resize-y border-4 border-black p-3 font-mono text-sm outline-none focus:bg-lime-100"
              id="bulk-words"
              onChange={(event) => setBulkWords(event.target.value)}
              placeholder={"solace, liminal; brio\nverdant\ntenet"}
              value={bulkWords}
            />
            <button
              className="w-full min-w-0 border-4 border-black bg-lime-300 px-4 py-4 font-black uppercase disabled:bg-neutral-200"
              disabled={isAdding || isBulkAdding}
              type="submit"
            >
              {isBulkAdding ? "Looking up list" : "Add list"}
            </button>
            {status && <p className="break-words font-mono text-sm">{status}</p>}
          </form>

          <div className="min-w-0 border-4 border-black p-3 sm:p-4">
            <p className="font-mono text-xs uppercase">parsed words</p>
            <p className="mt-3 text-4xl font-black sm:text-5xl">
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
  );
}
