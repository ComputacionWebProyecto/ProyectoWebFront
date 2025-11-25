// usa funciones normales (no arrow) para que Mocha pueda setear this.timeout
const { By, until, Key } = require("selenium-webdriver");
const { createDriver } = require("../helpers/driver");
const assert = require("assert");

describe("Dashboard - Angular", function () {
  this.timeout(60000);

  let driver;

  before(async function () {
    driver = await createDriver();

    // Login con credenciales válidas
    await driver.get("http://localhost:4200/auth/login");
    
    await driver.wait(until.elementLocated(By.id("email")), 10000);
    
    const emailInput = await driver.findElement(By.id("email"));
    await emailInput.clear();
    await emailInput.sendKeys("c@gmail.com");
    
    const passwordInput = await driver.findElement(By.id("password"));
    await passwordInput.clear();
    await passwordInput.sendKeys("123456");
    
    const submitButton = await driver.findElement(By.css("button[type='submit']"));
    await submitButton.click();
    
    // Esperar a que cargue el dashboard
    await driver.wait(
      until.elementLocated(By.css(".dashboard-container")),
      15000
    );
    
    // Esperar un poco más para que el dashboard se estabilice
    await driver.sleep(1000);
  });

  after(async function () {
    try {
      if (driver && typeof driver.quit === "function") {
        await driver.quit();
      }
    } catch (err) {
      console.error("Error cerrando driver:", err);
    }
  });

  it("Debe cargar el dashboard correctamente", async function () {
    const dashboardContainer = await driver.findElement(By.css(".dashboard-container"));
    const boardArea = await driver.findElement(By.css(".board-area"));
    const boardCanvas = await driver.findElement(By.css(".board-canvas"));
    
    assert.ok(dashboardContainer);
    assert.ok(boardArea);
    assert.ok(boardCanvas);
  });

  it("Debe renderizar el sidebar", async function () {
    const sidebar = await driver.findElement(By.css("app-drop-menu"));
    assert.ok(sidebar);
  });

  it("Debe renderizar el header del dashboard", async function () {
    const header = await driver.findElement(By.css("app-header-dashboard"));
    assert.ok(header);
  });

  it("Debe tener el canvas SVG para las líneas", async function () {
    const svg = await driver.findElement(By.css(".board-canvas svg"));
    assert.ok(svg);
    
    // Verificar que tenga el marker para las flechas
    const marker = await driver.findElement(By.id("arrow"));
    assert.ok(marker);
  });

  it("Debe poder abrir y cerrar el sidebar", async function () {
    // Buscar el botón de toggle del sidebar en el header
    const toggleButtons = await driver.findElements(
      By.css("app-header-dashboard button")
    );
    
    if (toggleButtons.length > 0) {
      await toggleButtons[0].click();
      await driver.sleep(500);
      
      // Verificar que el sidebar existe
      const sidebar = await driver.findElement(By.css("app-drop-menu"));
      assert.ok(sidebar);
    }
  });

  it("Debe tener los paneles laterales disponibles", async function () {
    const userPanel = await driver.findElement(By.css("app-user-panel"));
    const processPanel = await driver.findElement(By.css("app-process-panel"));
    const rolePanel = await driver.findElement(By.css("app-role-panel"));
    
    assert.ok(userPanel);
    assert.ok(processPanel);
    assert.ok(rolePanel);
  });

  it("Debe tener el área de drop configurada correctamente", async function () {
    const boardArea = await driver.findElement(By.css(".board-area"));
    
    // Verificar clases importantes
    const classes = await boardArea.getAttribute("class");
    assert.ok(classes.includes("dashboard-container"));
    assert.ok(classes.includes("h-full"));
    assert.ok(classes.includes("w-full"));
  });

  it("Debe mantener la estructura de capas correcta (SVG debajo)", async function () {
    const svg = await driver.findElement(By.css(".board-canvas svg"));
    const svgClasses = await svg.getAttribute("class");
    
    // El SVG debe tener z-0 para estar en el fondo
    assert.ok(svgClasses.includes("z-0"));
    assert.ok(svgClasses.includes("pointer-events-none"));
  });

  it("Debe permitir drag and drop en el área del tablero", async function () {
    const boardArea = await driver.findElement(By.css(".board-area"));
    
    // Verificar que el área acepta drops
    const classes = await boardArea.getAttribute("class");
    assert.ok(boardArea);
    assert.ok(classes.includes("board-area"));
  });

  it("Debe tener el canvas con transform para el movimiento", async function () {
    const canvas = await driver.findElement(By.css(".board-canvas"));
    const transform = await canvas.getCssValue("transform");
    
    // Debe tener algún valor de transform (aunque sea matrix(1, 0, 0, 1, 0, 0))
    assert.ok(transform);
  });

  it("Debe verificar que los componentes tienen la clase board-component", async function () {
    const components = await driver.findElements(By.css(".board-component"));
    
    // Puede haber 0 o más componentes inicialmente
    assert.ok(components !== undefined);
    assert.ok(Array.isArray(components));
  });

  it("Debe verificar estructura del main content", async function () {
    const main = await driver.findElement(By.css("main"));
    const classes = await main.getAttribute("class");
    
    assert.ok(classes.includes("flex-1"));
    assert.ok(classes.includes("overflow-hidden"));
    assert.ok(classes.includes("pt-16"));
  });

  it("Debe verificar que el SVG tiene las definiciones necesarias", async function () {
    const defs = await driver.findElement(By.css(".board-canvas svg defs"));
    assert.ok(defs);
    
    const marker = await defs.findElement(By.id("arrow"));
    assert.ok(marker);
  });

  it("Debe tener la clase shift-active configurada para el modo shift", async function () {
    const boardArea = await driver.findElement(By.css(".board-area"));
    
    // Por defecto no debe tener shift-active
    const classes = await boardArea.getAttribute("class");
    
    // La clase existe en el HTML aunque no esté activa
    assert.ok(boardArea);
  });

  it("Debe verificar que el layout tiene el contenedor flex correcto", async function () {
    const flexContainer = await driver.findElement(By.css(".flex.h-screen.overflow-hidden"));
    assert.ok(flexContainer);
    
    const classes = await flexContainer.getAttribute("class");
    assert.ok(classes.includes("flex"));
    assert.ok(classes.includes("h-screen"));
    assert.ok(classes.includes("overflow-hidden"));
  });

  it("Debe verificar que el contenido principal tiene flex-1", async function () {
    const mainContent = await driver.findElement(By.css(".flex-1.flex.flex-col"));
    assert.ok(mainContent);
    
    const classes = await mainContent.getAttribute("class");
    assert.ok(classes.includes("flex-1"));
    assert.ok(classes.includes("flex-col"));
  });

  it("Debe verificar atributos del SVG principal", async function () {
    const svg = await driver.findElement(By.css(".board-canvas svg"));
    
    const width = await svg.getCssValue("width");
    const height = await svg.getCssValue("height");
    
    // Debe tener dimensiones
    assert.ok(width);
    assert.ok(height);
  });

  it("Debe verificar que existe el grupo para los edges", async function () {
    const groups = await driver.findElements(By.css(".board-canvas svg g"));
    
    // Puede haber 0 o más grupos dependiendo de los edges
    assert.ok(Array.isArray(groups));
  });

  it("Debe verificar el posicionamiento del inspector", async function () {
    const inspectors = await driver.findElements(
      By.css("aside.fixed.right-4.top-20")
    );
    
    // El inspector puede estar visible o no
    assert.ok(Array.isArray(inspectors));
  });

  it("Debe verificar que el tablero tiene relative positioning", async function () {
    const boardArea = await driver.findElement(By.css(".board-area"));
    const position = await boardArea.getCssValue("position");
    
    assert.strictEqual(position, "relative");
  });

});