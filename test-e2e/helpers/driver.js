const { Builder } = require("selenium-webdriver");
require("chromedriver");

async function createDriver() {
  return await new Builder().forBrowser("chrome").build();
}

module.exports = { createDriver };
