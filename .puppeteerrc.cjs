const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Store the browser binary inside node_modules so GAE packages it on deployment
  cacheDirectory: join(__dirname, 'node_modules', '.puppeteer_cache'),
};
