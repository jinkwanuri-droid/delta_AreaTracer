import { fetchAllStagesFromSheets } from "./src/lib/sheetsService.js";
import dotenv from "dotenv";

dotenv.config();

const spreadsheetId = "1a8Q20N89a3rX165lJ-n31E48wO18xXgM-wG2t6RtyC0"; // wait, I don't know the spreadsheet id.

async function test() {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/1a8Q20N89a3rX165lJ-n31E48wO18xXgM-wG2t6RtyC0?key=${process.env.VITE_GOOGLE_SHEETS_API_KEY}`;
        const res = await fetch(url);
        console.log(res.status);
        console.log(await res.json());
    } catch (e) {
        console.error(e);
    }
}
test();
