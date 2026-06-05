const axios = require("axios");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const ErrorHandler = require("../utils/errorHandler");
const { db } = require("../firebaseAdmin");
const htmlToDocx = require("html-to-docx");
const { Storage } = require("@google-cloud/storage");
const storage = new Storage();
const bucketName = "bhasantar";
const JSZip = require("jszip");
const { JSDOM } = require("jsdom");

// ---------------------------------------------------------------------------
// Font Embedding Utility
// ---------------------------------------------------------------------------

/**
 * Reads Nirmala UI font files from disk and returns base64-encoded @font-face CSS.
 * Results are cached after first read to avoid repeated file I/O.
 */
let _fontCache = null;
function getEmbeddedFontCSS() {
  if (_fontCache) return _fontCache;

  const fontsDir = path.join(__dirname, "..", "public", "fonts");
  const fonts = [
    {
      family: "Nirmala UI",
      file: "Nirmala.ttf",
      weight: "normal",
      style: "normal",
    },
    {
      family: "Nirmala UI",
      file: "Nirmala-Bold.ttf",
      weight: "bold",
      style: "normal",
    },
    {
      family: "Nirmala UI",
      file: "Nirmala-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      family: "Nirmala UI",
      file: "Nirmala-Bold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      family: "Nirmala UI",
      file: "Nirmala-Bold.ttf",
      weight: "900",
      style: "normal",
    },
    {
      family: "nirmala-ui",
      file: "Nirmala.ttf",
      weight: "normal",
      style: "normal",
    },
    {
      family: "nirmala-ui",
      file: "Nirmala-Bold.ttf",
      weight: "bold",
      style: "normal",
    },
    {
      family: "nirmala-ui",
      file: "Nirmala-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      family: "nirmala-ui",
      file: "Nirmala-Bold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      family: "nirmala-ui",
      file: "Nirmala-Bold.ttf",
      weight: "900",
      style: "normal",
    },
  ];

  const fontFaces = fonts.map((f) => {
    const filePath = path.join(fontsDir, f.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`Font file not found: ${filePath}`);
      return "";
    }
    const base64 = fs.readFileSync(filePath).toString("base64");
    return `
      @font-face {
        font-family: '${f.family}';
        src: url(data:font/truetype;base64,${base64}) format('truetype');
        font-weight: ${f.weight};
        font-style: ${f.style};
        font-display: swap;
      }`;
  });

  _fontCache = fontFaces.join("\n");
  return _fontCache;
}

// ---------------------------------------------------------------------------
// PDF HTML Template Builder
// ---------------------------------------------------------------------------

/**
 * Wraps editor HTML in a complete document with embedded Nirmala UI fonts,
 * editor-matching CSS, and @page rules for Legal page size.
 * No page-break handling — PDF flows naturally.
 */
