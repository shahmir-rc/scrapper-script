const consoleSuccess = (message) =>
  console.log(
    "\x1b[32m%s\x1b[0m",
    `${new Date().toLocaleString()}: ${message}`
  ); // Green color
const consoleInfo = (message) =>
  console.log('\x1b[34m%s\x1b[0m',`${new Date().toLocaleString()}: ${message}`);
module.exports = { consoleSuccess, consoleInfo };
