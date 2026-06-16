import { buildTemporaryHousingSummary } from "./sync-shelters.js";

console.warn(
  "fetch-shelters.js no longer calls the civil defense shelter API. Generating the temporary housing regional summary instead.",
);

buildTemporaryHousingSummary()
  .then(({ outputPath }) => {
    console.log(`Generated ${outputPath}`);
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
