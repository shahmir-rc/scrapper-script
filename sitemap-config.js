module.exports = {
    sitemapUrl: "https://www.methven.com/sitemap/au/sitemap.xml",
    requiredContentTypes: [
        {
            slug: "showering",
            components: [
                {
                    name: 'Hero1b',
                    fields: [
                        // Slug field will be auto generated no need to add here.
                        {
                            field: "title",
                            selector: ".hero-header .hero-text h1",
                            fieldType: "Symbol",
                            required: true,
                            defaultValue: "",
                        },
                        {
                            field: "description",
                            selector: ".hero-header .hero-text p",
                            fieldType: "Symbol",
                            required: true,
                            defaultValue: "",
                        },
                    ],
                    contentType: {
                        contentTypeName: 'Hero1b',
                        contentTypeId: 'hero1b',
                    },
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
                contentTypeName: 'showering2c',
                contentTypeId: 'showering2c',
            },
            domains: {
                image_base_path: "https://security.gallagher.com", // Media base path
            },
        },

    ]

}

// 