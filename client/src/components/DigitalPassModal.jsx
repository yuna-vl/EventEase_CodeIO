import { useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import EventEaseLogo from "./EventEaseLogo.jsx";

/**
 * Standard Code 39 Barcode Map (0 = narrow element, 1 = wide element)
 * Pattern: 9 elements per character (5 bars, 4 spaces).
 */
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

/**
 * Generate a scannable Code 39 Barcode SVG representing the actual registration ID.
 */
function renderCode39Barcode(text) {
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
    // Inter-character space
    if (i < formatted.length - 1) {
      currentX += 1.8;
    }
  }

  return (
    <svg
      viewBox={`0 0 ${currentX} 44`}
      width="100%"
      height="44"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", maxWidth: "340px", margin: "0 auto" }}
      aria-label={`Barcode for ${safeText}`}
    >
      {bars.map((bar, idx) => (
        <rect
          key={idx}
          x={bar.x}
          y={0}
          width={bar.width}
          height={44}
          fill="#FFFFFF"
        />
      ))}
    </svg>
  );
}

/**
 * Dark Cinematic Digital Registration Pass
 * Translucent dark ticket with perforated tear-notches, scannable barcode,
 * and direct PDF pass downloading.
 */
export default function DigitalPassModal({ passData, event, onClose }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  if (!passData) return null;

  const eventTitle = passData.eventTitle || event?.title || "Event Registration";
  const venue = event?.venue || passData.eventVenue || passData.venue || "Confirmed Venue";
  const rawDate = event?.date || passData.eventDate || passData.date;

  let formattedDate = "Confirmed Schedule";
  if (rawDate) {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  }

  let issuedDateFormatted = "Recently Confirmed";
  const rawIssued = passData.registeredAt || passData.createdAt;
  if (rawIssued) {
    const d = new Date(rawIssued);
    if (!isNaN(d.getTime())) {
      issuedDateFormatted = d.toLocaleString();
    }
  }

  const registrationCode = passData.registrationReference || passData._id || "ENTRY";

  /**
   * Directly generate and download high-resolution PDF pass.
   * Does NOT trigger browser print dialog.
   */
  const handleDownloadPass = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadError("");

    try {
      const ticketElement = document.getElementById("printable-pass");
      if (!ticketElement) {
        throw new Error("Unable to locate pass ticket element.");
      }

      // Render the ticket to a high-DPI canvas (2x resolution)
      const canvas = await html2canvas(ticketElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#15131B",
        logging: false,
        onclone: (clonedDoc) => {
          const clonedTicket = clonedDoc.getElementById("printable-pass");
          if (clonedTicket) {
            clonedTicket.style.borderRadius = "16px";
            clonedTicket.style.boxShadow = "none";
          }
        }
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Card dimensions in points (72 pt per inch)
      const pdfWidth = imgWidth / 2;
      const pdfHeight = imgHeight / 2;

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
        unit: "pt",
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");

      const cleanRef = String(registrationCode).replace(/[^a-zA-Z0-9_-]/g, "");
      const fileName = `EventEase-Pass-${cleanRef}.pdf`;

      pdf.save(fileName);
    } catch (err) {
      console.error("[Pass Download] PDF generation failed:", err);
      setDownloadError("Failed to generate PDF pass. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="glass-modal-backdrop" onClick={onClose}>
      <div
        className="glass-pass-modal-wrapper"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pass-title"
      >
        <button
          type="button"
          className="btn-glass-round-close"
          onClick={onClose}
          aria-label="Close pass"
        >
          ✕
        </button>

        {/* Printable / Downloadable Ticket */}
        <div className="dark-pass-ticket" id="printable-pass">
          {/* Top Header Strip */}
          <div className="pass-strip-header">
            <div className="pass-strip-brand">
              <EventEaseLogo size="sm" showWordmark={true} />
              <span className="entry-pass-badge">Official Entry Pass</span>
            </div>
            <div className="pass-strip-ref">
              <span className="ref-tiny-label">REGISTRATION CODE</span>
              <span className="ref-code-value">{registrationCode}</span>
            </div>
          </div>

          {/* Ticket Body Content */}
          <div className="pass-ticket-body">
            <h2 id="pass-title" className="pass-event-headline">
              {eventTitle}
            </h2>

            <div className="pass-fields-grid">
              <div className="pass-cell">
                <span className="cell-tiny-tag">ATTENDEE</span>
                <span className="cell-value-highlight">
                  {passData.participantName}
                </span>
              </div>

              <div className="pass-cell">
                <span className="cell-tiny-tag">CONFIRMED EMAIL</span>
                <span className="cell-value-plain">{passData.email}</span>
              </div>

              <div className="pass-cell">
                <span className="cell-tiny-tag">SCHEDULE</span>
                <span className="cell-value-plain">{formattedDate}</span>
              </div>

              <div className="pass-cell">
                <span className="cell-tiny-tag">VENUE</span>
                <span className="cell-value-plain">{venue}</span>
              </div>
            </div>

            {/* Perforated Divider Line with Notches */}
            <div className="pass-perforated-seam">
              <div className="seam-notch notch-l" />
              <div className="seam-dashed-line" />
              <div className="seam-notch notch-r" />
            </div>

            {/* Scannable Barcode Visual */}
            <div className="pass-barcode-cluster">
              <div className="barcode-bars-box" aria-hidden="true">
                <div className="barcode-lines" style={{ height: "44px", width: "100%", maxWidth: "340px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {renderCode39Barcode(registrationCode)}
                </div>
                <span className="barcode-text">{registrationCode}</span>
              </div>

              <div className="pass-instruction-text">
                <p>Present this digital pass at the check-in reception desk.</p>
                <span className="stamp-text">Issued: {issuedDateFormatted}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Feedback if PDF generation fails */}
        {downloadError && (
          <div className="pass-download-error" role="alert">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{downloadError}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="pass-footer-controls">
          <button
            type="button"
            className="btn-glass-print btn-glass-download"
            onClick={handleDownloadPass}
            disabled={isDownloading}
            aria-busy={isDownloading}
            title="Download Entry Pass as PDF"
          >
            {isDownloading ? (
              <>
                <span className="spinner-sm" aria-hidden="true" />
                <span>Generating Pass...</span>
              </>
            ) : (
              <>
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Download Pass</span>
              </>
            )}
          </button>
          <button
            type="button"
            className="btn-accent-done"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
