const { default: axios } = require("axios");
const { consoleInfo, consoleError } = require("./utils/helpers");
const { JSDOM } = require("jsdom");
const { richTextFromMarkdown } = require("@contentful/rich-text-from-markdown");
const { URL } = require("url");
var TurndownService = require("turndown");
var turndownService = new TurndownService();
const fs = require("fs");

function logError(errorMsg) {
  fs.appendFile(
    "error.log",
    `${new Date().toLocaleString()}: ${errorMsg}\n`,
    (err) => {
      if (err) throw err;
    }
  );
}

const fieldHandlers = {
  "rich text": async ({ field, document }) => {
    let body = document.querySelector(field?.selector?.element);

    if (body) body.innerHTML.trim();
    const content = await richTextFromMarkdown(
      turndownService.turndown(body ?? field?.defaultValue)
    );
    return {
      field: field?.field,
      fieldType: field?.fieldType,
      content,
    };
  },
  symbol: async ({ field, document }) => {
    let element = document.querySelector(field?.selector?.element);
    let content = "";
    if (element) {
      content = element.textContent.trim();
    }
    return {
      field: field?.field,
      fieldType: field?.fieldType,
      content,
    };
  },
  reference: async ({ field, document, contentModel }) => {
    let contentTypes = contentModel?.fields?.find(
      (_field) => _field?.field === field?.field
    )?.contentTypes;
    let data = [];
    for (const CM of contentTypes) {
      try {
        let childModelData = await scrapeData({
          document,
          contentModel: CM.contentType,
        });
        data.push(childModelData);
      } catch (error) {
        consoleError(error);
      }
    }
    return {
      field: field?.field,
      fieldType: field?.fieldType,
      data,
    };
  },
};

async function scrapeData({ document, contentModel }) {
  return new Promise(async (resolve, reject) => {
    try {
      // Created slug field
      // data.push({
      //   field: "slug",
      //   fieldType: "Symbol",
      //   content: url.split("/").pop(),
      // });
      const getFieldContent = (field) => {
        return new Promise(async (resolve, reject) => {
          try {
            if (fieldHandlers[field.fieldType.toLowerCase()]) {
              try {
                const result = await fieldHandlers[
                  field.fieldType.toLowerCase()
                ]({ field, document, contentModel });
                resolve(result);
              } catch (error) {
                reject(error);
              }
            } else {
              resolve({});
            }
          } catch (error) {
            reject(error);
          }
        });
      };

      const results = await Promise.all(
        contentModel?.scrapper?.selectors.map((_field) =>
          getFieldContent(_field)
        )
      );
      // Filter out empty objects from the results
      const filteredResults = results.filter(
        (result) => Object.keys(result).length > 0
      );
      let data = {
        contentTypeId: contentModel?.contentTypeId,
        fields: filteredResults,
      };
      resolve(data);
    } catch (error) {
      const errorMessage = `Failed to scrape page content. Error: Invalid URL. ${error.message}.`;
      logError(errorMessage);
      reject(new Error(errorMessage));
    }
  });
}

async function runScrapper({ url, contentModel }) {
  consoleInfo(`${new Date().toLocaleString()}: Scrapping '${url}' content...`);
  try {
    const response = await axios.get(url);
    if (response.status === 200) {
      const html = response.data;
      const dom = new JSDOM(html);
      const document = dom.window.document;
      return scrapeData({ document, contentModel });
    } else {
      const errorMessage = `Failed to fetch: ${url} `;
      logError(errorMessage);
    }
  } catch (error) {
    const errorMessage = `Failed to fetch: ${url} `;
    logError(errorMessage);
  }
}

module.exports = { scrapeData, runScrapper };
