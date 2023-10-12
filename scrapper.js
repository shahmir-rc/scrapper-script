const { JSDOM } = require("jsdom");
const axios = require("axios");
const { richTextFromMarkdown } = require("@contentful/rich-text-from-markdown");
const { client } = require("./lib/client.js");
const { contentfulSpaceId } = require("./constant.js");
const { URL } = require("url");
var TurndownService = require("turndown");
var turndownService = new TurndownService();

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
            "en-US": title,
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
    let scrapedData = {};
    try {
      const response = await axios.get(url);
      if (response.status === 200) {
        const html = response.data;
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Extract data from the page using DOM methods
        const title = document
          .querySelector(".article .field-article-title")
          .textContent.trim();
        const date = document
          .querySelector(".article .field-dateposted")
          .textContent.trim();
        let imageEl = document.querySelector(".article .field-image img");
        const imgSrc = imageEl.getAttribute("src");
        const imgTitle = imageEl.getAttribute("title");

        const body = document
          .querySelector(".article .field-content")
          .innerHTML.trim();
        let slug = url.split("/")[url.split("/")?.length - 1];

        // converting to markdown
        var markdownBody = turndownService.turndown(body);
        console.log(`Data scrapped successfully! : Page-Slug : ${slug}`);
        Promise.all([
          richTextFromMarkdown(markdownBody),
          createNewAsset({
            url: `https://security.gallagher.com${imgSrc}`,
            title: imgTitle ?? "",
          }),
        ]).then((values) => {
          scrapedData = {
            title: title,
            date: date,
            content: values[0],
            image: values[1],
            slug,
          };
          resolve(scrapedData);
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
        "en-US": title,
      },
      slug: {
        "en-US": slug,
      },
      content: {
        "en-US": content,
      },
      image: {
        "en-US": {
          sys: {
            id: image.sys.id,
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
        return env.createEntry("pageNews", payload).then(async (entry) => {
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
const urls = [
  "https://security.gallagher.com/en-NZ/News/Industry-experts-gather-at-Gallagher-Securitys-free-National-User-Group-event-in-Melbourne",
];

async function scrapeAllPages() {
  for (const url of urls) {
    scrapeData(url).then(async (data) => {
      createNewEntry(data).then(async (entry) => {
        console.log(
          `Page ${entry?.fields?.slug["en-US"]} Created Successfully!`
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      });
    });
  }
}

// Start scraping all pages
scrapeAllPages();
