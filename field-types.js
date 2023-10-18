const getFieldContent = (source) => {
  let FIELD_TYPES = {
    text: {
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

module.exports = { getFieldContent };