function buildPdfHtml(editorHtml) {
  const fontCSS = getEmbeddedFontCSS();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    /* === Embedded Nirmala UI Fonts === */
    ${fontCSS}

    /* === Page Layout === */
    @page {
      size: Legal;
      margin: 25mm;
    }

    * { box-sizing: border-box; }

    /* Override all text elements to force Nirmala UI and line height */
    body, p, span, div, td, th, li, a, h1, h2, h3, h4, h5, h6 {
      font-family: 'Nirmala UI', 'nirmala-ui', sans-serif !important;
      line-height: 1.5 !important;
    }

    body {
      font-size: 12pt;
      line-height: 1.5 !important;
      color: #000000;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* === Typography & Spacing === */
    body, p, span, div, td, th, li {
      white-space: pre-wrap;
    }

    p { margin: 0; }
    h1, h2, h3, h4, h5, h6 { font-weight: 800; margin: 0 0 10px 0; }

    /* === Quill / Editor Alignment Classes === */
    .ql-align-center { text-align: center !important; }
    .ql-align-right { text-align: right !important; }
    .ql-align-justify { text-align: justify !important; }
    .ql-align-left { text-align: left !important; }

    /* === Quill / Editor Indentation Classes === */
    .ql-indent-1 { padding-left: 3em !important; }
    .ql-indent-2 { padding-left: 6em !important; }
    .ql-indent-3 { padding-left: 9em !important; }
    .ql-indent-4 { padding-left: 12em !important; }
    .ql-indent-5 { padding-left: 15em !important; }
    .ql-indent-6 { padding-left: 18em !important; }
    .ql-indent-7 { padding-left: 21em !important; }
    .ql-indent-8 { padding-left: 24em !important; }

    /* === Tables (matching editor styles) === */
    table {
      border-collapse: collapse !important;
      width: 99.5% !important; /* Avoids right border clipping in PDF */
      max-width: 99.5% !important;
      margin: 12px auto !important;
      table-layout: fixed !important;
      word-wrap: break-word !important;
    }
    td, th {
      border: 1px solid #000000 !important;
      padding: 5px 10px !important;
      word-wrap: break-word !important;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
      white-space: pre-wrap !important;
    }

    /* === Lists === */
    ul, ol { margin: 0.5em 0; padding-left: 2em; }
    li { line-height: inherit; }

    /* === Helper / Editor elements to hide in PDF === */
    hr.page-break {
      display: none !important;
    }
    
    strong, b,
    [style*="font-weight: bold" i],
    [style*="font-weight:bold" i],
    [style*="font-weight: bolder" i],
    [style*="font-weight:bolder" i],
    [style*="font-weight: 600" i],
    [style*="font-weight:600" i],
    [style*="font-weight: 700" i],
    [style*="font-weight:700" i],
    [style*="font-weight: 800" i],
    [style*="font-weight:800" i],
    [style*="font-weight: 900" i],
    [style*="font-weight:900" i] {
      font-weight: 900 !important;
      -webkit-text-stroke: 0.28px currentColor;
      text-shadow:
        0.18px 0 0 currentColor,
        -0.18px 0 0 currentColor,
        0 0.12px 0 currentColor;
    }
    em, i { font-style: italic !important; }

    /* === Images === */
    img {
      max-width: 100%;
      height: auto;
      margin: 8px 0;
    }

    /* === Links === */
    a { color: #0563C1; text-decoration: underline; }
  </style>
</head>
<body>${editorHtml}</body>
</html>`;
}

// ---------------------------------------------------------------------------
// HTML Normalization Layer
// ---------------------------------------------------------------------------

/**
 * Normalizes HTML for both PDF and DOCX pipelines.
 * Bridges editor inline styles and Quill classes to a canonical format.
 */
function normalizeHtml(rawHtml) {
  const dom = new JSDOM(rawHtml);
  const document = dom.window.document;

  // 1. Normalize execCommand inline styles
  const bTags = document.querySelectorAll("b, strong");
  bTags.forEach((tag) => {
    const strong = document.createElement("strong");
    strong.setAttribute("style", tag.getAttribute("style") || "");
    strong.innerHTML = tag.innerHTML;
    tag.replaceWith(strong);
  });

  const iTags = document.querySelectorAll("i, em");
  iTags.forEach((tag) => {
    const em = document.createElement("em");
    em.setAttribute("style", tag.getAttribute("style") || "");
    em.innerHTML = tag.innerHTML;
    tag.replaceWith(em);
  });

  const uTags = document.querySelectorAll("u");
  uTags.forEach((tag) => {
    const u = document.createElement("u");
    u.setAttribute("style", tag.getAttribute("style") || "");
    u.innerHTML = tag.innerHTML;
    tag.replaceWith(u);
  });

  // 2. Normalize font-family values
  const elementsWithStyle = document.querySelectorAll("[style]");
  elementsWithStyle.forEach((el) => {
    let style = el.getAttribute("style");
    if (style.match(/font-family:\s*nirmala-ui/i)) {
      style = style.replace(
        /font-family:\s*nirmala-ui/gi,
        "font-family: 'Nirmala UI'"
      );
    }

    style = style.replace(
      /font-weight\s*:\s*(bold|bolder|[6-9]00)\b/gi,
      "font-weight: 900"
    );

    el.setAttribute("style", style);
  });

  // 3. Table normalization
  const tables = document.querySelectorAll("table");
  tables.forEach((table) => {
    let tableStyle = table.getAttribute("style") || "";
    tableStyle = tableStyle.replace(/width:\s*[^;]+;/gi, ""); // Remove inline widths
    
    table.setAttribute(
      "style",
      `${tableStyle}; border-collapse: collapse !important; width: 99.5% !important; max-width: 99.5% !important; margin: 12px auto !important; table-layout: fixed !important; border: 1px solid black !important;`
    );
    const rows = table.querySelectorAll("tr");
    rows.forEach((row) => {
      row.setAttribute("style", "border: 1px solid black !important;");
      const cells = row.querySelectorAll("td, th");
      cells.forEach((cell) => {
        let existingStyle = cell.getAttribute("style") || "";
        existingStyle = existingStyle.replace(/width:\s*[^;]+;/gi, ""); // Remove inline widths
        cell.setAttribute(
          "style",
          `${existingStyle}; border: 1px solid black !important; padding: 4px !important; word-break: break-word !important; overflow-wrap: anywhere !important; white-space: pre-wrap !important;`
        );
        if (!cell.innerHTML.trim()) {
          cell.innerHTML = "&nbsp;";
        }
      });
    });
  });

  return document.documentElement.outerHTML;
}

// ---------------------------------------------------------------------------
// DOCX Preprocessing (DOM mutations for Word compatibility)
// ---------------------------------------------------------------------------

function preprocessForDocx(htmlContent) {
  let normalized = normalizeHtml(htmlContent);

  // Replace page breaks for DOCX
  normalized = normalized.replace(
    /<hr\s+class="page-break"[^>]*>/gi,
    '<div style="page-break-after: always;"></div>'
  );

  const dom = new JSDOM(normalized);
  const document = dom.window.document;

  // Process <em> tags: replace with <span> and nested <i>
  const emTags = document.querySelectorAll("em");
  emTags.forEach((tag) => {
    const span = document.createElement("span");
    const existingStyle = tag.getAttribute("style");
    if (existingStyle) {
      span.setAttribute("style", existingStyle);
    }
    const italicTag = document.createElement("i");
    italicTag.innerHTML = tag.innerHTML;
    span.appendChild(italicTag);
    tag.replaceWith(span);
  });

  // Process <strong> tags: replace with <span> and nested <strong>
  const strongTags = document.querySelectorAll("strong");
  strongTags.forEach((tag) => {
    const span = document.createElement("span");
    const existingStyle = tag.getAttribute("style");
    if (existingStyle) {
      span.setAttribute("style", existingStyle);
    }
    const boldTag = document.createElement("strong");
    boldTag.innerHTML = tag.innerHTML;
    span.appendChild(boldTag);
    tag.replaceWith(span);
  });

  return document.documentElement.outerHTML;
}

// ---------------------------------------------------------------------------
// Main Pipeline
// ---------------------------------------------------------------------------

const fetchDocumentAndCreateZip = async (
  projectId,
  documentId,
  convertToFileType
) => {
  const documentRef = db
    .collection("projects")
    .doc(projectId)
    .collection("files")
    .doc(documentId);
  const doc = await documentRef.get();

  if (!doc.exists) {
    throw new ErrorHandler(
      "We couldn't find this document. Please refresh the page and try again.",
      404
    );
  }

  const { name } = doc.data();
  const htmlFileName = name.replace(".pdf", ".html");
  const htmlFilePath = `projects/${projectId}/${htmlFileName}`;
  const pdfFilePath = `projects/${projectId}/${name}`;

  const bucket = storage.bucket(bucketName);

  // Generate a signed URL for the HTML file
  const [htmlSignedUrl] = await bucket.file(htmlFilePath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes expiration
  });

  // Fetch HTML content using the signed URL
  const htmlResponse = await axios.get(htmlSignedUrl);
  let htmlContent = htmlResponse.data;

  if (!htmlContent) {
    throw new ErrorHandler(
      "This document has no saved content to convert. Please save it and try the download again.",
      400
    );
  }

  // Common preprocessing: convert line-indent classes to non-breaking spaces
  htmlContent = htmlContent.replace(
    /<p([^>]*?)class="[^"]*\bline-indent\b[^"]*"([^>]*)>/g,
    "<p$1$2>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
  );

  let convertedFileBuffer;
  let convertedFileName;

  // ---- PDF Path (clean HTML → embedded fonts → Puppeteer) ----
  if (convertToFileType === "pdf") {
    convertedFileName = `bn_${name.replace(".pdf", "")}.pdf`;
    convertedFileBuffer = await htmlToPdf(htmlContent);

    // ---- DOCX Path (DOM mutations for Word compatibility) ----
  } else if (convertToFileType === "docx") {
    convertedFileName = `${name.replace(".pdf", "")}.docx`;

    // Apply DOCX-specific DOM mutations
    const docxHtml = preprocessForDocx(htmlContent);

    const options = {
      table: { row: { cantSplit: true } },
      headingStyles: true,
      paragraphStyles: {
        spacing: {
          after: 120,
          line: 360,
        },
      },
      defaultParagraphSeparator: "p",
      fonts: [
        {
          name: "Nirmala UI",
          fallback: "sans-serif",
        },
      ],
      fontSize: 12,
      bold: true,
      italic: true,
      underline: true,
      page: {
        size: {
          width: 12240, // 8.5 inches in Twips (1 inch = 1440 Twips)
          height: 20160, // 14 inches in Twips
        },
        margin: {
          top: 1440, // 1 inch margin (1440 Twips)
          right: 1440,
          bottom: 1440,
          left: 1440,
        },
      },
    };

    const extractBase64Data = (dataUri) => {
      const matches = dataUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        return matches[2];
      }
      throw new Error("Invalid input string");
    };

    // Process images in HTML content
    const processedHtmlContent =
      `<div style="line-height: 1.5;">` +
      docxHtml
        .replace(
          /<img[^>]+src="(data:image\/[^;]+;base64[^"]+)"[^>]*>/g,
          (match, dataUri) => {
            try {
              const base64Data = extractBase64Data(dataUri);
              return `<img src="data:image/png;base64,${base64Data}">`;
            } catch (error) {
              console.error("Error processing base64 image:", error);
              return match;
            }
          }
        )
        .replace(
          /class="ql-align-(center|right|left|justify)"/g,
          (match, alignment) => `style="text-align: ${alignment};"`
        )
        .replace(/font-family:\s*nirmala-ui/gi, "font-family: Nirmala UI") +
      `</div>`;

    // Inject Nirmala UI font style directly into the HTML content
    const styledHtmlContent = `
            <html>
              <head>
                <style>
                  @font-face {
                      font-family: 'Nirmala UI';
                      src: url('/fonts/NirmalaUI.ttf') format('truetype');
                      font-weight: normal;
                      font-style: normal;
                  }
                  body {
                    font-family: 'Nirmala UI', sans-serif;
                    line-height: 1.5;
                  }
                  p {
                    line-height: 1.5;
                    margin: 0;
                  }
                  h1, h2, h3, h4, h5, h6 {
                    font-weight: bold;
                    margin: 0 0 10px 0;
                  }
                </style>
              </head>
              <body>${processedHtmlContent}</body>
            </html>
        `;

    convertedFileBuffer = await htmlToDocx(styledHtmlContent, options).catch(
      (err) => {
        throw new ErrorHandler(
          "We couldn't prepare the DOCX download right now. Please try again in a moment.",
          500
        );
      }
    );

    // Post-process the DOCX to apply legal page size and enforce 1.5 line-height
    convertedFileBuffer = await applyLegalPageSizeAndLineHeight(
      convertedFileBuffer
    );
  } else {
    throw new ErrorHandler("Invalid download type requested.", 400);
  }

  // Return the converted file buffer, name, and original PDF path
  return { convertedFileBuffer, convertedFileName, pdfFilePath, name };
};

// ---------------------------------------------------------------------------
// PDF Generation (Puppeteer with embedded fonts and pooling)
// ---------------------------------------------------------------------------

let browserInstance = null;
let browserLock = false;
const BROWSER_REUSE_LIMIT = 50;
let browserUseCount = 0;

async function getBrowser() {
  if (browserInstance && browserUseCount < BROWSER_REUSE_LIMIT) {
    return browserInstance;
  }
  while (browserLock) {
    await new Promise((r) => setTimeout(r, 100));
  }
  browserLock = true;
  try {
    if (browserInstance) {
      await browserInstance.close().catch(() => {});
    }
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--font-render-hinting=none",
        "--force-color-profile=srgb",
        "--disable-dev-shm-usage",
        "--single-process",
        "--disable-gpu",
        "--no-zygote",
      ],
      timeout: 30000,
    });
    browserUseCount = 0;
    return browserInstance;
  } finally {
    browserLock = false;
  }
}

const htmlToPdf = async (htmlContent) => {
  let page = null;
  try {
    const normalized = normalizeHtml(htmlContent);
    const fullHtml = buildPdfHtml(normalized);

    const browser = await getBrowser();
    browserUseCount++;

    page = await browser.newPage();

    // Set content and wait for it to load
    await page.setContent(fullHtml, {
      waitUntil: "load",
      timeout: 30000,
    });

    // CRITICAL: Explicitly wait for font rasterization and force reflow
    await page.evaluate(async () => {
      await document.fonts.ready;
      document.body.style.display = "none";
      document.body.offsetHeight; // trigger reflow
      document.body.style.display = "";
    });

    // Validate fonts
    const loadedFonts = await page.evaluate(() => {
      return [...document.fonts].map((f) => f.family);
    });
    console.log("Fonts loaded for PDF:", loadedFonts);
    const hasNirmala = loadedFonts.some((f) =>
      f.toLowerCase().includes("nirmala")
    );
    if (!hasNirmala) {
      console.warn("Nirmala UI font NOT loaded — Bengali may render as tofu");
    }

    const pdfBuffer = await page.pdf({
      format: "Legal",
      margin: {
        top: "25mm",
        right: "25mm",
        bottom: "25mm",
        left: "25mm",
      },
      printBackground: true,
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    if (browserInstance) {
      browserInstance.close().catch(() => {});
      browserInstance = null;
    }
    if (error instanceof ErrorHandler) {
      throw error;
    }
    throw new ErrorHandler(
      "We couldn't prepare the PDF download right now. Please try again in a moment.",
      500
    );
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
};

// ---------------------------------------------------------------------------
// DOCX Post-Processing
// ---------------------------------------------------------------------------

/**
 * Applies legal page size and hardcodes line-height to 1.5 for a DOCX file buffer.
 *
 * For legal page size, it modifies the <w:pgSz> element in word/document.xml by
 * replacing w:h="15840" with w:h="20160" (when w:w="12240").
 *
 * To enforce a line-height of 1.5, it updates all <w:spacing> tags in document.xml,
 * forcing w:line="360" and w:lineRule="auto", and also adjusts the "Normal" style in styles.xml.
 *
 * @param {Buffer} docxBuffer - The generated DOCX file buffer.
 * @returns {Promise<Buffer>} - The updated DOCX file buffer.
 */
async function applyLegalPageSizeAndLineHeight(docxBuffer) {
  const zip = await JSZip.loadAsync(docxBuffer);

  // --- Update page size in word/document.xml ---
  const documentXmlPath = "word/document.xml";
  let documentXml = await zip.file(documentXmlPath).async("string");

  // Replace the page height from 15840 (US Letter) to 20160 (US Legal) if the width is 12240
  documentXml = documentXml.replace(
    /(<w:pgSz\s+[^>]*w:w="12240"[^>]*w:h=")15840(")/,
    "$1" + "20160" + "$2"
  );

  // Enforce a line-height of 1.5 (assuming single line is 240, so 240*1.5 = 360) in all spacing tags.
  // We remove any existing w:line and w:lineRule attributes so we can add our own.
  documentXml = documentXml.replace(
    /<w:spacing([^>]*)\/>/g,
    (_match, attrs) => {
      let newAttrs = attrs.replace(/\bw:line="[^"]*"/g, "");
      newAttrs = newAttrs.replace(/\bw:lineRule="[^"]*"/g, "");
      // Append the desired line spacing attributes (360 for 1.5 line spacing)
      return `<w:spacing${newAttrs} w:line="360" w:lineRule="auto"/>`;
    }
  );

  // Write back the modified document.xml
  zip.file(documentXmlPath, documentXml);

  // --- Update line spacing in styles.xml (for the standard "Normal" paragraph style) ---
  const stylesXmlPath = "word/styles.xml";
  if (zip.file(stylesXmlPath)) {
    let stylesXml = await zip.file(stylesXmlPath).async("string");

    // Modify the "Normal" style, which is commonly used for paragraphs.
    // This regex searches for the Normal style and replaces any existing <w:spacing .../> tag.
    stylesXml = stylesXml.replace(
      /(<w:style\s+[^>]*w:styleId="Normal"[^>]*>[\s\S]*?<w:pPr>)([\s\S]*?)(<\/w:pPr>)/,
      (match, start, inner, end) => {
        // Remove any existing spacing tag
        inner = inner.replace(/<w:spacing[^>]*\/>/g, "");
        // Insert a spacing tag that forces 1.5 line spacing
        const spacingTag = '<w:spacing w:line="360" w:lineRule="auto"/>';
        return start + spacingTag + end;
      }
    );

    // Write back the modified styles.xml
    zip.file(stylesXmlPath, stylesXml);
  }

  // Generate the updated DOCX file buffer and return it
  return await zip.generateAsync({ type: "nodebuffer" });
}

module.exports = { fetchDocumentAndCreateZip, htmlToPdf };
