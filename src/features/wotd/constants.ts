import type {
  EditPage,
  PracticeDirection,
  PrebuiltWordSet,
  SettingsPage,
  SynonymCategory,
  View,
} from "./types";

export const STORAGE_KEY = "wotd:v1";
export const SETTINGS_KEY = "wotd:settings:v1";
export const views: View[] = ["practice", "edit", "settings"];
export const editPages: EditPage[] = ["words", "bulk"];
export const practiceDirections: PracticeDirection[] = [
  "word-first",
  "definition-first",
  "random",
];
export const settingsPages: SettingsPage[] = ["data", "synonyms", "backup"];
export const prebuiltWordSets: PrebuiltWordSet[] = [
  {
    description: "A broad starter list for building a first practice deck.",
    id: "creator-starter",
    label: "creator's starter set",
    words: [
      "scrupulously",
      "dowry",
      "opine",
      "sagacious",
      "insolent",
      "goitre",
      "rapacious",
      "aquiline",
      "decadent",
      "pejorative",
      "disparaging",
      "indefatigable",
      "paroxysm",
      "castigation",
      "cordiality",
      "supercilious",
      "arbiter",
      "refulgent",
      "propensity",
      "recalcitrant",
      "gudgeon",
      "circumspectly",
      "rigmarole",
      "inane",
      "fatuous",
      "surfeit",
      "inchoate",
      "incipient",
      "ingratiating",
      "alacrity",
      "calamity",
      "insipid",
      "guileful",
      "intransigent",
      "inure",
      "laconic",
      "jaunt",
      "diffident",
      "dilatory",
      "procession",
      "odious",
      "acumen",
      "perilous",
      "dissidence",
      "frigid",
      "sinuous",
    ],
  },
];
export const synonymCategories: Array<{
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
export const defaultSynonymCategories: Record<SynonymCategory, boolean> = {
  archaic: false,
  literary: false,
  nonstandard: false,
  offensive: false,
  regional: false,
  slang: false,
};
export const categoryPenalty: Record<SynonymCategory, number> = {
  offensive: 100,
  nonstandard: 60,
  archaic: 50,
  slang: 40,
  regional: 30,
  literary: 20,
};
