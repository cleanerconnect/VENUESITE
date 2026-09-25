// Named value formats.
//
// Three screen-builder modules each declared their own `MAD` and `COUNT`
// literal. They agreed, but nothing kept them agreeing. These are the
// shared ones; a builder that needs a one-off still writes it inline.

import type { ValueFormat } from "./spec";

export const MAD: ValueFormat = { kind: "currency", currency: "MAD" };
export const COUNT: ValueFormat = { kind: "number" };
export const DECIMAL: ValueFormat = { kind: "number", decimals: 1 };
export const PERCENT: ValueFormat = { kind: "percent" };
export const RATING: ValueFormat = { kind: "rating", max: 5 };
export const RELATIVE: ValueFormat = { kind: "relative" };
export const TEXT: ValueFormat = { kind: "text" };
