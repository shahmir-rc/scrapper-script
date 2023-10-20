module.exports = {
  urls: [
    // "https://security.gallagher.com/en-NZ/News/Gallagher-Security-welcomes-New-Zealand-Foreign-Minister-to-South-African-Head-Ofdfsdfic",
    // "https://security.gallagher.com/en-NZ/News/Gallagher-Security-welcomes-New-Zealand-Foreign-Minister-to-South-African-Head-Offissdfsdfdsce",
    "https://security.gallagher.com/en-NZ/News/GardaWorld-Partners-with-Gallagher-to-Create-a-State-of-the-Art-Security-Experience-at-Montreal-Headquarters",
    // Add more URLs as needed
  ],
  fields: [
    // Slug field will be auto generated no need to add here.
    {
      field: "title",
      selector: ".article .field-article-title",
      fieldType: "Symbol",
      required: true,
      defaultValue: "Lorum Ipsum",
    },
    // {
    //   field: "anyFieldName",
    //   selector: ".article .abc",
    //   fieldType: "Text",
    //   required: true,
    //   defaultValue: "",
    // },
    {
      field: "date",
      selector: ".article .field-dateposted",
      fieldType: "Symbol",
      required: false,
      defaultValue: "",
    },
    {
      field: "image",
      selector: ".article .field-image img",
      fieldType: "Media",
      required: true,
      defaultValue: "",
    },
    {
      field: "content",
      selector: ".article .field-content",
      fieldType: "Rich text",
      required: true,
      defaultValue: "",
    },
  ],
  contentType:{
    contentTypeName:'New random type',
    contentTypeId:'newRandomType', 
  },
  domains: {
    image_base_path: "https://security.gallagher.com", // Media base path
  },
};
