const axios = require("axios");
const fs = require('fs');
const xml2js = require('xml2js');

let url = "https://security.gallagher.com/sitemap.xml"
const parser = new xml2js.Parser();
const groupedUrls = {}
let errors = 0

function containsLocale(url) {
    const parsedURL = new URL(url);
    // Define a regular expression pattern to match valid locale subpaths (e.g., /en/, /fr/, /fr-CA/, etc.)
    const validLocalePattern = /^(\/[a-z]{2}($|\/)|\/[a-z]{2}-[A-Z]{2}($|\/))/;
    return validLocalePattern.test(parsedURL.pathname);

}

const fetchScrapedUrls = async () => {
    const response = await axios.get(url);
    if (response.status === 200) {
        parser.parseString(response.data, (err, result) => {
            if (err) {
                console.error(err);
                // iterate again
                if (errors <= 2) {
                    console.log("Trying again ...")
                    fetchScrapedUrls()
                }
                console.log("Exitting error persists!")
                return
            }
            if (result?.urlset?.url) {
                const requiredUrls = result.urlset.url.map((_url) => _url.loc)?.flat()
                if (requiredUrls) {
                    requiredUrls.forEach(element => {
                        if (containsLocale(element)) {
                            if (element.includes("/en/")) {
                                const parts = element.split('/');
                                const partsLength = parts.length;

                                if (partsLength >= 2) {
                                    const prefix = parts[partsLength - 2];

                                    if (!groupedUrls[prefix]) {
                                        groupedUrls[prefix] = [];
                                    }

                                    groupedUrls[prefix].push(element);
                                }
                            }

                            return
                        }
                        if (!containsLocale(element)) {
                            const parts = element.split('/');
                            const partsLength = parts.length;

                            if (partsLength >= 2) {
                                const prefix = parts[partsLength - 2];

                                if (!groupedUrls[prefix]) {
                                    groupedUrls[prefix] = [];
                                }

                                groupedUrls[prefix].push(element);
                            }

                            return
                        }

                    });
                    console.log("grouped urls here >>>", groupedUrls)
                } else {
                    if (errors <= 2) {
                        console.log("Trying again ...")
                        fetchScrapedUrls()
                    }
                    console.log("Exitting error persists!")
                }
            } else {
                //iterate again
                if (errors <= 2) {
                    console.log("Trying again ...")
                    fetchScrapedUrls()
                }
                console.log("Exitting error persists!")
            }
        })
    } else {
        // iterate again
        if (errors <= 2) {
            console.log("Trying again ...")
            fetchScrapedUrls()
        }
        console.log("Exitting error persists!")
    }
}

fetchScrapedUrls();

module.exports = { groupedUrls }