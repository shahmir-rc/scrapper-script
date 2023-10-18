module.exports = {
  urls: [
    "https://security.gallagher.com/en-NZ/News/Gallagher-Security-welcomes-New-Zealand-Foreign-Minister-to-South-African-Head-Offic",
    "https://security.gallagher.com/en-NZ/News/Gallagher-Security-welcomes-New-Zealand-Foreign-Minister-to-South-African-Head-Office",
    // Add more URLs as needed
  ],
  fields: [
    // Slug field will be auto generated no need to add here.
    {
      field: "title",
      selector: ".article .field-article-title", 
      fieldType: "Text",
      required:true,
      defaultValue:''
    },
    {
      field: "date",
      selector: ".article .field-dateposted",
      fieldType: "Text",
      required:true,
      defaultValue:''

    },
    {
      field: "image",
      selector: ".article .field-image img",
      fieldType: "Media",
      required:true,
      defaultValue:''

    },
    {
      field: "content",
      selector: ".article .field-content",
      fieldType: "Rich text",
      required:true,
      defaultValue:''

    },
  ],
  content_type_id: "pageNews", // Place the Content Type ID of the Entry you want to create.
  domains: {
    image_base_path: "https://security.gallagher.com", // Media base path
  },
};

