const { contentfulSpaceId } = require("./constant");
const { client } = require("./lib/client");
const { scrapeAllPages, createContentType, scrapeData } = require("./scrapper");
const { requiredContentTypes } = require("./sitemap-config")
const { consoleSuccess, consoleInfo } = require("./utils/helpers.js");

const ApplyConfig = async (groupedUrls) => {
    for (const ele of requiredContentTypes) {
        console.log("ele ment here >>", ele)
        const urlsToScrap = groupedUrls[ele.slug];
        if (urlsToScrap?.length > 0) {
            // try {
            await client
                .getSpace(contentfulSpaceId)
                .then((space) => space.getEnvironment("master"))
                .then((environment) => environment.getContentType(ele.contentType.contentTypeId)).then(async (contentType) => {
                    consoleInfo(`${new Date().toLocaleString()}: Content type with the ID '${contentType?.sys.id}' already exists.`);
                    consoleInfo(`${new Date().toLocaleString()}: Creating new entry...`);
                    await scrapeAllPages(urlsToScrap, ele.fields, ele.contentType, ele.domains, ele.slug); // Wait for the scraping to complete
                }).catch(async (er) => {
                    consoleInfo(`${new Date().toLocaleString()}: No content type with the ID '${ele.contentType?.contentTypeId}' found.`);
                    consoleInfo(`${new Date().toLocaleString()}: Creating content type with ID '${ele.contentType?.contentTypeId}'...`);
                    await scrapeData(urlsToScrap[0], ele.fields, ele.domains).then(async (data) => {
                        await createContentType({ pageURL: urlsToScrap[0], data, passedcontentType: ele.contentType, passedfields: ele.fields }).then(async (res) => {
                            consoleSuccess(`Content type with ID '${ele.contentType?.contentTypeId} Created Successfully!`);
                            await scrapeAllPages(urlsToScrap, ele.fields, ele.contentType, ele.domains, ele.slug); // Wait for the scraping to complete
                        });
                    })
                })

            // } catch (error) {
            //     // Content type does not exist, create it
            //     await scrapeData(urlsToScrap[0], ele.fields, ele.domains).then(async (data) => {
            //         await createContentType({ pageURL: urlsToScrap[0], data, passedcontentType: ele.contentType, passedfields: ele.fields }).then(async (res) => {
            //             consoleSuccess(`Content type with ID '${passedcontentType?.contentTypeId} Created Successfully!`);
            //             await scrapeAllPages(urlsToScrap, ele.fields, ele.contentType, ele.domains, ele.slug); // Wait for the scraping to complete
            //         });
            //     })
            // }
        } else {
            console.log("no pages defined for", ele.slug)
        }
    }
}

module.exports = { ApplyConfig }