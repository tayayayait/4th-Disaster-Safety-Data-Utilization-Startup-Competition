console.error(
  "seed_shelters.ts is disabled: 행정안전부_이재민임시주거시설정보_20250901.csv is a regional summary without facility addresses or coordinates.",
);
console.error(
  "Use `pnpm run shelters:summary` to generate public/data/temporary-housing-regions.json. Use a facility-level temporary housing API/file before writing shelter_operations rows.",
);
process.exit(1);
