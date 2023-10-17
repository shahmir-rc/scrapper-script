module.exports = {
  urls: [
    "https://security.gallagher.com/en-NZ/News/How-smart-is-your-enrolment",
    // Add more URLs as needed
  ],
  selectors: {
    //  Selectors are optional
    title: ".article .field-article-title",
    date: ".article .field-dateposted",
    image: ".article .field-image img",
    content: ".article .field-content",

    // title:{
    //     selector:'.article .field-article-title',
    //     field:'title',
    //     fieldType:''
    // } 

  },

  content_type_id:'pageNews', // Place the Content Type ID of the Entry you want to create.
  domains: {
    image_base_path: "https://security.gallagher.com", // Media base path
  },
};
