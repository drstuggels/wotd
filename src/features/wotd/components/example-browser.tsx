"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { ExampleOption } from "../types";

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

  const parts: ReactNode[] = [];
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

export function ExampleBrowser({ examples }: { examples: ExampleOption[] }) {
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
    <div className="soft-reveal border-4 border-black bg-white p-4">
      <div
        className="carousel-swap flex flex-wrap items-center justify-between gap-2"
        key={`example-heading-${safeIndex}`}
      >
        <p className="font-mono text-xs uppercase">examples</p>
        <p className="font-mono text-[10px] uppercase text-neutral-600">
          {[example.year, example.type].filter(Boolean).join(" · ")}
        </p>
      </div>
      <p
        className="carousel-swap mt-2 font-mono text-sm leading-relaxed"
        key={`example-text-${safeIndex}`}
      >
        {renderExampleText(example)}
      </p>
      {example.ref && (
        <p
          className="carousel-swap mt-3 line-clamp-2 font-mono text-[10px] uppercase text-neutral-600"
          key={`example-ref-${safeIndex}`}
        >
          {formatExampleRef(example.ref)}
        </p>
      )}
      {examples.length > 1 && (
        <div className="carousel-controls mt-4 flex items-center justify-between gap-3">
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
