const { JSDOM } = require("jsdom");
const axios = require("axios");
const { richTextFromMarkdown } = require("@contentful/rich-text-from-markdown");
const { client } = require("./lib/client.js");
const { contentfulSpaceId } = require("./constant.js");
const { URL } = require("url");
var TurndownService = require("turndown");
var turndownService = new TurndownService();
// const { urls, fields, contentType, domains } = require("./config");
const { getFieldContent, getContentTypeField } = require("./field-types.js");
const fs = require("fs");
const { consoleSuccess, consoleInfo } = require("./utils/helpers.js");

const contentTypeMapping = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};
function logError(errorMsg) {
  fs.appendFile(
    "error.log",
    `${new Date().toLocaleString()}: ${errorMsg}\n`,
    (err) => {
      if (err) throw err;
      console.error(">>>Error message:", errorMsg);
    }
  );
}
// Clear the error.log file at the beginning
fs.writeFileSync("error.log", "");

const createNewAsset = async ({ pageURL, imageURL, title }) => {
  consoleInfo("Uploading media...");
  const urlObject = new URL(imageURL);
  const fileName = urlObject.pathname.split("/").pop();
  const fileExtension = fileName.split(".").pop().toLowerCase();
  const contentType =
    contentTypeMapping[fileExtension] || "application/octet-stream";

  return client
    .getSpace(contentfulSpaceId)
    .then((space) => space.getEnvironment("master"))
    .then((environment) =>
      environment.createAsset({
        fields: {
          title: {
            "en-US": title ?? "",
          },
          file: {
            "en-US": {
              contentType,
              fileName,
              upload: imageURL,
            },
          },
        },
      })
    )
    .then((asset) => asset.processForAllLocales())
    .then((asset) => {
      asset.publish();
      consoleSuccess(`Image: ${title}. Uploaded to Contentful successfully!`);
      return asset;
    })
    .catch((error) => {
      const errorMessage = `Failed to upload media/image to contentful. Error: Invalid URL. ${error.message}. Page Ref: ${pageURL} `;
      logError(errorMessage);
      reject(errorMessage);
    });
};

const fieldHandlers = {
  "rich text": async ({field, document}) => {
    let body = document.querySelector(field?.selector);

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
  reference: async ({url, field, document}) => {
    try {
      const res = await scrapeData({
        url,
        page: field?.contentModel,
        reference: field?.field,
      });
      return {
        field: field?.field,
        fieldType: field?.fieldType,
        fields: res,
      };
    } catch (error) {
      throw error;
    }
  },
  // Add more field type handlers as needed
};
// Function to scrape data from a single URL
async function scrapeData({ url, page, reference }) {
  consoleInfo(`${new Date().toLocaleString()}: Scrapping '${url}' content...)`);

  return new Promise(async (resolve, reject) => {
    try {
      const response = await axios.get(url);
      if (response.status === 200) {
        const html = response.data;
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Extract data from the page using DOM methods and provided selectors
        let data = [];

        let imgSrc = "";
        let imgTitle = "";
        let markdownBody = null;
        let tasks = [];

        // Created slug field
        // data.push({
        //   field: "slug",
        //   fieldType: "Symbol",
        //   content: url.split("/").pop(),
        // });

        const indexToUpdate = data.findIndex(
          (el) => el.reference === reference
        );


        const getFieldContent = (field) => {
          return new Promise(async (resolve, reject) => {
            try {
              if (
                field?.required &&
                fieldHandlers[field.fieldType.toLowerCase()]
              ) {
                try {
                  const result = await fieldHandlers[
                    field.fieldType.toLowerCase()
                  ]({url,field, document});
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
          page?.fields.map((_field) => getFieldContent(_field))
        );
        // Filter out empty objects from the results
        const filteredResults = results.filter(
          (result) => Object.keys(result).length > 0
        );

        console.log("=-=-=-=-=results", filteredResults);

        resolve(filteredResults); // Resolve the promise with the results
      } else {
        const errorMessage = `Failed to scrape page content. Error: Invalid URL. 404. Page Ref: ${url} `;
        logError(errorMessage);
        reject(new Error(errorMessage));
      }
    } catch (error) {
      const errorMessage = `Failed to scrape page content. Error: Invalid URL. ${error.message}. Page Ref: ${url} `;
      logError(errorMessage);
      reject(new Error(errorMessage));
    }
  });
}

// Function to send data to Contentful
async function createNewEntry({ pageURL, contentTypeID, data }) {
  let fields = {};
  data.map((_field) => {
    fields[_field?.field] = getFieldContent(_field);
  });

  try {
    // Create a new entry in Contentful with scraped data
    return client.getSpace(contentfulSpaceId).then(async (space) => {
      return space.getEnvironment("master").then(async (env) => {
        return env
          .createEntry(contentTypeID, { fields })
          .then(async (entry) => {
            await entry.publish();
            return entry;
          })
          .catch((error) => {
            const errorMessage = `Failed to create new entry on Contentful. Error: ${
              error?.message ?? ""
            }. Status: ${error?.status ?? ""}. Status Text: ${
              error?.statusText ?? ""
            }. Page Ref:${pageURL} `;
            logError(errorMessage);
          });
      });
    });
  } catch (error) {
    const errorMessage = `Failed to create new entry on Contentful. Error: ${
      error?.message ?? ""
    }. Page Ref:${pageURL} `;
    logError(errorMessage);
  }
}

async function createContentType({
  pageURL,
  data,
  passedcontentType,
  passedfields,
}) {
  let fields = data.map((_field) => getContentTypeField(_field));
  try {
    // Create a new content model.
    await client.getSpace(contentfulSpaceId).then(async (space) => {
      await space.getEnvironment("master").then(async (env) => {
        await env
          .createContentTypeWithId(passedcontentType?.contentTypeId, {
            name: passedcontentType?.contentTypeName,
            fields,
          })
          .then(async (contentType) => {
            await contentType.publish().then((_contentType) => {
              console.log("created content tyepe", _contentType?.sys?.id);
            });
          })
          .catch((error) => {
            const errorMessage = `Failed to create content type. Error: ${
              error?.message ?? ""
            }. Page Ref:${pageURL} `;
            console.log("-==-=-=-=errorMessage", errorMessage);
            logError(errorMessage);
          });
      });
    });
  } catch (error) {
    const errorMessage = `Failed to create new content model on Contentful. Error: ${
      error?.message ?? ""
    }. Page Ref:${pageURL} `;
    logError(errorMessage);
  }
}

// Loop through the array of URLs and scrape data from each one

async function scrapeAllPages(
  passedUrls,
  passedfields,
  passedcontentType,
  passeddomains
) {
  // const checkedUrls = []
  for (const url of passedUrls) {
    scrapeData(url, passedfields, passeddomains)
      .then(async (data) => {
        await createNewEntry({
          url,
          contentTypeID: passedcontentType.contentTypeId,
          data,
        })
          .then(async (entry) => {
            if (entry?.fields?.slug["en-US"]) {
              consoleSuccess(
                `New Entry: ${entry?.fields?.slug["en-US"]} Created Successfully!`
              );
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
          })
          .catch((err) => {});
      })
      .catch((err) => {});
  }
}

// Start scraping all pages
module.exports = { scrapeAllPages, createContentType };
