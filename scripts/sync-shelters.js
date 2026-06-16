import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import csv from "csv-parser";
import iconv from "iconv-lite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_CSV_PATH = path.resolve(
  __dirname,
  "../api가이드파일/행정안전부_이재민임시주거시설정보_20250901.csv",
);
const DEFAULT_OUTPUT_PATH = path.resolve(
  __dirname,
  "../public/data/temporary-housing-regions.json",
);

const REQUIRED_COLUMNS = [
  "순번",
  "자료시점",
  "지역",
  "시설구분",
  "개소",
  "면적(제곱미터)",
  "수용능력",
];

const SOURCE_NAME = "행정안전부_이재민임시주거시설정보_20250901.csv";

const toNumber = (value) => {
  const parsed = Number(
    String(value ?? "")
      .replace(/,/g, "")
      .trim(),
  );
  return Number.isFinite(parsed) ? parsed : 0;
};

const validateColumns = (row) => {
  const missing = REQUIRED_COLUMNS.filter((column) => !(column in row));
  if (missing.length > 0) {
    throw new Error(`Temporary housing CSV is missing columns: ${missing.join(", ")}`);
  }
};

const normalizeRow = (row) => ({
  sequence: toNumber(row["순번"]),
  dataDate: String(row["자료시점"] ?? "").trim(),
  region: String(row["지역"] ?? "").trim(),
  facilityType: String(row["시설구분"] ?? "").trim(),
  facilityCount: toNumber(row["개소"]),
  areaSquareMeters: toNumber(row["면적(제곱미터)"]),
  capacity: toNumber(row["수용능력"]),
});

export const loadTemporaryHousingRows = async (csvPath = DEFAULT_CSV_PATH) =>
  new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(csvPath)
      .pipe(iconv.decodeStream("euc-kr"))
      .pipe(csv())
      .on("data", (row) => {
        try {
          if (rows.length === 0) validateColumns(row);
          rows.push(normalizeRow(row));
        } catch (error) {
          reject(error);
        }
      })
      .on("end", () => resolve(rows))
      .on("error", reject);
  });

const summarizeRows = (rows) => ({
  regions: rows.length,
  facilityCount: rows.reduce((sum, row) => sum + row.facilityCount, 0),
  areaSquareMeters: Number(rows.reduce((sum, row) => sum + row.areaSquareMeters, 0).toFixed(2)),
  capacity: rows.reduce((sum, row) => sum + row.capacity, 0),
});

export const buildTemporaryHousingSummary = async ({
  csvPath = process.env.TEMPORARY_HOUSING_CSV_PATH || DEFAULT_CSV_PATH,
  outputPath = process.env.TEMPORARY_HOUSING_OUTPUT_PATH || DEFAULT_OUTPUT_PATH,
} = {}) => {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Temporary housing CSV not found: ${csvPath}`);
  }

  const rows = await loadTemporaryHousingRows(csvPath);
  if (rows.length === 0) throw new Error("Temporary housing CSV has no data rows.");

  const payload = {
    source: SOURCE_NAME,
    sourcePath: path.relative(path.resolve(__dirname, ".."), csvPath),
    sourceKind: "regional-summary",
    generatedAt: new Date().toISOString(),
    dataDate: rows[0]?.dataDate ?? null,
    warning:
      "This CSV contains regional counts, area, and capacity only. It has no facility address or coordinates, so it must not be imported into shelter_operations for route guidance.",
    totals: summarizeRows(rows),
    regions: rows,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  return { outputPath, payload };
};

const isDirectRun = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isDirectRun) {
  buildTemporaryHousingSummary()
    .then(({ outputPath, payload }) => {
      console.log(`Generated ${path.relative(process.cwd(), outputPath)}`);
      console.log(
        `Regions: ${payload.totals.regions}, facilities: ${payload.totals.facilityCount}, capacity: ${payload.totals.capacity}`,
      );
      console.log(
        "No shelter_operations rows were changed because this source has no coordinates.",
      );
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
