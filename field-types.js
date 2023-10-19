const getFieldContent = (source) => {
  let FIELD_TYPES = {
    "symbol": {
      "en-US": source?.content,
    },
    "rich text": {
      "en-US": source?.content,
    },
    media: {
      "en-US": {
        sys: {
          id: source?.content?.sys?.id,
          type: "Link",
          linkType: "Asset",
        },
      },
    },
  };

  return FIELD_TYPES[source?.fieldType.toLowerCase()];
};
function convertToCamelCase(input) {
  return input
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase());
}
const getContentTypeField = (source) => {
  let FIELD_TYPES = {
    "symbol": {
      id: convertToCamelCase(source.field),
      name: source.field,
      required: false,
      localized: false,
      type: "Symbol",
    },
    "rich text": {
      id: convertToCamelCase(source.field),
      name: source.field,
      required: false,
      localized: false,
      type: "RichText",  
    },
    media: {
      id: convertToCamelCase(source.field),
      name: source.field,
      required: false,
      localized: false,
      type: "Link",
      linkType: "Asset" 
    },
    number: {
      id: convertToCamelCase(source.field),
      name: source.field,
      required: false,
      localized: false,
      type: "Number",
    },
  };

  return FIELD_TYPES[source?.fieldType.toLowerCase()];
};

module.exports = { getFieldContent, getContentTypeField };
