const { JSDOM } = require('jsdom');
const axios = require('axios'); // Use 'node-fetch' if you prefer it
const { createClient } = require('contentful-management');
const { richTextFromMarkdown } = require('@contentful/rich-text-from-markdown');
var TurndownService = require('turndown')

// Define an array of URLs you want to scrape
const urls = [
    'https://security.gallagher.com/sitemap.xml'
];


// Contentful credentials and space ID
const contentfulSpaceId = 'cqvepi7k4s53';
const contentfulManagementToken = 'CFPAT-PeX_8ZLyU7IlVnJP0v7tco2Oz0kTSUt0rZ61RPCsn6k'

// for converting html to markdown
var turndownService = new TurndownService()

// Function to scrape data from a single URL
async function scrapeData(url) {
    let scrapedData = {}
    try {
        const response = await axios.get(url);
        if (response.status === 200) {
            const html = response.data;
            const dom = new JSDOM(html);
            const document = dom.window.document;
            // Extract data from the page using DOM methods
            const title = document.querySelector('.field-article-title').textContent.trim()
            const date = document.querySelector('.field-dateposted').textContent.trim()
            const body = document.querySelector('.field-content').innerHTML.trim()

            // converting to markdown
            var markdownBody = turndownService.turndown(body)

            // converting markdown to document
            const bodyDocument = await richTextFromMarkdown(markdownBody);

            // Print or process the extracted data
            console.log('URL:', url);
            console.log('Page Title:', title);
            console.log('Date:', date);
            scrapedData = {
                title: title,
                body: bodyDocument
            }
        } else {
            console.error(`Failed to fetch ${url}`);
        }
    } catch (error) {
        console.error(`Error while scraping ${url}:`, error.message);
    }

    return scrapedData
}

// Function to send data to Contentful
async function sendDataToContentful(data) {
    const client = createClient({ accessToken: contentfulManagementToken });

    try {
        const space = await client.getSpace(contentfulSpaceId);
        const environment = await space.getEnvironment('master');

        // Create a new entry in Contentful with scraped data
        const entry = await environment.createEntry('blogPost', {
            fields: {
                title: {
                    'en-US': data.title,
                },
                text: {
                    'en-US': data.body,
                },
            },
        });

        // Publish the entry
        await entry.publish();

        console.log('Entry created and published on Contentful.');
    } catch (error) {
        console.error('Error creating entry on Contentful:', error);
    }
}

// Loop through the array of URLs and scrape data from each one
async function scrapeAllPages() {
    for (const url of urls) {
        const scrappedData = await scrapeData(url);
        await sendDataToContentful(scrappedData);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Start scraping all pages
scrapeAllPages();
