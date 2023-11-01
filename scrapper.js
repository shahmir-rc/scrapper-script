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
// Function to scrape data from a single URL
async function scrapeData(url, fields, domains) {
  consoleInfo(
    `${new Date().toLocaleString()}: Scrapping '${url}' content...)`
  );
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
        let markdownBody = "";

        data.push({
          field: "slug",
          fieldType: "Symbol",
          content: url.split("/").pop(),
        });

        fields.map((_field) => {
          if (_field?.required) {
            if (_field.fieldType.toLowerCase() === "rich text") {
              let body = document
                .querySelector(_field.selector)

              if (body) body.innerHTML.trim();

              markdownBody = turndownService.turndown(
                body ?? _field?.defaultValue
              );
              data.push({
                field: _field.field,
                fieldType: _field.fieldType,
              });
              return;
            }
            if (_field.fieldType.toLowerCase() === "media") {
              const imageEl = document.querySelector(_field.selector);
              imgSrc = imageEl.getAttribute("src") ?? _field?.defaultValue;
              imgTitle = imageEl.getAttribute("title");
              data.push({
                field: _field.field,
                fieldType: _field.fieldType,
              });
              return;
            }

            let content = document
              .querySelector(_field.selector)
            if (content) content.textContent.trim();

            data.push({
              field: _field.field,
              content: content ?? _field?.defaultValue,
              fieldType: _field.fieldType,
            });
          } else return;
        });

        let promises = [];
        if (markdownBody) {
          promises.push(richTextFromMarkdown(markdownBody));
        }
        if (imgSrc) {
          promises.push(
            createNewAsset({
              pageURL: url,
              imageURL: `${domains?.image_base_path}${imgSrc}`,
              title: imgTitle ?? "Untitled",
            })
          );
        }

        Promise.all([...promises]).then((values) => {
          let updatedData = data.map((item) => {
            if (!!markdownBody && item.field.includes("content")) {
              return { ...item, content: values[0] };
            }
            if (!!imgSrc && item.field === "image") {
              return {
                ...item,
                content: !!markdownBody ? values[1] : values[0],
              };
            }
            return item;
          });

          resolve(updatedData);
        });
      } else {
        const errorMessage = `Failed to scrape page content. Error: Invalid URL. 404. Page Ref: ${url} `;
        logError(errorMessage);
        reject(errorMessage);
      }
    } catch (error) {
      const errorMessage = `Failed to scrape page content. Error: Invalid URL. ${error.message}. Page Ref: ${url} `;
      logError(errorMessage);
      reject(errorMessage);
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
            const errorMessage = `Failed to create new entry on Contentful. Error: ${error?.message ?? ""
              }. Status: ${error?.status ?? ""}. Status Text: ${error?.statusText ?? ""
              }. Page Ref:${pageURL} `;
            logError(errorMessage);
          });
      });
    });
  } catch (error) {
    const errorMessage = `Failed to create new entry on Contentful. Error: ${error?.message ?? ""
      }. Page Ref:${pageURL} `;
    logError(errorMessage);
  }
}

async function createContentType({ pageURL, data, passedcontentType, passedfields }) {
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
              console.log("created content tyepe", _contentType?.sys?.id)
            });
          })
          .catch((error) => {
            const errorMessage = `Failed to create content type. Error: ${error?.message ?? ""
              }. Page Ref:${pageURL} `;
            console.log("-==-=-=-=errorMessage", errorMessage);
            logError(errorMessage);
          });
      });
    });
  } catch (error) {
    const errorMessage = `Failed to create new content model on Contentful. Error: ${error?.message ?? ""
      }. Page Ref:${pageURL} `;
    logError(errorMessage);
  }
}

// Loop through the array of URLs and scrape data from each one

async function scrapeAllPages(passedUrls, passedfields, passedcontentType, passeddomains, passedSlug) {
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
          .catch((err) => { });
        
      })
      .catch((err) => { });
  }
}

// Start scraping all pages
module.exports = {createNewEntry,logError, scrapeAllPages, createContentType, scrapeData };
