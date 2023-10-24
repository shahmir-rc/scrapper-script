const { default: puppeteer } = require("puppeteer");

const consoleSuccess = (message) =>
  console.log(
    "\x1b[32m%s\x1b[0m",
    `${new Date().toLocaleString()}: ${message}`
  ); // Green color
const consoleInfo = (message) =>
  console.log(
    "\x1b[34m%s\x1b[0m",
    `${new Date().toLocaleString()}: ${message}`
  );

// Scrape Dynamic Content
async function scrapeDynamicContent({ pageURL, pageSelector, attributes }) {
  const browser = await puppeteer.launch({ headless: "new",timeout:80000 });
  const page = await browser.newPage();

  try {
    await page.goto(pageURL);
    await page.waitForSelector(pageSelector);

    const result = await Promise.all(
      attributes.map(async (attr) => {
        const value = await page.evaluate(
          (selector, attribute) => {
            const element = document.querySelector(selector);
            return element ? element.getAttribute(attribute) : null;
          },
          pageSelector,
          attr.attribute
        );

        return { attribute: attr.attribute, value };
      })
    );

    return result;
  } catch (error) {
    throw error;
  } finally {
    await browser.close();
  }
}
module.exports = { consoleSuccess, consoleInfo, scrapeDynamicContent };
