module.exports = {
    sitemapUrl: "https://www.methven.com/sitemap/au/sitemap.xml",
    requiredContentTypes: [
        {
            slug: "showering",
            components: [
                {
                    name: 'Hero',
                    fields: [
                        // Slug field will be auto generated no need to add here.
                        {
                            field: "content",
                            selector: ".main-content",
                            fieldType: "Rich text",
                            required: true,
                            defaultValue: "",
                        },
                    ],
                    contentType: {
                        contentTypeName: 'showering',
                        contentTypeId: 'showering',
                    },
                    reference: "",
                }
            ],
            fields: [
                // Slug field will be auto generated no need to add here.
                {
                    field: "sections",
                    selector: ".main-content",
                    fieldType: "references",
                    required: true,
                    defaultValue: "",
                },
            ],
            contentType: {
                contentTypeName: 'showering',
                contentTypeId: 'showering',
            },
            domains: {
                image_base_path: "https://security.gallagher.com", // Media base path
            },
        },

    ]

}

// 