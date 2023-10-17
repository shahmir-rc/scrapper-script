const { JSDOM } = require("jsdom");
const axios = require("axios");
const { richTextFromMarkdown } = require("@contentful/rich-text-from-markdown");
const { client } = require("./lib/client.js");
const { contentfulSpaceId } = require("./constant.js");
const { URL } = require("url");
var TurndownService = require("turndown");
var turndownService = new TurndownService();
const { urls, selectors, content_type_id, domains } = require("./config");

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
        let data = {};
        data.slug = url.split("/").pop();
        // Optional selectors
        if (selectors.title) {
          data.title = document
            .querySelector(selectors.title)
            .textContent.trim();
        }

        if (selectors.date) {
          data.date = document.querySelector(selectors.date).textContent.trim();
        }
        let imgSrc = "";
        let imgTitle = "";
        if (selectors.image) {
          const imageEl = document.querySelector(selectors.image);
          imgSrc = imageEl.getAttribute("src");
          imgTitle = imageEl.getAttribute("title");
        }
        let markdownBody = "";
        if (selectors.content) {
          const body = document
            .querySelector(selectors.content)
            .innerHTML.trim();
          markdownBody = turndownService.turndown(body);
        }
        Promise.all([
          richTextFromMarkdown(selectors.content ? markdownBody : ``),
          createNewAsset({
            url: `${domains?.image_base_path}${imgSrc}`,
            title: imgTitle ?? "Untitled",
          }),
        ]).then((values) => {
          resolve({
            ...data,
            ...(selectors.content && { content: values[0] }),
            ...(selectors.image && { image: values[1] }),
          });
        });
      } else {
        reject(new Error(`Failed to fetch ${url}`));
      }
    } catch (error) {
      reject(new Error(`Failed to fetch:  ${error.message}`));
      console.error(`Error while scraping ${url}:`, error.message);
    }
  });
}

// Function to send data to Contentful
async function createNewEntry(data) {
  const { title, slug, content, image } = data;
  const payload = {
    fields: {
      title: {
        "en-US": title ?? "",
      },
      slug: {
        "en-US": slug ?? "",
      },
      content: {
        "en-US": content ?? "",
      },
      image: {
        "en-US": {
          sys: {
            id: image?.sys?.id,
            type: "Link",
            linkType: "Asset",
          },
        },
      },
    },
  };
  try {
    // Create a new entry in Contentful with scraped data
    return client.getSpace(contentfulSpaceId).then(async (space) => {
      return space.getEnvironment("master").then(async (env) => {
        return env.createEntry(content_type_id, payload).then(async (entry) => {
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
