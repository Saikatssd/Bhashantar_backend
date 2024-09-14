const axios = require('axios');
// const puppeteer = require('puppeteer');
const ErrorHandler = require('../utils/errorHandler')
const { db } = require('../firebaseAdmin');
const htmlToDocx = require('html-to-docx')
const { Storage } = require("@google-cloud/storage");
const storage = new Storage();
const bucketName = "bhasantar";
const pdf = require('html-pdf-node');
// const chromium = require('@sparticuz/chromium');
// const puppeteer = require('puppeteer-core');



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
  // htmlContent = htmlContent.replace(/<!-- my page break -->/g, '<div style="page-break-after: always;"></div>');

  let convertedFileBuffer;
  let convertedFileName;

  // Convert to PDF or DOCX based on the request
  if (convertToFileType === 'pdf') {
    convertedFileName = `${name.replace('.pdf', '')}Translation.pdf`;
    convertedFileBuffer = await htmlToPdf(htmlContent);
  } else if (convertToFileType === 'docx') {
    convertedFileName = `${name.replace('.pdf', '')}Translation.docx`;

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
              <body>${htmlContent}</body>
            </html>
        `;

    convertedFileBuffer = await htmlToDocx(styledHtmlContent, options).catch(err => {
      throw new ErrorHandler("Error during HTML to DOCX conversion: " + err.message, 500);
    });
  } else {
    throw new ErrorHandler("Invalid file type requested", 400);
  }

  // Return the converted file buffer, name, and original PDF path
  return { convertedFileBuffer, convertedFileName, pdfFilePath, name };
};

// const htmlToPdf = async (htmlContent) => {
//   try {
//     console.log('Starting Puppeteer...');
//     console.log("path", await chromium.executablePath())

//     const browser = await puppeteer.launch({
//       executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || await chromium.executablePath(),
//       headless: true, // Always use headless in server environments
//       args: [
//         ...chromium.args,
//         '--no-sandbox',
//         '--disable-gpu',
//         '--disable-dev-shm-usage',
//         '--disable-setuid-sandbox',
//       ],
//       defaultViewport: chromium.defaultViewport,
//     });

//     console.log(`Chrome version: ${await browser.version()}`);

//     const page = await browser.newPage();

//     // Wait for the page to fully load
//     await page.setContent(`
//       <html>
//         <head>
//           <style>
//              @font-face {
//                 font-family: 'Nirmala UI';
//                 src: url('/fonts/NirmalaUI.ttf') format('truetype');
//                 font-weight: normal;
//                 font-style: normal;
//             }
//             body {
//               line-height: 1.5;
//               font-family: 'Nirmala UI', sans-serif;
//             }
//             p {
//               line-height: 1.5;
//               margin: 0;
//             }
//             h1, h2, h3, h4, h5, h6 {
//               font-weight: bold;
//               margin: 0 0 10px 0;
//             }
//           </style>
//         </head>
//         <body>${htmlContent}</body>
//       </html>
//     `, { waitUntil: 'networkidle0' });

//     // Generate PDF
//     const pdfBuffer = await page.pdf({
//       format: 'Legal',
//       margin: {
//         top: '25mm',
//         right: '25mm',
//         bottom: '25mm',
//         left: '25mm',
//       },
//       printBackground: true,  // Ensures background colors and images are included in the PDF
//     });

//     await browser.close();
//     return pdfBuffer;
//   } catch (error) {
//     console.error('Error generating PDF:', error.message);
//     throw new Error('Error generating PDF: ' + error.message);
//   }
// };





const htmlToPdf = async (htmlContent) => {
  try {
    const options = {
      format: 'Legal',
      margin: {
        top: '25mm',
        right: '25mm',
        bottom: '25mm',
        left: '25mm',
      }
    };

    const file = { content: htmlContent };
    const pdfBuffer = await pdf.generatePdf(file, options);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Failed to generate PDF: Empty PDF buffer');
    }

    // Return the PDF buffer
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error.message);
    throw new ErrorHandler('Error generating PDF: ' + error.message, 500);
  }
  //  finally {
  //   // Ensure proper cleanup of temp files
  //   try {
  //     const tempDir = 'C:\\Users\\Saikat\\AppData\\Local\\Temp\\puppeteer_dev_chrome_profile-ytgBnh\\Default';
  //     const fs = require('fs');
  //     if (fs.existsSync(tempDir)) {
  //       fs.rmdirSync(tempDir, { recursive: true });
  //       console.log('Temp directory cleaned up:', tempDir);
  //     }
  //   } catch (cleanupError) {
  //     console.error('Error during temp file cleanup:', cleanupError.message);
  //   }
  // }
};
 

module.exports = { fetchDocumentAndCreateZip, htmlToPdf };
