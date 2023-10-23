module.exports = {
    requiredContentTypes: [
        {
            slug: "who-we-are",
            contentTypeId: null,
            fields: [
                // Slug field will be auto generated no need to add here.
                // {
                //     field: "title",
                //     selector: ".body-content span",
                //     fieldType: "Symbol",
                //     required: true,
                //     defaultValue: "Lorum Ipsum",
                // },
                // {
                //   field: "anyFieldName",
                //   selector: ".article .abc",
                //   fieldType: "Text",
                //   required: true,
                //   defaultValue: "",
                // },
                // {
                //     field: "subTitle",
                //     selector: ".body-content .sub-title",
                //     fieldType: "Symbol",
                //     required: true,
                //     defaultValue: "Lorum Ipsum",
                // },
                // {
                //     field: "image",
                //     selector: ".article .field-image img",
                //     fieldType: "Media",
                //     required: true,
                //     defaultValue: "",
                // },
                {
                    field: "content",
                    selector: ".body-content .description",
                    fieldType: "Rich text",
                    required: true,
                    defaultValue: "",
                },
            ],
            contentType: {
                contentTypeName: 'Who We Are',
                contentTypeId: 'whoWeAre',
            },
            domains: {
                image_base_path: "https://security.gallagher.com", // Media base path
            },
        }
    ]
}