module.exports = {
    sitemapUrl:"https://www.gwagroup.com.au/sitemap.xml",
    requiredContentTypes: [
        {
            slug: "who-we-are",
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
                contentTypeName: 'Who We Are',
                contentTypeId: 'products',
            },
            domains: {
                image_base_path: "https://security.gallagher.com", // Media base path
            },
        },
        {
            slug: "social-responsibility",
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
                contentTypeName: 'Social Responsibility',
                contentTypeId: 'socialResponsibility',
            },
            domains: {
                image_base_path: "https://security.gallagher.com", // Media base path
            },
        }
    ]

}

// 