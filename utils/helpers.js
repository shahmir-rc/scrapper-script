const fs = require("fs");

const consoleSuccess = (message) =>
  console.log(
    "\x1b[32m%s\x1b[0m",
    `${new Date().toLocaleString()}: ${message}`
  ); // Green color
const consoleInfo = (message) =>
  console.log(
    "\x1b[34m%s\x1b[0m",
    `${new Date().toLocaleString()}: ${message}`
  );

const consoleError = (message) =>
  console.log(
    "\x1b[31m%s\x1b[0m",
    `${new Date().toLocaleString()}: ${message}`
  );
const consoleWarning = (message) => console.log("\x1b[33m%s\x1b[0m", message);

function logError(errorMsg) {
  fs.appendFile(
    "error.log",
    `${new Date().toLocaleString()}: ${errorMsg}\n`,
    (err) => {
      if (err) throw err;
    }
  );
}
module.exports = {
  consoleSuccess,
  consoleInfo,
  consoleError,
  consoleWarning,
  logError,
};
