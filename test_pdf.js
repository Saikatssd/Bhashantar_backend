const fs = require('fs');
const path = require('path');
const { htmlToPdf } = require('./middleware/createZip');

const testHtml = `
<p>This is a test of <strong>Bold Nirmala UI</strong> and <em>Italic Nirmala UI</em>.</p>
<p style="line-height: 1.5; font-family: nirmala-ui;">Line height 1.5 test.</p>
<hr class="page-break" />
<p>After page break.</p>
`;

async function run() {
  try {
    const pdfBuffer = await htmlToPdf(testHtml);
    fs.writeFileSync(path.join(__dirname, 'test_output.pdf'), pdfBuffer);
    console.log('PDF generated at test_output.pdf');
  } catch (err) {
    console.error('Error generating PDF:', err);
  }
}

run();
