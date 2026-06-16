async function test() {
  const apiKey = "0e2cff1c020f453eabf61712ee429569";
  const url = `https://openapi.its.go.kr:9443/eventInfo?apiKey=${apiKey}&type=all&eventType=all&minX=126.900000&maxX=127.100000&minY=37.400000&maxY=37.600000&getType=json`;

  console.log("Fetching:", url);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response length:", text.length);
    console.log("Preview:", text.slice(0, 500));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
