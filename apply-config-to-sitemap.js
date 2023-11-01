const { contentfulSpaceId } = require("./constant");
const { client } = require("./lib/client");
const { scrapeAllPages, createContentType, scrapeData } = require("./scrapper");
const { requiredContentTypes } = require("./sitemap-config");
const { consoleSuccess, consoleInfo } = require("./utils/helpers.js");

const ApplyConfig = async (groupedUrls) => {
  // for (const ele of requiredContentTypes) {
  //     console.log("ele ment here >>", ele)
  //     const urlsToScrap = groupedUrls[ele.slug];
  let ele = {
    slug: "",
    fields: [
      // Slug field will be auto generated no need to add here.
      {
        field: "hero",
        // selector: ".main-content",
        required: true,
        defaultValue: "",
        fieldType: "Reference",
        contentModel: {
          slug: "",
          fields: [
            {
              field: "title",
              selector: ".hero-text h1",
              fieldType: "Symbol",
              required: true,
              defaultValue: "",
            },
            {
              field: "body",
              selector: ".hero-text",
              required: true,
              defaultValue: "",
              fieldType: "Rich text",
            },
          ],
          contentType: {
            contentTypeName: "HERO A model",
            contentTypeId: "heroA",
          },
          domains: {
            image_base_path: "", // Media base path
          },
          entries: [],
        },
      },
      {
        field: "content",
        selector: ".hero-text",
        required: true,
        defaultValue: "",
        fieldType: "Rich text",
      },
    ],
    contentType: {
      contentTypeName: "Parent Model",
      contentTypeId: "parentModelA",
    },
    domains: {
      image_base_path: "", // Media base path
    },
    entries: [],
  };
  let urlsToScrap = ["https://www.methven.com/au/technology"];
  if ([urlsToScrap]?.length > 0) {
    // try {
    await client
      .getSpace(contentfulSpaceId)
      .then((space) => space.getEnvironment("master"))
      .then((environment) =>
        environment.getContentType(ele.contentType.contentTypeId)
      )
      .then(async (contentType) => {
        consoleInfo(
          `Content type with the ID '${contentType?.sys.id}' already exists.`
        );
        consoleInfo(`Creating new entry...`);
        await scrapeAllPages(
          urlsToScrap,
          ele.fields,
          ele.contentType,
          ele.domains
        ); // Wait for the scraping to complete
      })
      .catch(async (er) => {
        consoleInfo(
          `No content type with the ID '${ele.contentType?.contentTypeId}' found.`
        );
        consoleInfo(
          `Creating content type with ID '${ele.contentType?.contentTypeId}'...`
        );
        await scrapeData({ url: urlsToScrap[0], page: ele }).then(
          async (data) => {
            console.log("=-==--=-data", data[0]?.fields);
            // await createContentType({
            //   pageURL: urlsToScrap[0],
            //   data,
            //   passedcontentType: ele.contentType,
            //   passedfields: ele.fields,
            // }).then(async (res) => {
            //   consoleSuccess(
            //     `Content type with ID '${ele.contentType?.contentTypeId} Created Successfully!`
            //   );
            //   await scrapeAllPages(
            //     urlsToScrap,
            //     ele.fields,
            //     ele.contentType,
            //     ele.domains,
            //     ele.slug
            //   ); // Wait for the scraping to complete
            // });
          }
        );
      });
    // } else {
    //     console.log("no pages defined for", ele.slug)
    // }
  }
};

module.exports = { ApplyConfig };
