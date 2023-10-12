const { JSDOM } = require("jsdom");
const axios = require("axios");
const { richTextFromMarkdown } = require("@contentful/rich-text-from-markdown");
var TurndownService = require("turndown");

const { client } = require("./lib/client.js");
const { contentfulSpaceId } = require("./constant.js");

var turndownService = new TurndownService();

// Function to upload an image to Contentful and get its URL
async function uploadImageToContentful(src, title) {
    console.log("title here from src", title)
    let imgTitle = src.split("/")
    imgTitle = imgTitle[imgTitle.length - 1]
    imgTitle = imgTitle.split("?")[0]
    const type = imgTitle.split(".")[1]
    const imageUrl = `https://security.gallagher.com${src}`



    console.log("image title here", imgTitle)
    console.log("image type here", type)
    console.log("image url", imageUrl)
    try {
        const space = await client.getSpace(contentfulSpaceId);
        const environment = await space.getEnvironment('master');

        // Check if an asset with the same title already exists
        const existingAssets = await environment.getAssets({
            'fields.title[match]': title,
        });

        console.log("existing assets here", existingAssets)

        if (existingAssets && existingAssets.items && existingAssets.items.length > 0) {
            // If an asset with the same title exists, return its ID
            return existingAssets.items[0].sys.id;
        }

        console.log("not found image")

        // Create an asset from the external image URL
        const asset = await environment.createAsset({
            fields: {
                title: {
                    'en-US': title,
                },
                file: {
                    'en-US': {
                        fileName: imgTitle, // Adjust the file name as needed
                        contentType: `image/${type}`, // Adjust the content type as needed
                        upload: imageUrl,
                    },
                },
            },
        });

        await asset.processForLocale('en-US');
        await asset.processForAllLocales();

        // Publish the asset
        await asset.publish();
        console.log("asset here", asset)
        // Return the id of the uploaded asset
        return asset.sys.id;
    } catch (error) {
        console.error('Error uploading image to Contentful:', error);
    }
}

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
            let image = document.querySelector(".article .field-image img")
            const imgSrc = image.getAttribute('src')
            const imgTitle = image.getAttribute('title')
            image = await uploadImageToContentful(imgSrc, imgTitle)
            const body = document
                .querySelector(".article .field-content").innerHTML.trim()
            let slug = url.split("/")[url.split("/")?.length - 1];

            // converting to markdown
            var markdownBody = turndownService.turndown(body);
            const contentDoc = await richTextFromMarkdown(markdownBody);

            // Print or process the extracted data
            console.log("URL:", url);
            console.log("Page Title:", title);
            console.log("Date:", date);
            console.log("Image", image)
            console.log("slug", slug)
            scrapedData = {
                title: title,
                date: date,
                image: image,
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
    const { title, slug, content, image } = data;
    const payload = {
        fields: {
            title: {
                "en-US": title,
            },
            image: { "en-US": { "sys": { "id": "1qu3dkETGetSnyFyKRwXpB", "type": "Link", "linkType": "Asset" } } },

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
        await client.getSpace(contentfulSpaceId).then((space) => {
            space.getEnvironment("master").then((env) => {
                env.createEntry("pageNews", payload).then(async (entry) => {
                    await entry.publish();
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
    "https://security.gallagher.com/en-NZ/News/Industry-experts-gather-at-Gallagher-Securitys-free-National-User-Group-event-in-Melbourne",
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
