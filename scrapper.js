const { JSDOM } = require("jsdom");
const axios = require("axios");
const { richTextFromMarkdown } = require("@contentful/rich-text-from-markdown");
var TurndownService = require("turndown");

const { client } = require("./lib/client.js");
const { contentfulSpaceId } = require("./constant.js");

var turndownService = new TurndownService();

// Function to scrape data from a single URL
async function scrapeData(url) {
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
      const body = document
        .querySelector(".article .field-content")
        .innerHTML.trim();
      let slug = url.split("/")[url.split("/")?.length - 1];

      // converting to markdown
      var markdownBody = turndownService.turndown(body);
      const contentDoc = await richTextFromMarkdown(markdownBody);

      // Print or process the extracted data
      console.log("URL:", url);
      console.log("Page Title:", title);
      console.log("Date:", date);
      scrapedData = {
        title: title,
        content: contentDoc,
        slug,
      };
    } else {
      console.error(`Failed to fetch ${url}`);
    }
  } catch (error) {
    console.error(`Error while scraping ${url}:`, error.message);
  }
  return scrapedData;
}

// Function to send data to Contentful
async function createNewEntry(data) {
  const { title, slug, content } = data;
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
    },
  };
  try {
    // Create a new entry in Contentful with scraped data
    client.getSpace(contentfulSpaceId).then((space) => {
      space.getEnvironment("master").then((env) => {
        env.createEntry("blogPost", payload).then((entry) => {
          entry.publish();
          console.log("Entry created and published on Contentful.==>>>", entry);
        });
      });
    });
  } catch (error) {
    console.error("Error creating entry on Contentful:", error);
  }
}

// Loop through the array of URLs and scrape data from each one
const urls = [
  "https://security.gallagher.com/en-NZ/News/Putting-people-at-the-heart-of-emergency-response-tools-Gallagher-Security-recognized-with-double-win-in-2023-Secure-Campus-Awards",
];

async function scrapeAllPages() {
  for (const url of urls) {
    const scrappedData = await scrapeData(url);
    await createNewEntry(scrappedData);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// Start scraping all pages
scrapeAllPages();
