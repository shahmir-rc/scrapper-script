const { scrapeAllPages } = require("./scrapper");
const { requiredContentTypes } = require("./sitemap-config")

const ApplyConfig = async (groupedUrls) => {
    for (const ele of requiredContentTypes) {
        const urlsToScrap = groupedUrls[ele.slug];
        if (urlsToScrap.length > 0) {
            await scrapeAllPages(urlsToScrap); // Wait for the scraping to complete
        } else {
            return
        }
    }
}

module.exports = { ApplyConfig }