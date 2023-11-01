const { contentfulSpaceId } = require("./constant");
const { getContentTypeField } = require("./field-types");
const { client } = require("./lib/client");

const createReferenceModel = async ({ pageURL, data, passedcontentType }) => {
    let response=null
    let fields = data.map((_field) => getContentTypeField(_field));
    console.log("fields for reference here >>>>",fields)
    try {
        // Create a new content model.
        await client.getSpace(contentfulSpaceId).then(async (space) => {
            await space.getEnvironment("master").then(async (env) => {
                await env
                    .createContentTypeWithId(passedcontentType?.contentTypeId, {
                        name: passedcontentType?.contentTypeName,
                        fields,
                    })
                    .then(async (contentType) => {
                        await contentType.publish().then((_contentType) => {
                            console.log("created content tyepe", _contentType?.sys?.id)
                        });
                    })
                    .catch((error) => {
                        const errorMessage = `Failed to create content type. Error: ${error?.message ?? ""
                            }. Page Ref:${pageURL} `;
                        console.log("-==-=-=-=errorMessage", errorMessage);
                        // logError(errorMessage);
                    });
            });
        });
    } catch (error) {
        const errorMessage = `Failed to create new content model on Contentful. Error: ${error?.message ?? ""
            }. Page Ref:${pageURL} `;
        console.log(errorMessage);
    }
}
module.exports = { createReferenceModel }