const { JSDOM } = require("jsdom");
const axios = require("axios");
const { richTextFromMarkdown } = require("@contentful/rich-text-from-markdown");
var TurndownService = require("turndown");
const fs = require("fs");

const { client } = require("./lib/client.js");
const { contentfulSpaceId } = require("./constant.js");

var turndownService = new TurndownService();


async function uploadImageToContentful(imgTitle, filePath, title, type) {
    let assetId = null
    const readedPath = fs.createReadStream(filePath)

    // readedPath.on('end', async () => {
    try {
        const space = await client.getSpace(contentfulSpaceId);
        const environment = await space.getEnvironment('master');

        // Check if an asset with the same title already exists
        const existingAssets = await environment.getAssets({
            'fields.title[match]': title,
        });

        if (existingAssets && existingAssets.items && existingAssets.items.length > 0) {
            // If an asset with the same title exists, return its ID
            console.log("existing found")
            return existingAssets.items[0].sys.id;
        }

        console.log("existing not found")

        await environment.createAssetFromFiles({ // this first posts the asset to 'uploads', then finally posts the asset to 'assets'
            fields: {
                title: {
                    'en-US': title
                },
                description: {
                    'en-US': title
                },
                file: {
                    'en-US': {
                        contentType: `image/${type}`,
                        fileName: title,
                        file: readedPath
                    }
                }
            }
        }).then((asset) => {
            return asset.processForAllLocales()
                .then((asset) => {
                    asset.publish()
                    assetId = asset.sys.id
                }
                ).catch((er) => console.log(er))
        }).catch((er) => console.log(er))
    } catch (error) {
        console.error('Error uploading image to Contentful:', error);
    }
    // });
    return assetId

}

async function downloadImage(imageUrl, destinationPath) {
    const response = await axios.get(imageUrl, { responseType: "stream" });
    response.data.pipe(fs.createWriteStream(destinationPath));
}

// Function to upload an image to Contentful and get its URL
async function preparingToDownload(src, title) {
    let assetId = null
    let imgTitle = src.split("/")
    imgTitle = imgTitle[imgTitle.length - 1]
    imgTitle = imgTitle.split("?")[0]
    const type = imgTitle.split(".")[1]
    const imageUrl = `https://security.gallagher.com${src}`
    const localImagePath = `./images/${imgTitle}`

    await downloadImage(imageUrl, localImagePath).then(async () => {

        assetId = await uploadImageToContentful(imgTitle, localImagePath, title, type)
    })

    return assetId
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
            const body = document
                .querySelector(".article .field-content").innerHTML.trim()
            let slug = url.split("/")[url.split("/")?.length - 1];
            let image = document.querySelector(".article .field-image img")
            const imgSrc = image.getAttribute('src')
            const imgTitle = image.getAttribute('title')

            image = await preparingToDownload(imgSrc, imgTitle)

            const markdownBody = turndownService.turndown(body)

            const contentDoc = await richTextFromMarkdown(markdownBody)


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
            image: { "en-US": { "sys": { "id": image, "type": "Link", "linkType": "Asset" } } },

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
    // "https://security.gallagher.com/en-NZ/News/Partnerships-cybersecurity-and-big-announcements-on-display-from-Gallagher-Security-at-GSX-2023",
    "https://security.gallagher.com/en-NZ/News/Gallagher-Security-India-Celebrates-85th-Anniversary-with-Prestigious-Event-at-the-New-Zealand-High-Commission",
    "https://security.gallagher.com/en-NZ/News/Gallagher-Security-and-Prosegur-Security-announce-partnership-to-drive-innovation-and-growth"
];

async function scrapeAllPages() {
    for (const url of urls) {
        await scrapeData(url).then(async (scrappedData) => {
            await createNewEntry(scrappedData);
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
}

scrapeAllPages();
