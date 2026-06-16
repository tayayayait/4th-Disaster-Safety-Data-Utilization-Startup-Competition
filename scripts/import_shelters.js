import { buildTemporaryHousingSummary } from "./sync-shelters.js";

console.warn(
  "행정안전부_이재민임시주거시설정보_20250901.csv는 시도별 집계 데이터라 shelter_operations DB에 직접 적재하지 않습니다.",
);
console.warn("대신 public/data/temporary-housing-regions.json 요약 파일을 생성합니다.");

buildTemporaryHousingSummary()
  .then(({ outputPath }) => {
    console.log(`Generated ${outputPath}`);
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
