import { buildTemporaryHousingSummary } from "./sync-shelters.js";

console.warn(
  "format-shelters.js no longer formats civil defense shelter data. Generating the temporary housing regional summary instead.",
);

buildTemporaryHousingSummary()
  .then(({ outputPath }) => {
    console.log(`Generated ${outputPath}`);
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
