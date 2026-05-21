require('dotenv').config();
const https = require("https");
const apiKey = process.env.VITE_GOOGLE_SHEETS_API_KEY || "";
https.get("https://sheets.googleapis.com/v4/spreadsheets/1pM6oOnL7-m0U2i9_w9lscvj2bPhu3ZfE0vR_V4_8hE0?key=" + apiKey, { headers: {} }, (res) => {
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => console.log("STATUS:", res.statusCode, data.substring(0,200)));
});
