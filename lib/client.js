const { createClient } = require("contentful-management");
const { contentfulSpaceId } = require("../constant");

const client = createClient({
  accessToken: "CFPAT-PeX_8ZLyU7IlVnJP0v7tco2Oz0kTSUt0rZ61RPCsn6k",
});
 


module.exports = {client}
