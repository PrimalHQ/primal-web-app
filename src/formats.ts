type NumberFormatOptions = {
  style?: "unit" | "currency" | "decimal" | "percent",
  unit?: string,
  unitDisplay?: "narrow" | "long" | "short",
};

export const hourNarrow: NumberFormatOptions = {
  style: 'unit', unit: 'hour', unitDisplay: 'narrow',
};
