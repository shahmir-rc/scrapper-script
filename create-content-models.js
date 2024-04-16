const { client } = require("./lib/client.js");
const { contentfulSpaceId } = require("./constant.js");
const { getContentTypeField } = require("./field-types.js");
const {
  consoleSuccess,
  consoleInfo,
  consoleError,
  consoleWarning,
} = require("./utils/helpers.js");
const fs = require("fs");
const { runScrapper } = require("./scrape-content.js");
const { createNewEntry } = require("./create-entries.js");

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;
const API_RATE_LIMIT_DELAY_MS = 3000;

function logError(errorMsg) {
  fs.appendFile(
    "error.log",
    `${new Date().toLocaleString()}: ${errorMsg}\n`,
    (err) => {
      if (err) throw err;
    }
  );
}
// Clear the error.log file at the beginning
fs.writeFileSync("error.log", "");

async function createContentType(schema) {
  try {
    const space = await client.getSpace(contentfulSpaceId);
    const environment = await space.getEnvironment("master");

    async function createContentTypeRecursive(contentType) {
      const fields = contentType.fields || [];

      // Create child content types for reference fields
      for (const field of fields) {
        if (field.fieldType.toLowerCase() === "reference") {
          field.linkContentType = [];
          for (const contentModel of field.contentTypes) {
            consoleInfo(
              `Checking for Content type with ID'${contentModel.contentType.contentTypeId}'...`
            );
            try {
              const createdCT = await createContentTypeRecursive(
                contentModel.contentType
              );
              field.linkContentType.push(createdCT.sys.id);

              await new Promise((resolve) =>
                setTimeout(resolve, API_RATE_LIMIT_DELAY_MS)
              );
            } catch (error) {
              let errorMessage = `Error creating content type '${contentModel.contentType.contentTypeName}'. Please check error.log file for detail`;
              consoleError(errorMessage);
              logError(
                `Error creating content type '${contentModel.contentType.contentTypeName}': Error:${error.message}`
              );
            }
          }
        }
      }

      // Check if content type already exists
      let createdContentType = "";
      try {
        createdContentType = await environment.getContentType(
          contentType.contentTypeId
        );
      } catch (error) {
        consoleWarning(
          `Content type with ID '${contentType.contentTypeId}' does not exist.`
        );
      }

      if (!createdContentType) {
        for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
          try {
            consoleInfo(
              `Creating Content type with ID'${contentType.contentTypeId}'...`
            );
            createdContentType = await environment.createContentTypeWithId(
              contentType.contentTypeId,
              {
                name: contentType.contentTypeName,
                fields: fields.map((_field) => getContentTypeField(_field)),
              }
            );

            // Save and publish content type
            await createdContentType.publish();
            consoleSuccess(
              `Content type '${createdContentType.sys.id}' created and published successfully.`
            );
            break; // If successful, exit loop
          } catch (error) {
            if (attempt < MAX_RETRY_ATTEMPTS) {
              consoleWarning(
                `Error while creating content type '${contentType.contentTypeName}' (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}). Retrying...`
              );
              await new Promise((resolve) =>
                setTimeout(resolve, RETRY_DELAY_MS)
              ); // Wait before retrying
            } else {
              consoleWarning(
                `Error while creating content type '${contentType.contentTypeName}' (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}). Retrying...`
              );
            }
          }
        }
      } else {
        consoleSuccess(
          `Content type with ID '${contentType.contentTypeId}' already exist.`
        );
      }

      return createdContentType;
    }

    let parentCT = await createContentTypeRecursive(schema.contentType);
    if (parentCT) {
      const urls = [
        "https://www.methven.com/au/technology",
        // Add more URLs as needed...
      ];

      const scrapePromises = urls.map((url) => {
        return runScrapper({ url, contentModel: schema?.contentType });
      });

      Promise.all(scrapePromises)
        .then((contentResults) => {
          // Process the results here
          // console.log("-=-=-=--==-=>>>>>contentResults", contentResults);
          Promise.all(contentResults.map((content)=> createNewEntry({content})))
          .then((entries) => {
            // console.log("entries-==-",entries);
          })
          .catch((error) => {
            console.error(error);
          });
        })
        .catch((error) => {
          console.error(error);
        });
    }
  } catch (error) {
    let errorMessage = `Error creating content type '${schema.contentType.contentTypeName}'. Please check error.log file for detail`;
    consoleError(errorMessage);
    logError(
      `Error creating content type '${schema.contentType.contentTypeName}': Error:${error.message}`
    );
  }
}

module.exports = { createContentType };
