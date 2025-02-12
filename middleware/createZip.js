
const axios = require('axios');
// const path = require('path')
const puppeteer = require('puppeteer');
// const chromium = require('@sparticuz/chromium');
// const puppeteer = require('puppeteer-core');
const ErrorHandler = require('../utils/errorHandler')
const { db } = require('../firebaseAdmin');
const htmlToDocx = require('html-to-docx')
const { Storage } = require("@google-cloud/storage");
const storage = new Storage();
const bucketName = "bhasantar";




const fetchDocumentAndCreateZip = async (projectId, documentId, convertToFileType) => {
  const documentRef = db.collection('projects').doc(projectId).collection('files').doc(documentId);
  const doc = await documentRef.get();

  if (!doc.exists) {
    throw new ErrorHandler("Document Not Found", 404);
  }

  const { name } = doc.data();
  const htmlFileName = name.replace('.pdf', '.html');
  const htmlFilePath = `projects/${projectId}/${htmlFileName}`;
  const pdfFilePath = `projects/${projectId}/${name}`; // Assuming the PDF is stored as the original name

  const bucket = storage.bucket(bucketName);

  // Generate a signed URL for the HTML file
  const [htmlSignedUrl] = await bucket.file(htmlFilePath).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000 // 15 minutes expiration
  });

  // Fetch HTML content using the signed URL
  const htmlResponse = await axios.get(htmlSignedUrl);
  let htmlContent = htmlResponse.data;

  if (!htmlContent) {
    throw new ErrorHandler("HTML content is empty or undefined", 500);
  }

  // Replace custom page breaks with actual page breaks in the HTML
  htmlContent = htmlContent.replace(/<p([^>]*?)class="[^"]*\bline-indent\b[^"]*"([^>]*?)>/g, '<p$1$2>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');


  let convertedFileBuffer;
  let convertedFileName;
  // Convert to PDF or DOCX based on the request
  if (convertToFileType === 'pdf') {
    convertedFileName = `${name.replace('.pdf', '')}Translation.pdf`;
    convertedFileBuffer = await htmlToPdf(htmlContent);

  } else if (convertToFileType === 'docx') {
    convertedFileName = `${name.replace('.pdf', '')}.docx`;

    const options = {
      table: { row: { cantSplit: true } },
      headingStyles: true,
      paragraphStyles: {
        spacing: {
          after: 120,
          line: 240,
        },
      },
      defaultParagraphSeparator: "p",
      font: "Nirmala UI",
      fontSize: 12,
      bold: true,
      italic: true,
      underline: true,
      page: {
        size: {
          width: 12240,  // 8.5 inches in Twips (1 inch = 1440 Twips)
          height: 20160, // 14 inches in Twips
        },
        margin: {
          top: 1440,   // 1 inch margin (1440 Twips)
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
      throw new Error('Invalid input string');
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
          console.error('Error processing base64 image:', error);
          return match; // Return original img tag if processing fails
        }
      }
    )
    .replace(
      /class="ql-align-(center|right|left|justify)"/g, // Convert alignment classes to inline style
      (match, alignment) => `style="text-align: ${alignment};"`
    ) +
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

        // console.log('hi',styledHtmlContent)

    convertedFileBuffer = await htmlToDocx(styledHtmlContent, options).catch(err => {
      throw new ErrorHandler("Error during HTML to DOCX conversion: " + err.message, 500);
    });
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
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    await page.setContent(`
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
    `, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'Legal',
      margin: {
        top: '25mm',
        right: '25mm',
        bottom: '25mm',
        left: '25mm',
      },
    });

    // Log the generated buffer size
    console.log('Generated PDF Buffer size:', pdfBuffer.length);

    // Explicitly convert to a Buffer instance
    return Buffer.from(pdfBuffer);

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};


module.exports = { fetchDocumentAndCreateZip, htmlToPdf };

