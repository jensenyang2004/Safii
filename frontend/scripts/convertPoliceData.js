import fetch from "node-fetch";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const META_URL = "https://www.npa.gov.tw/ch/app/openData/data/data?module=liaison&serno=afc427bb-43d6-4af4-994a-71faee42e3c0&type=json";
// const META_URL = "https://www.npa.gov.tw/ch/app/data/doc?module=liaison&detailNo=1362326648816406528&type=s";
const OUTPUT_PATH = path.resolve("./frontend/data/policeStations.json");

async function fetchLatestOdsUrl() {
  console.log("🔍 抓取開放資料入口...");
  const res = await fetch(META_URL);
  const text = await res.text();
  let meta;

  try {
    meta = JSON.parse(text);
  } catch {
    console.log("⚠️ 目前抓到的不是 JSON，改試 XML 解析...");
    // 從 XML 中擷取 fileurl
    const match = text.match(/https:\/\/www\.npa\.gov\.tw\/ch\/app\/data\/doc\?module=liaison&detailNo=\d+&type=s/);
    if (!match) throw new Error("❌ 找不到資料連結");
    return match[0]; // 直接回傳檔案 URL
  }

  if (!meta.docs || meta.docs.length === 0) {
    throw new Error("❌ 無法從 JSON 解析出 docs");
  }

  return meta.docs[0].fileurl;
}

async function downloadOdsFile(url, outputFile) {
  console.log("⬇️ 下載最新 ODS 檔案中...");
  const res = await fetch(url);
  if (!res.ok) throw new Error("❌ 下載失敗：" + res.statusText);

  const buffer = await res.arrayBuffer();
  fs.writeFileSync(outputFile, Buffer.from(buffer));
  console.log("✅ 已下載至", outputFile);
}

function convertOdsToJson(odsPath) {
  console.log("📖 解析 ODS...");
  const workbook = XLSX.readFile(odsPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet);

  console.log(`📦 共 ${jsonData.length} 筆資料`);

  return jsonData.map((item, idx) => ({
    id: idx + 1,
    name: item["單位名稱"] || item["名稱"] || "",
    address: item["地址"] || "",
    phone: item["電話"] || "",
    latitude: parseFloat(item["緯度"]) || null,
    longitude: parseFloat(item["經度"]) || null,
  }));
}

async function updatePoliceData() {
  try {
    const tempOdsPath = path.resolve("./frontend/scripts/tmp-police.ods");

    const odsUrl = await fetchLatestOdsUrl();
    await downloadOdsFile(odsUrl, tempOdsPath);

    const policeData = convertOdsToJson(tempOdsPath);
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(policeData, null, 2), "utf-8");

    fs.unlinkSync(tempOdsPath);
    console.log(`🚀 更新完成！已輸出至 ${OUTPUT_PATH}`);
  } catch (err) {
    console.error("❌ 發生錯誤：", err);
    process.exit(1);
  }
}

updatePoliceData();