const { contentfulSpaceId } = require("./constant");
const { createReferenceModel, createParentModelWithReference, createComponentsModels, scrapDataForComponents, createEntryForParentWithReferences } = require("./create-reference-model");
const { client } = require("./lib/client");
const { scrapeAllPages, createContentType, scrapeData } = require("./scrapper");
const { requiredContentTypes } = require("./sitemap-config")
const { consoleSuccess, consoleInfo } = require("./utils/helpers.js");

const ApplyConfig = async (groupedUrls) => {
    for (const ele of requiredContentTypes) {
        const urlsToScrap = groupedUrls[ele.slug];
        if (urlsToScrap?.length > 0) {
            await client
                .getSpace(contentfulSpaceId)
                .then((space) => space.getEnvironment("master"))
                .then((environment) => environment.getContentType(ele.contentType.contentTypeId)).then(async (contentType) => {
                    consoleInfo(`Content type with the ID '${contentType?.sys.id}' already exists.`);
                    consoleInfo(`Creating new entry...`);
                    // await scrapeAllPages(urlsToScrap, ele.fields, ele.contentType, ele.domains, ele.slug); // Wait for the scraping to complete
                }).catch(async (er) => {
                    consoleInfo(`No content type with the ID '${ele.contentType?.contentTypeId}' found.`);
                    consoleInfo(`Creating content type with ID '${ele.contentType?.contentTypeId}'...`);
                    // await scrapeData(urlsToScrap[0], ele.fields, ele.domains).then(async (data) => {
                    // await createContentType({ pageURL: urlsToScrap[0], data, passedcontentType: ele.contentType, passedfields: ele.fields }).then(async (res) => {
                    // consoleSuccess(`Content type with ID '${ele.contentType?.contentTypeId} Created Successfully!`);
                    // await scrapeAllPages(urlsToScrap, ele.fields, ele.contentType, ele.domains, ele.slug); // Wait for the scraping to complete
                    // });
                    // })
                    await createComponentsModels({ pageURL: "", passedComponents: ele.components }).then(async (res) => {
                        await createParentModelWithReference({ pageURL: "", data: ele.fields, passedcontentType: ele.contentType, passedReferences: res?.createdModelsOfComponents }).then(async (_res) => {
                            if (res) {
                                for (const url of urlsToScrap) {
                                    await scrapDataForComponents({ components: ele?.components, url: url, domains: ele?.domains }).then(async (_ids) => {
                                        await createEntryForParentWithReferences({ components: ele?.components, url: url, domains: ele?.domains,fields:ele?.fields }).then((_parent)=>{
                                            console.log("Whole page published for",_parent?.name)
                                        })
                                    })
                                }
                            } else {
                                console.log("error in parent model")
                            }
                        })
                    });
                })
        } else {
            console.log("no pages defined for", ele.slug)
        }
    }
}

module.exports = { ApplyConfig }