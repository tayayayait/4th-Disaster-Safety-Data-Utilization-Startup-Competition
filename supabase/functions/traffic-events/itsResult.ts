export const resultCodeText = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return value.trim();
  return "";
};

export const isSuccessfulItsResultCode = (value: unknown) => {
  const code = resultCodeText(value);
  return /^0+$/.test(code);
};
