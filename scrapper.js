const { JSDOM } = require("jsdom");
const axios = require("axios");
const { richTextFromMarkdown } = require("@contentful/rich-text-from-markdown");
const { client } = require("./lib/client.js");
const { contentfulSpaceId } = require("./constant.js");
const { URL } = require("url");
var TurndownService = require("turndown");
var turndownService = new TurndownService();
const { urls, fields, content_type_id, domains } = require("./config");
const { getFieldContent } = require("./field-types.js");

const contentTypeMapping = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};
const createNewAsset = async ({ url, title }) => {
  const urlObject = new URL(url);
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
              upload: url,
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
    .catch(console.error);
};
// Function to scrape data from a single URL
function scrapeData(url) {
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
          fieldType: "text",
          content: url.split("/").pop(),
        });

        fields.map((_field) => {
          if (_field?.required) {
            if (_field.field === "content") {
              const body = document
                .querySelector(_field.selector)
                .innerHTML.trim();
              markdownBody = turndownService.turndown(body??_field?.defaultValue);
              data.push({
                field: _field.field,
                fieldType: _field.fieldType,
              });
              return;
            }
            if (_field.field === "image") {
              const imageEl = document.querySelector(_field.selector);
              imgSrc = imageEl.getAttribute("src")??_field?.defaultValue;
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
              content:content??_field?.defaultValue,
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
              url: `${domains?.image_base_path}${imgSrc}`,
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
        reject(new Error(`Failed to fetch ${url}`));
      }
    } catch (error) {
      console.error(`Error while scraping ${url}:`, error.message);
    }
  });
}

// Function to send data to Contentful
async function createNewEntry(data) {

  
  let fields = {};
  data.map((_field) => {
    fields[_field?.field] = getFieldContent(_field);
  });
  
  try {
    // Create a new entry in Contentful with scraped data
    return client.getSpace(contentfulSpaceId).then(async (space) => {
      return space.getEnvironment("master").then(async (env) => {
        return env.createEntry(content_type_id, {fields}).then(async (entry) => {
          await entry.publish();
          return entry;
        });
      });
    });
  } catch (error) {
    console.error("Error creating entry on Contentful:", error);
  }
}

// Loop through the array of URLs and scrape data from each one

async function scrapeAllPages() {
  for (const url of urls) {
    scrapeData(url).then(async (data) => {
      createNewEntry(data).then(async (entry) => {
        console.log(
          `Page: ${entry?.fields?.slug["en-US"]} Created Successfully!`
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      });
    });
  }
}

// Start scraping all pages
scrapeAllPages();
