
const axios = require('axios');
// const path = require('path')
// // const puppeteer = require('puppeteer');
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
//     const browser = await puppeteer.launch({
//       executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ,
//       headless: false,
//       args: ['--no-sandbox', '--disable-setuid-sandbox'],
//     });
//     // console.log(`Chrome path: ${await browser.version()}`);
//     const page = await browser.newPage();
//     // await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
//     await page.setContent(`
//             <html>
//               <head>
//                 <style>
                 
//                  body{
//                     line-height: 1.5;
//                  }
                  
//                   p {
//                     line-height: 1.5;
//                     margin: 0;
//                   }
//                   h1, h2, h3, h4, h5, h6 {
//                     font-weight: bold;
//                     margin: 0 0 10px 0;
//                   }
//                 </style>
//               </head>
//               <body>${htmlContent}</body>
//             </html>
//           `, { waitUntil: 'networkidle0' });
//     const pdfBuffer = await page.pdf({
//       // width: '8.5in',    // Width for Legal size
//       // height: '14in',    // Height for Legal size
//       format: 'Legal',
//       margin: {
//         top: '25mm',
//         right: '25mm',
//         bottom: '25mm',
//         left: '25mm'
//       }
//     });
//     await browser.close();
//     return pdfBuffer;
//   } catch (error) {
//     console.error('Error generating PDF:', error);
//     throw error;
//   }
// };



const chromePdf = require('html-pdf-chrome');

const htmlToPdf = async (htmlContent) => {
  try {
    // Set options for the PDF generation
    const options = {
      format: 'Legal',
      margin: {
        top: '25mm',
        right: '25mm',
        bottom: '25mm',
        left: '25mm'
      },
      printOptions: {
        displayHeaderFooter: false
      }
    };

    // Convert HTML content to PDF using html-pdf-chrome
    const pdfBuffer = await chromePdf.create(htmlContent, options).then(pdf => pdf.toBuffer());

    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new ErrorHandler("Error during PDF generation: " + error.message, 500);
  }
};

module.exports = { fetchDocumentAndCreateZip, htmlToPdf };

