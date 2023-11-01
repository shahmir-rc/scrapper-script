const { contentfulSpaceId } = require("./constant");
const { getContentTypeField } = require("./field-types");
const { client } = require("./lib/client");
const { logError, scrapeData, createNewEntry } = require("./scrapper");
const { JSDOM } = require("jsdom");
const axios = require("axios");
const { richTextFromMarkdown } = require("@contentful/rich-text-from-markdown");
const { client } = require("./lib/client.js");
const { contentfulSpaceId } = require("./constant.js");
const { URL } = require("url");
var TurndownService = require("turndown");
var turndownService = new TurndownService();
// const { urls, fields, contentType, domains } = require("./config");
const { getFieldContent, getContentTypeField } = require("./field-types.js");
const fs = require("fs");
const { consoleSuccess, consoleInfo } = require("./utils/helpers.js");

const contentTypeMapping = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

const createNewAsset = async ({ pageURL, imageURL, title }) => {
    consoleInfo("Uploading media...");
    const urlObject = new URL(imageURL);
    const fileName = urlObject.pathname.split("/").pop();
    const fileExtension = fileName.split(".").pop().toLowerCase();
    const contentType =
      contentTypeMapping[fileExtension] || "application/octet-stream";
  
    return client
      .getSpace(contentfulSpaceId)
      .then((space) => space.getEnvironment("master"))
      .then((environment) =>
        environment.createAsset({
          fields: {
            title: {
              "en-US": title ?? "",
            },
            file: {
              "en-US": {
                contentType,
                fileName,
                upload: imageURL,
              },
            },
          },
        })
      )
      .then((asset) => asset.processForAllLocales())
      .then((asset) => {
        asset.publish();
        consoleSuccess(`Image: ${title}. Uploaded to Contentful successfully!`);
        return asset;
      })
      .catch((error) => {
        const errorMessage = `Failed to upload media/image to contentful. Error: Invalid URL. ${error.message}. Page Ref: ${pageURL} `;
        logError(errorMessage);
        reject(errorMessage);
      });
  };

const createComponentsModels = async ({ pageURL, passedComponents }) => {
    let createdModelsOfComponents = []
    let componentsWithError = []
    console.log("passed components here >>>>", passedComponents)
    for (const component of passedComponents) {
        let fields = component?.fields?.map((_field) => getContentTypeField(_field));
        try {
            // Create a new content model.
            await client.getSpace(contentfulSpaceId).then(async (space) => {
                await space.getEnvironment("master").then(async (env) => {
                    await env
                        .createContentTypeWithId(component?.contentType?.contentTypeId, {
                            name: component?.contentType?.contentTypeName,
                            fields,
                        })
                        .then(async (contentType) => {
                            await contentType.publish().then((_contentType) => {
                                createdModelsOfComponents.push({ name: component?.name, id: _contentType?.sys?.id })
                                console.log("created content type for component", _contentType?.sys?.id)
                            });
                        })
                        .catch((error) => {
                            componentsWithError.push(component?.name)
                            const errorMessage = `Failed to create content type for component. Error: ${error?.message ?? ""
                                }. Page Ref:${pageURL} `;
                            logError(errorMessage);
                        });
                });
            });
        } catch (error) {
            componentsWithError.push(component?.name)
            const errorMessage = `Failed to create new content model for component. Error: ${error?.message ?? ""
                }. Page Ref:${pageURL} `;
            logError(errorMessage);
        }
    }

    return {
        createdModelsOfComponents,
        componentsWithError
    }

}

const createParentModelWithReference = async ({ pageURL, data, passedcontentType, passedReferences }) => {
    let createdParentModel = null
    let references = passedReferences?.map((refer) => refer?.id)
    let fields = data?.map((_field) => getContentTypeField(_field, references));
    try {
        // Create a new content model.
        createdParentModel = await client.getSpace(contentfulSpaceId).then(async (space) => {
            return space.getEnvironment("master").then(async (env) => {
                return env
                    .createContentTypeWithId(passedcontentType?.contentTypeId, {
                        name: passedcontentType?.contentTypeName,
                        fields,
                    })
                    .then(async (contentType) => {
                        return contentType.publish().then((_contentType) => {
                            console.log("created content type for Parent Model", _contentType?.sys?.id)
                            return _contentType
                        });
                    })
                    .catch((error) => {
                        const errorMessage = `Failed to create content type for Parent Model. Error: ${error?.message ?? ""
                            }. Page Ref:${pageURL} `;
                        console.log("-==-=-=-=errorMessage", errorMessage);
                        logError(errorMessage);
                    });
            });
        });
    } catch (error) {
        const errorMessage = `Failed to create new content model for component. Error: ${error?.message ?? ""
            }. Page Ref:${pageURL} `;
        logError(errorMessage);
    }

    return createdParentModel
}

