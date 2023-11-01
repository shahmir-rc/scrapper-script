const TemplateContentModel = {
  slug: "",
  contentType: {
    contentTypeName: "Technology",
    contentTypeId: "tech123432",
    fields: [
      {
        field: "content",
        fieldType: "Rich text",
        required: true,
        localized: false,
        selector: ".hero-text",
        defaultValue: "",
      },
      {
        field: "sections",
        fieldType: "Reference",
        // selector: ".main-content",
        required: true,
        localized: false,
        defaultValue: "",
        contentTypes: [
          {
            slug: "",
            contentType: {
              contentTypeName: "Tech Hero",
              contentTypeId: "techhero12321",
              fields: [
                {
                  field: "title",
                  selector: ".hero-text h1",
                  fieldType: "Symbol",
                  localized: false,
                  required: true,
                  defaultValue: "",
                },
                {
                  field: "body",
                  selector: ".hero-text",
                  required: true,
                  localized: false,
                  defaultValue: "",
                  fieldType: "Rich text",
                },
              ],
            },
            entries: [],
          },
            {
              slug: "",
              contentType: {
                contentTypeName: "Tech Card",
                contentTypeId: "techcard12312",
                fields: [
                  {
                    field: "title",
                    localized: false,
                    selector: ".hero-text h1",
                    fieldType: "Symbol",
                    required: true,
                    defaultValue: "",
                  },
                ],
              },
              entries: [],
            },
        ],
      },
    ],
  },
  domains: {
    image_base_path: "", // Media base path
  },
  entries: [],
};

const { client } = require("./lib/client.js");
const { contentfulSpaceId } = require("./constant.js");
const { getContentTypeField } = require("./field-types");
const { consoleSuccess, consoleInfo } = require("./utils/helpers.js");

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;
const API_RATE_LIMIT_DELAY_MS = 3000;

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
            consoleSuccess(
                `Creating Content type '${contentModel.contentType.contentTypeName}' ...`
              );
            const createdCT = await createContentTypeRecursive(
              contentModel.contentType
            );
            // Save and publish content type
            // await createdContentType.update();
            await createdCT.publish();
            consoleSuccess(
              `Content type ${contentModel.contentType.contentTypeName} created and published successfully.`
            );
            field.linkContentType.push(createdCT.sys.id);
            await new Promise((resolve) =>
              setTimeout(resolve, API_RATE_LIMIT_DELAY_MS)
            );
          }
        }
      }

      let createdContentType;
      for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
        try {
          createdContentType = await environment.createContentTypeWithId(
            contentType.contentTypeId,
            {
              name: contentType.contentTypeName,
              fields: fields.map((_field) => getContentTypeField(_field)),
            }
          );
          break; // If successful, exit loop
        } catch (error) {
          if (attempt < MAX_RETRY_ATTEMPTS) {
            consoleInfo(
              `Error creating content type ${contentType.contentTypeName} (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}). Retrying...`
            );
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS)); // Wait before retrying
          } else {
            throw error;
          }
        }
      }

      return createdContentType;
    }

    const createdContentType = await createContentTypeRecursive(
      schema.contentType
    );

    // Save and publish content type
    // await createdContentType.update();
    await createdContentType.publish();

    consoleSuccess(
      `Content type "${schema.contentType.contentTypeName}" created and published successfully.`
    );
  } catch (error) {
    console.error("Error:", error.message);
  }
}

createContentType(TemplateContentModel);
