const { createDriver } = require("../helpers/driver");
const assert = require("assert");

describe("DEBUG", () => {
  it("Debe cargar Angular", async () => {
    const driver = await createDriver();
    await driver.get("http://localhost:4200");
    const title = await driver.getTitle();
    console.log("Titulo:", title);
    await driver.quit();
    console.log("Chrome iniciado OK");
  });
});
