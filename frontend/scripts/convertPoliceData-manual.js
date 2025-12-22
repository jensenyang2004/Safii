// frontend/scripts/convertLocalPoliceData.js
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import proj4 from "proj4";

// === 檔案設定 ===
const INPUT_PATH = path.resolve("./scripts/1141027-各警察(分)局分駐(派出)所地址電話經緯度資料.ods");
const OUTPUT_PATH = path.resolve("./data/policeStations.json");

// === 台灣坐標系統 TWD97 TM2 (121E 分帶) ===
// EPSG:3826 對應中央經線 121°E
const TWD97 = "+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +datum=WGS84 +units=m +no_defs";

function convertOdsToJson(odsPath) {
  console.log("📖 正在解析 ODS 檔...");

  // 讀取 ODS 檔案
  const buffer = fs.readFileSync(odsPath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet);

  console.log(`📦 共 ${jsonData.length} 筆資料`);

  const policeData = jsonData.map((item, idx) => {
    const x = parseFloat(item["POINT_X"] || item["Point_X"]);
    const y = parseFloat(item["POINT_Y"] || item["Point_Y"]);
    let lon = null, lat = null;

    if (!isNaN(x) && !isNaN(y)) {
      [lon, lat] = proj4(TWD97, "WGS84", [x, y]);
    }

    return {
      id: idx + 1,
      nameZh: item["中文單位名稱"] || item["單位名稱"] || item["名稱"] || "",
      nameEn: item["英文單位名稱"] || "",
      address: item["地址"] || "",
      phone: item["電話"] || "",
      latitude: lat,
      longitude: lon,
    };
  });

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(policeData, null, 2), "utf-8");

  console.log(`✅ 已輸出靜態 JSON 至 ${OUTPUT_PATH}`);
}

// === 執行轉換 ===
convertOdsToJson(INPUT_PATH);