const { JSDOM } = require("jsdom");
const axios = require("axios");
const { richTextFromMarkdown } = require("@contentful/rich-text-from-markdown");
const { client } = require("./lib/client.js");
const { contentfulSpaceId } = require("./constant.js");
const { URL } = require("url");
var TurndownService = require("turndown");
var turndownService = new TurndownService();
const { urls, fields, contentType, domains } = require("./config");
const { getFieldContent, getContentTypeField } = require("./field-types.js");
const fs = require("fs");
const { consoleSuccess, consoleInfo, scrapeDynamicContent } = require("./utils/helpers.js");
const puppeteer = require('puppeteer');

const contentTypeMapping = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};
const createNewAsset = async ({ pageURL, imageURL, title }) => {
    consoleInfo("Uploading media...");
    const urlObject = new URL(imageURL);
    const fileName = urlObject.pathname.split("/").pop();
    const fileExtension = fileName.split(".").pop().toLowerCase();
    const contentType =
      contentTypeMapping[fileExtension] || "application/octet-stream";
  
    return client
      .getSpace(contentfulSpaceId)
      .then((space) => space.getEnvironment("master"))
      .then((environment) =>
        environment.createAsset({
          fields: {
            title: {
              "en-US": title ?? "",
            },
            file: {
              "en-US": {
                contentType,
                fileName,
                upload: imageURL,
              },
            },
          },
        })
      )
      .then((asset) => asset.processForAllLocales())
      .then((asset) => {
        asset.publish();
        consoleSuccess(`Image: ${title}. Uploaded to Contentful successfully!`);
        return asset;
      })
      .catch((error) => {
        const errorMessage = `Failed to upload media/image to contentful. Error: Invalid URL. ${error.message}. Page Ref: ${pageURL} `;
        logError(errorMessage);
        reject(errorMessage);
      });
  };
function scrapeData(url) {
    console.log(
      `${new Date().toLocaleString()}: Scrapping '${url}' content...)`
    );
    return new Promise(async (resolve, reject) => {
      try {
        const response = await axios.get(url);
        if (response.status === 200) {
          const html = response.data;
          const dom = new JSDOM(html);
          const document = dom.window.document;
  
          // Extract data from the page using DOM methods and provided selectors
          let data = [];
  
          let imgSrc = "";
          let imgTitle = "";
          let markdownBody = "";
  
          data.push({
            field: "slug",
            fieldType: "Symbol",
            content: url.split("/").pop(),
          });
          const videoWrapper = document.querySelector('.article');

          if (videoWrapper) {
            setTimeout(() => {
              const iframes = videoWrapper.querySelectorAll('iframe');
              if (iframes.length > 0) {
                iframes.forEach((iframe) => {
                  const src = iframe.getAttribute('src');
                  console.log('Source of iframe:', src);
                });
              } else {
                console.log('No iframes found.');
              }
            }, 5000); // Wait for 3 seconds (adjust as needed)
          } else {
            console.log('No video wrapper found.');
          }
          
          fields.map((_field) => {
            if (_field?.required) {
              if (_field.fieldType.toLowerCase() === "rich text") {
                const body = document
                  .querySelector(_field.selector)
                  .innerHTML.trim();
                markdownBody = turndownService.turndown(
                  body ?? _field?.defaultValue
                );
                data.push({
                  field: _field.field,
                  fieldType: _field.fieldType,
                });
                return;
              }
              if (_field.fieldType.toLowerCase() === "media") {
                const imageEl = document.querySelector(_field.selector);
                imgSrc = imageEl.getAttribute("src") ?? _field?.defaultValue;
                imgTitle = imageEl.getAttribute("title");
                data.push({
                  field: _field.field,
                  fieldType: _field.fieldType,
                });
                return;
              }
  
              let content = document
                .querySelector(_field.selector)
                .textContent.trim();
  
              data.push({
                field: _field.field,
                content: content ?? _field?.defaultValue,
                fieldType: _field.fieldType,
              });
              if (imgSrc) {
                promises.push(
                  createNewAsset({
                    pageURL: url,
                    imageURL: `${domains?.image_base_path}${imgSrc}`,
                    title: imgTitle ?? "Untitled",
                  })
                );
              }
            } else return;
          });
  
          let promises = [];
          if (markdownBody) {
            promises.push(richTextFromMarkdown(markdownBody));
          }
        
  
          Promise.all([...promises]).then((values) => {
            let updatedData = data.map((item) => {
              if (!!markdownBody && item.field === "content") {
                return { ...item, content: values[0] };
              }
              if (!!imgSrc && item.field === "image") {
                return {
                  ...item,
                  content: !!markdownBody ? values[1] : values[0],
                };
              }
              return item;
            });
  
            resolve(updatedData);
          });
        } else {
          const errorMessage = `Failed to scrape page content. Error: Invalid URL. 404. Page Ref: ${url} `;
        
        }
      } catch (error) {
        const errorMessage = `Failed to scrape page content. Error: Invalid URL. ${error.message}. Page Ref: ${url} `;
      }
    });
  }


//   scrapeData('https://security.gallagher.com/en-NZ/News/Safer-People-Better-Business').then((data)=>{
//     console.log("=-=-=-=-=-=-",data)
//   })

// (async () => {
//     const browser = await puppeteer.launch({headless: 'new'}    );
//     const page = await browser.newPage();
  
//     await page.goto('https://security.gallagher.com/en-NZ/News/Safer-People-Better-Business'); 
  
//     // Wait for the iframe to be present in the DOM
//     await page.waitForSelector('.article iframe');
  
//     const src = await page.evaluate(() => {
//       const iframe = document.querySelector('.article .component.video iframe');
//       return iframe ? iframe.getAttribute('src') : null;
//     });
  
//     console.log('Source of iframe:', src);
  
//     await browser.close();
//   })();

  const attributesToScrape = [
    { attribute: 'src' },
    { attribute: 'title' }
  ];
  scrapeDynamicContent({pageURL:'https://security.gallagher.com/en-NZ/News/Safer-People-Better-Business', pageSelector:".article .component.video iframe", attributes:attributesToScrape}).then((result)=>{
    console.log("=-=-=-=-=result", result)
  })