const { scrapeAllPages } = require("./scrapper");
const { requiredContentTypes } = require("./sitemap-config")

const ApplyConfig = async (groupedUrls) => {
    for (const ele of requiredContentTypes) {
        console.log("ele ment here >>", ele)
        const urlsToScrap = groupedUrls[ele.slug];
        if (urlsToScrap?.length > 0) {
            await scrapeAllPages(urlsToScrap, ele.fields, ele.contentType, ele.domains, ele.slug); // Wait for the scraping to complete
        } else {
            console.log("no pages defined for", ele.slug)
        }
    }
}

module.exports = { ApplyConfig }