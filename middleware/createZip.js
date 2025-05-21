const axios = require("axios");
// const path = require('path')
const puppeteer = require("puppeteer");
// const chromium = require('@sparticuz/chromium');
// const puppeteer = require('puppeteer-core');
const ErrorHandler = require("../utils/errorHandler");
const { db } = require("../firebaseAdmin");
const htmlToDocx = require("html-to-docx");
const { Storage } = require("@google-cloud/storage");
const storage = new Storage();
const bucketName = "bhasantar";
const JSZip = require("jszip");
const { JSDOM } = require("jsdom"); // Add this at the top of your file

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
    throw new ErrorHandler("Document Not Found", 404);
  }

  const { name } = doc.data();
  const htmlFileName = name.replace(".pdf", ".html");
  const htmlFilePath = `projects/${projectId}/${htmlFileName}`;
  const pdfFilePath = `projects/${projectId}/${name}`; // Assuming the PDF is stored as the original name

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
    throw new ErrorHandler("HTML content is empty or undefined", 500);
  }

  // Replace custom page breaks with actual page breaks in the HTML
  htmlContent = htmlContent.replace(
    /<p([^>]*?)class="[^"]*\bline-indent\b[^"]*"([^>]*?)>/g,
    "<p$1$2>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
  );

  // NEW STEP: Replace the custom page break tag with one that the DOCX converter understands.
  // This replacement takes any <hr> tag with class "page-break" and replaces it
  // with a div that has "page-break-after: always;".
  htmlContent = htmlContent.replace(
    /<hr\s+class="page-break"[^>]*>/gi,
    '<div style="page-break-after: always;"></div>'
  );

  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  // Process tables to ensure they have explicit borders for MS Word
  const tables = document.querySelectorAll("table");
  tables.forEach((table) => {
    // Add border-collapse and full width
    table.setAttribute(
      "style",
      "border-collapse: collapse; width: 100%; border: 1px solid black;"
    );
    // Process all table rows
    const rows = table.querySelectorAll("tr");
    rows.forEach((row) => {
      row.setAttribute("style", "border: 1px solid black;");
      // Process all cells in this row
      const cells = row.querySelectorAll("td");
      cells.forEach((cell) => {
        // Add explicit border styling to each cell with !important to override other styles
        const existingStyle = cell.getAttribute("style") || "";
        cell.setAttribute(
          "style",
          `${existingStyle}; border: 1px solid black !important;`
        );
      });
    });
  });
  // Add explicit table CSS to the head
  const head = document.querySelector("head") || document.createElement("head");
  const tableStyle = document.createElement("style");
  tableStyle.textContent = `
    table { border-collapse: collapse; width: 100%; border: 1px solid black; }
    table tr { border: 1px solid black; }
    table td { border: 1px solid black; padding: 4px; }
  `;
  head.appendChild(tableStyle);
  if (!document.querySelector("head")) {
    document.documentElement.insertBefore(head, document.body);
  }

  const emTags = document.querySelectorAll("em");
  emTags.forEach((tag) => {
    // Create a new <span> for existing styles
    const span = document.createElement("span");
    const existingStyle = tag.getAttribute("style") || "";
    if (existingStyle) {
      span.setAttribute("style", existingStyle);
    }

    // Create an <i> tag for italics
    const italicTag = document.createElement("i");
    italicTag.innerHTML = tag.innerHTML;

    // Nest the <i> tag inside the <span>
    span.appendChild(italicTag);

    // Replace the original <em> tag with the new <span>
    tag.replaceWith(span);
  });

  // Process <strong> tags: replace with <span> and nested <strong>
  const strongTags = document.querySelectorAll("strong");
  strongTags.forEach((tag) => {
    const span = document.createElement("span");
    const existingStyle = tag.getAttribute("style") || "";
    if (existingStyle) {
      span.setAttribute("style", existingStyle);
    }
    const boldTag = document.createElement("strong");
    boldTag.innerHTML = tag.innerHTML;
    span.appendChild(boldTag);
    tag.replaceWith(span);
  });

  // Update the htmlContent with the modified DOM
  htmlContent = document.documentElement.outerHTML;

  let convertedFileBuffer;
  let convertedFileName;
  // Convert to PDF or DOCX based on the request
  if (convertToFileType === "pdf") {
    convertedFileName = `${name.replace(".pdf", "")}Translation.pdf`;
    convertedFileBuffer = await htmlToPdf(htmlContent);
  } else if (convertToFileType === "docx") {
    convertedFileName = `${name.replace(".pdf", "")}.docx`;

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
      htmlContent
        .replace(
          /<img[^>]+src="(data:image\/[^;]+;base64[^"]+)"[^>]*>/g, // Process base64 images
          (match, dataUri) => {
            try {
              const base64Data = extractBase64Data(dataUri);
              // No need to decode and re-encode, just use the extracted base64 data
              return `<img src="data:image/png;base64,${base64Data}">`;
            } catch (error) {
              console.error("Error processing base64 image:", error);
              return match; // Return original img tag if processing fails
            }
          }
        )
        .replace(
          /class="ql-align-(center|right|left|justify)"/g, // Convert alignment classes to inline style
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

    // console.log("html content : ", styledHtmlContent);

    convertedFileBuffer = await htmlToDocx(styledHtmlContent, options).catch(
      (err) => {
        throw new ErrorHandler(
          "Error during HTML to DOCX conversion: " + err.message,
          500
        );
      }
    );

    // Post-process the DOCX to apply legal page size and enforce 1.5 line-height
    convertedFileBuffer = await applyLegalPageSizeAndLineHeight(
      convertedFileBuffer
    );
  } else {
    throw new ErrorHandler("Invalid file type requested", 400);
  }
  // Return the converted file buffer, name, and original PDF path
  return { convertedFileBuffer, convertedFileName, pdfFilePath, name };
};

const htmlToPdf = async (htmlContent) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setContent(
      `
      <html>
        <head>
          <style>
            body { line-height: 1.5; }
            p { line-height: 1.5; margin: 0; }
            h1, h2, h3, h4, h5, h6 { font-weight: bold; margin: 0 0 10px 0; }
          </style>
        </head>
        <body>${htmlContent}</body>
      </html>
    `,
      { waitUntil: "networkidle0" }
    );

    const pdfBuffer = await page.pdf({
      format: "Legal",
      margin: {
        top: "25mm",
        right: "25mm",
        bottom: "25mm",
        left: "25mm",
      },
    });

    // Log the generated buffer size
    // console.log("Generated PDF Buffer size:", pdfBuffer.length);

    // Explicitly convert to a Buffer instance
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

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
