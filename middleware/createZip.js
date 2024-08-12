const axios = require('axios');
const puppeteer = require('puppeteer');
const ErrorHandler = require('../utils/errorHandler')
const { db } = require('../firebaseAdmin');
const htmlToDocx = require('html-to-docx')



// Fetch and convert document to specified file type
const fetchDocumentAndCreateZip = async (projectId, documentId, convertToFileType) => {
  const documentRef = db.collection('projects').doc(projectId).collection('files').doc(documentId);
  const doc = await documentRef.get();

  if (!doc.exists) {
    throw new ErrorHandler("Document Not Found", 404);
  }

  const { htmlUrl, pdfUrl, name } = doc.data();
  const htmlResponse = await axios.get(htmlUrl);
  let htmlContent = htmlResponse.data;

  if (!htmlContent) {
    throw new ErrorHandler("HTML content is empty or undefined", 500);
  }

  htmlContent = htmlContent.replace(/<!-- my page break -->/g, '<div style="page-break-after: always;"></div>');

  let convertedFileBuffer;
  let convertedFileName;

  if (convertToFileType === 'pdf') {
    convertedFileName = `${name.replace('.pdf', '')}Translation.pdf`;

    convertedFileBuffer = await htmlToPdf(htmlContent);
  } else if (convertToFileType === 'docx') {
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
    convertedFileName = `${name.replace('.pdf', '')}Translation.docx`;
  } else {
    throw new ErrorHandler("Invalid file type requested", 400);
  }

  return { convertedFileBuffer, convertedFileName, pdfUrl, name };
};

// const fetchDocumentAndCreateZip = async (projectId, documentId, convertToFileType) => {
//     const documentRef = db.collection('projects').doc(projectId).collection('files').doc(documentId);
//     const doc = await documentRef.get();

//     if (!doc.exists) {
//         throw new ErrorHandler("Document Not Found", 404);
//     }

//     const { htmlUrl, pdfUrl, name } = doc.data();

//     // Fetch the HTML content
//     const htmlResponse = await axios.get(htmlUrl);
//     let htmlContent = htmlResponse.data;

//     if (!htmlContent) {
//         return next(new ErrorHandler("HTML content is empty or undefined", 500));

//     }


//     // Replace custom page break comment with CSS-based page break
//     htmlContent = htmlContent.replace(/<!-- my page break -->/g, '<div style="page-break-after: always;"></div>');

//     let convertedFileBuffer;
//     let convertedFileName;

//     if (convertToFileType === 'pdf') {
//         convertedFileName = `${name.replace('.pdf', '')}Translation.pdf`;

//         // Generate the PDF in memory
//         convertedFileBuffer = await htmlToPdf(htmlContent);
//     } else if (convertToFileType === 'docx') {

//           htmlContent = `
//             <html>
//               <head>
//                 <style>
//                   body {
//                     font-family: 'Nirmala UI', sans-serif;
//                     line-height: 1.5;
//                   }
//                   p {
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
//         `;

//         // Define custom styles
//         const options = {
//             table: { row: { cantSplit: true } },
//             headingStyles: true,
//             paragraphStyles: {
//                 spacing: {
//                     after: 120, // Space after paragraphs (in twips; 1/20th of a point)
//                     line: 240,  // Line height (in twips; 240 = 1.5 lines)
//                 },
//             },
//             defaultParagraphSeparator: "p",
//             // font: "Arial", // Specify a default font
//             fontSize: 12,
//             bold: true,
//             italic: true,
//             underline: true,
//         };




//         convertedFileBuffer = await htmlToDocx(htmlContent, options).catch(err => {
//             return next(new ErrorHandler("Error during HTML to DOCX conversion: " + err.message, 500));

//         });
//         convertedFileName = `${name.replace('.pdf', '')}Translation.docx`;
//     }
//     else {
//         return next(new ErrorHandler("Invalid file type requested", 400));

//     }

//     return { convertedFileBuffer, convertedFileName, pdfUrl, name };
// };




// const getChromePath = async () => {
//   const chromeLauncher = await import('chrome-launcher');
//   const installations = await chromeLauncher.Launcher.getInstallations();


//   // chromeLauncher.Launcher.getInstallations().then(installations => {
//   //   console.log('Chrome/Chromium installations:', installations);
//   // }).catch(err => {
//   //   console.error('Error finding Chromium installations:', err);
//   // });

// };

const getChromePath = async () => {
  const chromeLauncher = await import('chrome-launcher');
  const installations = await chromeLauncher.Launcher.getInstallations();
  console.log('Chrome/Chromium installations:', installations);
  return installations[0]; // Assuming you want the first installation
};



const htmlToPdf = async (htmlContent) => {
  try {
    const chromePath = await getChromePath();
    console.log(chromePath)
    const browser = await puppeteer.launch({
      executablePath: chromePath || '/usr/bin/chromium-browser',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    // await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await page.setContent(`
            <html>
              <head>
                <style>
                 
                 body{
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
          `, { waitUntil: 'networkidle0' });

    // const pdfBuffer = await page.pdf({
    //     format: 'A4',
    //     margin: {
    //         top: '25mm',
    //         right: '25mm',
    //         bottom: '25mm',
    //         left: '25mm'
    //     }
    // });


    const pdfBuffer = await page.pdf({
      // width: '8.5in',    // Width for Legal size
      // height: '14in',    // Height for Legal size
      format: 'Legal',
      margin: {
        top: '25mm',
        right: '25mm',
        bottom: '25mm',
        left: '25mm'
      }
    });

    await browser.close();
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};


module.exports = { fetchDocumentAndCreateZip, htmlToPdf };
