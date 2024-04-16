// Note:
// - If the field type is reference please must define the content model of  new/ref content type.
// - Must define the Entries (These will be used to scrap the field content by the selector that you define.).
const configuration = {
  // slug: "",
  contentType: {
    contentTypeName: "technology",
    contentTypeId: "technology",
    fields: [
      {
        field: "title",
        fieldType: "Symbol",
        validation: {
          required: false,
          localized: false,
        },
      },
      {
        field: "sections",
        fieldType: "Reference",
        validation: {
          required: false,
          localized: false,
        },
        contentTypes: [
          {
            // slug: "",
            contentType: {
              contentTypeName: "Technology hero A",
              contentTypeId: "tech_hero",
              fields: [
                {
                  field: "hero title",
                  fieldType: "Symbol",
                  validation: {
                    required: false,
                    localized: false,
                  },
                },
                {
                  field: "description",
                  fieldType: "rich text",
                  validation: {
                    required: false,
                    localized: false,
                  },
                },
              ],
              scrapper: {
                entry: "single",
                parentSelector: "",
                selectors: [
                  {
                    field: "hero title",
                    fieldType: "symbol",
                    selector: { element: ".hero-text h1" },
                  },
                  {
                    field: "description",
                    fieldType: "rich text",
                    selector: { element: ".hero-text" },
                  },
                ],
              },
            },
          },
        ],
      },
    ],
    scrapper: {
      entry: "single",
      parentSelector: "",
      selectors: [
        {
          field: "title",
          fieldType: "Symbol",
          defaultValue: "",
          selector: { element: ".hero-text h1" },
        },
        {
          field: "sections",
          fieldType: "Reference",
        },
      ],
    },
  },
  domains: {
    image_base_path: "", // Media base path
  },
};

module.exports = { configuration };

// {
//   slug: "",
//   contentType: {
//     contentTypeName: "Tech Card",
//     contentTypeId: "techcard12312",
//     fields: [
//       {
//         field: "title",
//         fieldType: "Symbol",
//         validation: {
//           required: false,
//           localized: false,
//         },
//       },
//       {
//         field: "description",
//         selector: ".hero-text p",
//         fieldType: "Text",
//         validation: {
//           required: false,
//           localized: false,
//         },
//       },
//     ],
//   },
//   entries: [{ field: "title", selector: "" }],
// },
