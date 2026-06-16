const fs = require("fs");
const env = fs.readFileSync(".env", "utf8");
const key = env.match(/SUPABASE_PUBLISHABLE_KEY=[\"']?(.*?)[\"']?(?:\r|\n|$)/)[1];

fetch("https://qsuxpldbwzqnomvtmtyw.supabase.co/functions/v1/gemini-chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + key,
  },
  body: JSON.stringify({
    question: "지금 가도 되나요?",
    riskLevel: "WARNING",
    shelterName: "테스트 대피소",
    routeReasons: ["도로 통제"],
    allowedProperNouns: ["테스트 대피소"],
    dataTimestamp: "2026-06-15T08:00:00Z",
  }),
}).then((r) => r.text().then((t) => console.log("HTTP", r.status, t)));
