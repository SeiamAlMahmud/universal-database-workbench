export type AccentPalette =
  | "ocean"
  | "emerald"
  | "rose"
  | "amber"
  | "violet"
  | "slate"
  | "neon"
  | "mongodb"
  | "postgres"
  | "custom";

export type SyntaxColorKey =
  | "string"
  | "number"
  | "date"
  | "objectId"
  | "boolean"
  | "object"
  | "null";

export type SyntaxColors = Record<SyntaxColorKey, string>;

export interface AccentSpec {
  label: string;
  rgb: string;
  hoverRgb: string;
}

export const ACCENT_PRESETS: Record<Exclude<AccentPalette, "custom">, AccentSpec> = {
  ocean: { label: "Ocean", rgb: "37 99 235", hoverRgb: "29 78 216" },
  emerald: { label: "Emerald", rgb: "5 150 105", hoverRgb: "4 120 87" },
  rose: { label: "Rose", rgb: "225 29 72", hoverRgb: "190 18 60" },
  amber: { label: "Amber", rgb: "217 119 6", hoverRgb: "180 83 9" },
  violet: { label: "Violet", rgb: "124 58 237", hoverRgb: "109 40 217" },
  slate: { label: "Slate", rgb: "71 85 105", hoverRgb: "51 65 85" },
  neon: { label: "Neon", rgb: "16 185 129", hoverRgb: "5 150 105" },
  mongodb: { label: "Mongo", rgb: "34 197 94", hoverRgb: "22 163 74" },
  postgres: { label: "Postgres", rgb: "14 116 144", hoverRgb: "12 74 110" },
};

export const hexToRgb = (hex: string): string | null => {
  const cleaned = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
};

export const darkenRgb = (rgb: string, factor = 0.82): string => {
  const parts = rgb.split(" ").map((x) => Number(x));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return "29 78 216";
  const [r, g, b] = parts.map((n) => Math.max(0, Math.min(255, Math.round(n * factor))));
  return `${r} ${g} ${b}`;
};

export const DEFAULT_SYNTAX_COLORS: SyntaxColors = {
  string: "#059669",
  number: "#2563eb",
  date: "#0ea5e9",
  objectId: "#ea580c",
  boolean: "#7c3aed",
  object: "#475569",
  null: "#64748b",
};

export const getSyntaxPresetForAccent = (accent: AccentPalette): SyntaxColors => {
  if (accent === "mongodb") {
    return {
      string: "#047857",
      number: "#2563eb",
      date: "#0284c7",
      objectId: "#c2410c",
      boolean: "#6d28d9",
      object: "#334155",
      null: "#64748b",
    };
  }

  if (accent === "postgres") {
    return {
      string: "#0f766e",
      number: "#1d4ed8",
      date: "#0369a1",
      objectId: "#b45309",
      boolean: "#7e22ce",
      object: "#334155",
      null: "#64748b",
    };
  }

  if (accent === "neon") {
    return {
      string: "#059669",
      number: "#0891b2",
      date: "#0ea5e9",
      objectId: "#d97706",
      boolean: "#7c3aed",
      object: "#475569",
      null: "#64748b",
    };
  }

  return { ...DEFAULT_SYNTAX_COLORS };
};
