const axios = require('axios');
const puppeteer = require('puppeteer');
const ErrorHandler = require('../utils/errorHandler')
const { db } = require('../firebaseAdmin');
const htmlToDocx = require('html-to-docx')



const fetchDocumentAndCreateZip = async (projectId, documentId, convertToFileType) => {
    const documentRef = db.collection('projects').doc(projectId).collection('files').doc(documentId);
    const doc = await documentRef.get();

    if (!doc.exists) {
        throw new ErrorHandler("Document Not Found", 404);
    }

    const { htmlUrl, pdfUrl, name } = doc.data();

    // Fetch the HTML content
    const htmlResponse = await axios.get(htmlUrl);
    let htmlContent = htmlResponse.data;

    if (!htmlContent) {
        return next(new ErrorHandler("HTML content is empty or undefined", 500));

    }

    // Replace custom page break comment with CSS-based page break
    htmlContent = htmlContent.replace(/<!-- my page break -->/g, '<div style="page-break-after: always;"></div>');

    let convertedFileBuffer;
    let convertedFileName;

    if (convertToFileType === 'pdf') {
        convertedFileName = `${name.replace('.pdf', '')}Translation.pdf`;

        // Generate the PDF in memory
        convertedFileBuffer = await htmlToPdf(htmlContent);
    } else if (convertToFileType === 'docx') {


        // Define custom styles
        const options = {
            paragraphStyles: {
                spacing: {
                    after: 120, // Space after paragraphs (in twips; 1/20th of a point)
                    line: 240,  // Line height (in twips; 240 = 1.5 lines)
                },
            },
        };

        convertedFileBuffer = await htmlToDocx(htmlContent, options).catch(err => {
            return next(new ErrorHandler("Error during HTML to DOCX conversion: " + err.message, 500));

        });
        convertedFileName = `${name.replace('.pdf', '')}Translation.docx`;
    }
    else {
        return next(new ErrorHandler("Invalid file type requested", 400));

    }

    return { convertedFileBuffer, convertedFileName, pdfUrl, name };
};



// const htmlToPdf = async (htmlContent) => {
//     const browser = await puppeteer.launch();
//     const page = await browser.newPage();
//     await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

//     // Set the margins for the PDF
//     const pdfBuffer = await page.pdf({
//         format: 'A4',
//         margin: {
//             top: '25mm',
//             right: '25mm',
//             bottom: '25mm',
//             left: '25mm'
//         }
//     });

//     await browser.close();
//     return pdfBuffer;
// };


const htmlToPdf = async (htmlContent) => {
    const browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
        // userDataDir: process.env.PUPPETEER_CACHE_DIR || '/path/to/your/cache',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
            top: '25mm',
            right: '25mm',
            bottom: '25mm',
            left: '25mm'
        }
    });

    await browser.close();
    return pdfBuffer;
};




module.exports = { fetchDocumentAndCreateZip, htmlToPdf };
