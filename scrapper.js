const { JSDOM } = require("jsdom");
const axios = require("axios");
const { richTextFromMarkdown } = require("@contentful/rich-text-from-markdown");
const { client } = require("./lib/client.js");
const { contentfulSpaceId } = require("./constant.js");
const { URL } = require("url");
var TurndownService = require("turndown");
var turndownService = new TurndownService();
const {
  urls,
  fields,
  content_type_id,
  contentType,
  domains,
} = require("./config");
const { getFieldContent, getContentTypeField } = require("./field-types.js");
const fs = require("fs");

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
      console.error("===-==-=-=>>>error message", errorMsg);
    }
  );
}
// Clear the error.log file at the beginning
fs.writeFileSync("error.log", "");
const createNewAsset = async ({ pageURL, imageURL, title }) => {
  console.log("Uploading media...");
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
      console.log(`Image: ${title}. Uploaded to Contentful successfully!`);
      return asset;
    })
    .catch((error) => {
      const errorMessage = `Failed to upload media/image to contentful. Error: Invalid URL. ${error.message}. Page Ref: ${pageURL} `;
      logError(errorMessage);
      reject(errorMessage);
    });
};
// Function to scrape data from a single URL
function scrapeData(url) {
  console.log("Scrapping page content...");
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
              const body = document
                .querySelector(_field.selector)
                .innerHTML.trim();
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
              .textContent.trim();

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
            if (!!markdownBody && item.field === "content") {
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
  // console.log(
  //   "Creating New Entry",
  //   "Content Type id:",
  //   contentTypeID,
  //   "Fields:",
  //   fields
  // );

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

async function createContentType({ pageURL, data }) {
  console.log("Create new content...");
  let fields = data.map((_field) => getContentTypeField(_field));
  console.log("Content model fields=-=-=-=-", fields);

  try {
    // Create a new content model.
    return client.getSpace(contentfulSpaceId).then(async (space) => {
      return space.getEnvironment("master").then(async (env) => {
        return env
          .createContentTypeWithId(contentType?.contentTypeId, {
            name: contentType?.contentTypeName,
            fields,
          })
          .then(async (contentType) => {
            contentType.publish().then((_contentType) => {
              createNewEntry({
                pageURL,
                contentTypeID: _contentType?.sys?.id,
                data,
              })
                .then(async (entry) => {
                  if (entry?.fields?.slug["en-US"]) {
                    console.log(
                      `Page: ${entry?.fields?.slug["en-US"]} Created Successfully!`
                    );
                  }
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                })
                .catch((err) => {});
            });
          })
          .catch((error) => {
            const errorMessage = `Failed to create content type. Error: ${
              error?.message ?? ""
            }. Page Ref:${pageURL} `;
            console.log("-==-=-=-=errorMessage", errorMessage);
            // logError(errorMessage);
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

// Loop through the array of URLs and scrape data from each one

async function scrapeAllPages() {
  for (const url of urls) {
    scrapeData(url)
      .then(async (data) => {
        client
          .getSpace(contentfulSpaceId)
          .then((space) => space.getEnvironment("master"))
          .then((environment) =>
            environment.getContentType(contentType?.contentTypeId)
          )
          .then((contentType) => {
            createNewEntry({
              pageURL: url,
              contentTypeID: contentType?.sys.id,
              data,
            })
              .then(async (entry) => {
                if (entry?.fields?.slug["en-US"]) {
                  console.log(
                    `Page: ${entry?.fields?.slug["en-US"]} Created Successfully!`
                  );
                }
                await new Promise((resolve) => setTimeout(resolve, 1000));
              })
              .catch((err) => {});
          })
          .catch((err) => {
            console.log("ContentType not found!");
            createContentType({ pageURL: url, data }).then((res) => {});
          });
      })
      .catch((err) => {});
  }
}

// Start scraping all pages
scrapeAllPages();
