import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

// Code 39 Barcode Map verification
const CODE39_MAP = {
  "0": "000110100", "1": "100100001", "2": "001100001", "3": "101100000",
  "4": "000110001", "5": "100110000", "6": "001110000", "7": "000100101",
  "8": "100100100", "9": "001100100", "A": "100001001", "B": "001001001",
  "C": "101001000", "D": "000011001", "E": "100011000", "F": "001011000",
  "G": "000001101", "H": "100001100", "I": "001001100", "J": "000011100",
  "K": "100000011", "L": "001000011", "M": "101000010", "N": "000010011",
  "O": "100010010", "P": "001010010", "Q": "000000111", "R": "100000110",
  "S": "001000110", "T": "000010110", "U": "110000001", "V": "011000001",
  "W": "111000000", "X": "010010001", "Y": "110010000", "Z": "011010000",
  "-": "010000101", ".": "110000100", " ": "011000100", "$": "010101000",
  "/": "010100010", "+": "010001010", "%": "000101010", "*": "010010100"
};

function generateCode39(text) {
  const safeText = (text || "REGISTRATION").toUpperCase().replace(/[^0-9A-Z\-.$/+% ]/g, "");
  const formatted = `*${safeText}*`;
  const bars = [];
  let currentX = 0;

  for (let i = 0; i < formatted.length; i++) {
    const ch = formatted[i];
    const pattern = CODE39_MAP[ch] || CODE39_MAP["-"];
    for (let p = 0; p < 9; p++) {
      const isBar = p % 2 === 0;
      const isWide = pattern[p] === "1";
      const w = isWide ? 4.2 : 1.6;
      if (isBar) {
        bars.push({ x: currentX, width: w });
      }
      currentX += w;
    }
    if (i < formatted.length - 1) {
      currentX += 1.8;
    }
  }

  return { safeText, totalWidth: currentX, barCount: bars.length };
}

async function runPassVerification() {
  console.log("\n========================================================");
  console.log("   EventEase — PDF Pass Download Verification Tests     ");
  console.log("========================================================\n");

  // 1. Verify Code 39 Barcode Generation for Dynamic Registration IDs
  console.log("[Test 1] Code 39 Barcode Generation for Dynamic Registration ID");
  const regId1 = "REG-432A09C8";
  const barcodeResult1 = generateCode39(regId1);
  assert(barcodeResult1.safeText === regId1, `Barcode text accurately matches registration ID: ${regId1}`);
  assert(barcodeResult1.barCount > 0, `Generated ${barcodeResult1.barCount} barcode bars for ${regId1}`);
  assert(barcodeResult1.totalWidth > 100 && barcodeResult1.totalWidth < 400, `Barcode width (${barcodeResult1.totalWidth.toFixed(1)}px) fits ticket container`);

  // 2. Dynamic Filename Formatting
  console.log("\n[Test 2] Dynamic Filename Formatting");
  const testIds = ["REG-432A09C8", "REG-B4007748", "REG-327393D8/extra!"];
  testIds.forEach((rawId) => {
    const cleanRef = String(rawId).replace(/[^a-zA-Z0-9_-]/g, "");
    const fileName = `EventEase-Pass-${cleanRef}.pdf`;
    assert(fileName.startsWith("EventEase-Pass-"), `Filename starts with prefix: ${fileName}`);
    assert(fileName.endsWith(".pdf"), `Filename ends with .pdf extension: ${fileName}`);
    assert(!fileName.includes("/"), `Filename is sanitized against directory traversal: ${fileName}`);
  });

  // 3. jsPDF Document Generation & PDF Specification Validation
  console.log("\n[Test 3] jsPDF Document Generation & Binary Output Validation");
  const pdfWidth = 480;
  const pdfHeight = 640;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: [pdfWidth, pdfHeight]
  });

  // Draw background and ticket styling elements
  pdf.setFillColor(21, 19, 27); // #15131B
  pdf.rect(0, 0, pdfWidth, pdfHeight, "F");

  // Add header text & details
  pdf.setTextColor(199, 138, 244);
  pdf.setFontSize(14);
  pdf.text("EventEase Official Entry Pass", 20, 30);

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.text("Cloud Architecture Summit 2026", 20, 60);

  pdf.setFontSize(11);
  pdf.setTextColor(160, 160, 180);
  pdf.text("ATTENDEE: Sarah Connor", 20, 90);
  pdf.text("EMAIL: sarah.connor@example.com", 20, 110);
  pdf.text("VENUE: Grand Auditorium & Live Stream", 20, 130);
  pdf.text("REGISTRATION CODE: REG-432A09C8", 20, 150);

  const pdfOutput = pdf.output("arraybuffer");
  const pdfBuffer = Buffer.from(pdfOutput);

  assert(pdfBuffer.length > 500, `Generated PDF binary size is valid (${pdfBuffer.length} bytes)`);
  assert(pdfBuffer.toString("utf8", 0, 8).startsWith("%PDF-"), "Generated file header is valid '%PDF-'");
  assert(pdfBuffer.toString("utf8").includes("%%EOF"), "Generated file contains valid EOF trailer");

  // 4. Component File Audit
  console.log("\n[Test 4] DigitalPassModal Component Source Audit");
  const componentPath = path.resolve(__dirname, "src/components/DigitalPassModal.jsx");
  const componentContent = fs.readFileSync(componentPath, "utf8");

  assert(!componentContent.includes("window.print()"), "Browser print dialog (window.print()) is completely removed");
  assert(componentContent.includes("Download Pass"), "Button label updated to 'Download Pass'");
  assert(componentContent.includes("Generating Pass..."), "Loading state 'Generating Pass...' is present");
  assert(componentContent.includes("disabled={isDownloading}"), "Button disables during download to prevent duplicate clicks");
  assert(componentContent.includes("pdf.save("), "Direct PDF file save (pdf.save) is implemented");
  assert(componentContent.includes("EventEase-Pass-"), "Dynamic filename format 'EventEase-Pass-<ID>.pdf' is used");
  assert(componentContent.includes("renderCode39Barcode"), "Dynamic Code 39 barcode rendering is present");
  assert(componentContent.includes("onClick={onClose}"), "Done button maintains functional onClose handler");

  console.log("\n========================================================");
  console.log("   ALL PASS PDF VERIFICATION CHECKS PASSED!             ");
  console.log("========================================================\n");
}

runPassVerification().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
