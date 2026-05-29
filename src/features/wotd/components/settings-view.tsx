"use client";

import { settingsPages, synonymCategories } from "../constants";
import type { SavedWord, SettingsPage, SynonymCategory } from "../types";

type SettingsViewProps = {
  clearWords: () => void;
  exportedJson: string;
  importValue: string;
  importWords: () => void;
  isRefetching: boolean;
  refetchDefinitions: () => void;
  setImportValue: (value: string) => void;
  setSettingsPage: (page: SettingsPage) => void;
  setStatus: (value: string) => void;
  settingsPage: SettingsPage;
  status: string;
  synonymCategorySettings: Record<SynonymCategory, boolean>;
  toggleSynonymCategory: (category: SynonymCategory) => void;
  words: SavedWord[];
};

export function SettingsView({
  clearWords,
  exportedJson,
  importValue,
  importWords,
  isRefetching,
  refetchDefinitions,
  setImportValue,
  setSettingsPage,
  setStatus,
  settingsPage,
  status,
  synonymCategorySettings,
  toggleSynonymCategory,
  words,
}: SettingsViewProps) {
  return (
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
  );
}
