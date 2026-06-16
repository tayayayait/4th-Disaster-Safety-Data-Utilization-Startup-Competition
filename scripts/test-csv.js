import { loadTemporaryHousingRows } from "./sync-shelters.js";

loadTemporaryHousingRows()
  .then((rows) => {
    const first = rows[0];
    console.log(`Rows: ${rows.length}`);
    console.log(first);
    if (!first?.region || !first?.capacity) {
      throw new Error("Temporary housing CSV parsed, but required values are empty.");
    }
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
