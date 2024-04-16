const { contentfulSpaceId } = require("./constant.js");
const { getFieldContent, convertToCamelCase } = require("./field-types.js");
const { client } = require("./lib/client.js");
const {
  logError,
  consoleSuccess,
  consoleError,
} = require("./utils/helpers.js");

// Function to send data to Contentful
async function createNewEntry({ content }) {
    try {
      let fields = {};
  
      for (const _field of content.fields) {
        let field = _field;
  
        if (_field?.fieldType?.toLowerCase() === "reference") {
          field.entries = [];
          const childEntries = await Promise.all(
            _field?.data?.map((_content) => createNewEntry({ content: _content }))
          );
          for (const entry of childEntries) {
            field.entries.push(entry?.sys?.id);
          }
        }
      
        fields[convertToCamelCase(_field?.field)] = getFieldContent(field);
      }
  
      // Create a new entry in Contentful with scraped data
      return client.getSpace(contentfulSpaceId).then(async (space) => {
        return space.getEnvironment("master").then(async (env) => {
          return env
            .createEntry(content?.contentTypeId, {
              fields,
            })
            .then(async (entry) => {
              await entry.publish();
              consoleSuccess("Entry created and published successfully.");
              return entry;
            })
            .catch((error) => {
              const errorMessage = `Failed to create new entry on Contentful. Error: ${
                error?.message ?? ""
              }. Status: ${error?.status ?? ""}. Status Text: ${
                error?.statusText ?? ""
              }.`;
              consoleError(
                `Failed to create new entry. For more detail check error.log`
              );
              logError(errorMessage);
            });
        });
      });
    } catch (error) {
      const errorMessage = `Failed to create new entry on Contentful. Error: ${
        error?.message ?? ""
      }.`;
      consoleError(`Failed to create new entry. For more detail check error.log`);
      logError(errorMessage);
    }
  }
  
module.exports = { createNewEntry };