const scrapeDataForComponents = async = () => {
    consoleInfo(
        `${new Date().toLocaleString()}: Scrapping '${url}' content...)`
      );
      return new Promise(async (resolve, reject) => {
        try {
          const response = await axios.get(url);
          if (response.status === 200) {
            const html = response.data;
            const dom = new JSDOM(html);
            const document = dom.window.document;
    
            // Extract data from the page using DOM methods and provided selectors
            let data = [];
    
            let imgSrc = "";
            let imgTitle = "";
            let markdownBody = "";
    
            data.push({
              field: "slug",
              fieldType: "Symbol",
              content: url.split("/").pop(),
            });
    
            fields.map((_field) => {
              if (_field?.required) {
                if (_field.fieldType.toLowerCase() === "rich text") {
                  let body = document
                    .querySelector(_field.selector)
    
                  if (body) body.innerHTML.trim();
    
                  markdownBody = turndownService.turndown(
                    body ?? _field?.defaultValue
                  );
                  data.push({
                    field: _field.field,
                    fieldType: _field.fieldType,
                  });
                  return;
                }
                if (_field.fieldType.toLowerCase() === "media") {
                  const imageEl = document.querySelector(_field.selector);
                  imgSrc = imageEl.getAttribute("src") ?? _field?.defaultValue;
                  imgTitle = imageEl.getAttribute("title");
                  data.push({
                    field: _field.field,
                    fieldType: _field.fieldType,
                  });
                  return;
                }
    
                let content = document
                  .querySelector(_field.selector)
                if (content) content.textContent.trim();
    
                data.push({
                  field: _field.field,
                  content: content ?? _field?.defaultValue,
                  fieldType: _field.fieldType,
                });
              } else return;
            });
    
            let promises = [];
            if (markdownBody) {
              promises.push(richTextFromMarkdown(markdownBody));
            }
            if (imgSrc) {
              promises.push(
                createNewAsset({
                  pageURL: url,
                  imageURL: `${domains?.image_base_path}${imgSrc}`,
                  title: imgTitle ?? "Untitled",
                })
              );
            }
    
            Promise.all([...promises]).then((values) => {
              let updatedData = data.map((item) => {
                if (!!markdownBody && item.field.includes("content")) {
                  return { ...item, content: values[0] };
                }
                if (!!imgSrc && item.field === "image") {
                  return {
                    ...item,
                    content: !!markdownBody ? values[1] : values[0],
                  };
                }
                return item;
              });
    
              resolve(updatedData);
            });
          } else {
            const errorMessage = `Failed to scrape page content. Error: Invalid URL. 404. Page Ref: ${url} `;
            logError(errorMessage);
            reject(errorMessage);
          }
        } catch (error) {
          const errorMessage = `Failed to scrape page content. Error: Invalid URL. ${error.message}. Page Ref: ${url} `;
          logError(errorMessage);
          reject(errorMessage);
        }
      });
}

const scrapDataForComponents = async ({ components, url, domains }) => {
    let scrapedComponents = []
    for (const component of components) {
        await scrapeData(url, fields, domains).then(async (_component) => {
            await createNewEntry({ pageURL: url, contentTypeID: component?.contentType?.contentTypeId, data: _component }).then((publishedEntry) => {
                console.log("published entry id here >>>", publishedEntry?.sys?.id)
                scrapedComponents.push(publishedEntry?.sys?.id)
            })
        })
    }

    return scrapedComponents;
}

const createEntryForParentWithReferences = async ({ components, url, domains, fields }) => {
    await scrapeData(url, fields, domains).then((res) => {
        let fields = {};
        data.map((_field) => {
            fields[_field?.field] = getFieldContent(_field);
        });
        try {
            // Create a new entry in Contentful with scraped data
            return client.getSpace(contentfulSpaceId).then(async (space) => {
                return space.getEnvironment("master").then(async (env) => {
                    return env
                        .createEntry(contentTypeID, { fields })
                        .then(async (entry) => {
                            await entry.publish();
                            return entry;
                        })
                        .catch((error) => {
                            const errorMessage = `Failed to create new entry on Contentful. Error: ${error?.message ?? ""
                                }. Status: ${error?.status ?? ""}. Status Text: ${error?.statusText ?? ""
                                }. Page Ref:${pageURL} `;
                            logError(errorMessage);
                        });
                });
            });
        } catch (error) {
            const errorMessage = `Failed to create new entry on Contentful. Error: ${error?.message ?? ""
                }. Page Ref:${pageURL} `;
            logError(errorMessage);
        }
    })
}
module.exports = { createEntryForParentWithReferences, scrapDataForComponents, createComponentsModels, createParentModelWithReference }