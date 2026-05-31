"use client";

import type { SynonymCategory, SynonymOption } from "../types";

export type RelatedWordChip = {
  categories?: SynonymCategory[];
  tags?: string[];
  word: string;
};

type RelatedWordBoxProps = {
  collapsible?: boolean;
  items: RelatedWordChip[];
  label: string;
  openSynonym: (synonym: SynonymOption) => void;
  variant?: "card" | "section";
};

function relatedWordBoxClassName(variant: RelatedWordBoxProps["variant"]) {
  return variant === "card"
    ? "soft-reveal border-4 border-black bg-white p-4"
    : "soft-reveal min-w-0 border-4 border-black p-3 sm:p-4";
}

function RelatedWordButtons({
  items,
  label,
  openSynonym,
}: {
  items: RelatedWordChip[];
  label: string;
  openSynonym: (synonym: SynonymOption) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => {
        const tags = item.tags ?? [];
        const categories = item.categories ?? [];

        return (
          <button
            className="min-w-0 break-words border-2 border-black bg-white px-2 py-1 font-mono text-xs uppercase hover:bg-lime-200 focus:bg-lime-200"
            key={`${label}-${item.word}-${tags.join("-")}-${categories.join("-")}`}
            onClick={(event) => {
              event.stopPropagation();
              openSynonym({
                categories,
                tags,
                word: item.word,
              });
            }}
            type="button"
          >
            {item.word}
            {categories.length > 0 && (
              <span className="ml-1 text-[10px] font-black">
                {categories.join("/")}
              </span>
            )}
            {categories.length === 0 && tags.length > 0 && (
              <span className="ml-1 text-[10px] font-black">
                {tags.slice(0, 2).join("/")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function RelatedWordBox({
  collapsible = false,
  items,
  label,
  openSynonym,
  variant = "section",
}: RelatedWordBoxProps) {
  if (!items.length) {
    return null;
  }

  if (collapsible) {
    return (
      <details className={relatedWordBoxClassName(variant)}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-mono text-xs uppercase hover:bg-lime-200 focus:bg-lime-200">
          <span>{label}</span>
          <span>{items.length}</span>
        </summary>
        <RelatedWordButtons
          items={items}
          label={label}
          openSynonym={openSynonym}
        />
      </details>
    );
  }

  return (
    <div className={relatedWordBoxClassName(variant)}>
      <p className="font-mono text-xs uppercase">{label}</p>
      <RelatedWordButtons items={items} label={label} openSynonym={openSynonym} />
    </div>
  );
}
