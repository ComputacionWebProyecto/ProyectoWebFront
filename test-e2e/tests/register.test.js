// usa funciones normales (no arrow) para que Mocha pueda setear this.timeout
const { By, until } = require("selenium-webdriver");
const { createDriver } = require("../helpers/driver");
const assert = require("assert");

describe("Formulario de Registro - Angular", function () {
  this.timeout(30000);

  let driver;

  before(async function () {
    driver = await createDriver();

    await driver.get("http://localhost:4200/auth/registro");

    await driver.wait(
      until.elementLocated(By.css("form")),
      15000
    );

    await driver.wait(
      until.elementLocated(By.id("nit")),
      10000
    );
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

  it("Debe cargar el formulario correctamente", async function () {
    const nitInput = await driver.findElement(By.id("nit"));
    const companyNameInput = await driver.findElement(By.id("companyName"));
    const passwordInput = await driver.findElement(By.id("password"));

    assert.ok(nitInput);
    assert.ok(companyNameInput);
    assert.ok(passwordInput);

    const button = await driver.findElement(By.css("button[type='submit']"));
    const enabled = await button.isEnabled();

    assert.strictEqual(enabled, false);
  });

  it("Debe mostrar error cuando el nombre de la compañía es muy corto", async function () {
    const companyNameInput = await driver.findElement(By.id("companyName"));
    
    await companyNameInput.click();
    await companyNameInput.clear();
    await companyNameInput.sendKeys("AB"); // Menos de 3 caracteres
    
    // Click fuera del campo
    const contactEmailInput = await driver.findElement(By.id("contactEmail"));
    await contactEmailInput.click();
    
    await driver.wait(
      until.elementLocated(By.xpath("//p[contains(text(), 'Debe tener al menos 3 caracteres')]")),
      5000
    );
    
    const errorMessage = await driver.findElement(
      By.xpath("//p[contains(text(), 'Debe tener al menos 3 caracteres')]")
    );
    
    assert.ok(errorMessage);
  });

  it("Debe mostrar error cuando el correo de contacto es inválido", async function () {
    const contactEmailInput = await driver.findElement(By.id("contactEmail"));
    
    await contactEmailInput.click();
    await contactEmailInput.clear();
    await contactEmailInput.sendKeys("correo-invalido");
    
    // Click fuera del campo
    const adminNameInput = await driver.findElement(By.id("adminName"));
    await adminNameInput.click();
    
    await driver.wait(
      until.elementLocated(By.xpath("//p[contains(text(), 'Ingresa un correo válido')]")),
      5000
    );
    
    const errorMessage = await driver.findElement(
      By.xpath("//p[contains(text(), 'Ingresa un correo válido')]")
    );
    
    assert.ok(errorMessage);
  });

  it("Debe mostrar error cuando el nombre del administrador es muy corto", async function () {
    const adminNameInput = await driver.findElement(By.id("adminName"));
    
    await adminNameInput.click();
    await adminNameInput.clear();
    await adminNameInput.sendKeys("JC");
    
    const adminEmailInput = await driver.findElement(By.id("adminEmail"));
    await adminEmailInput.click();
    
    await driver.wait(
      until.elementLocated(By.xpath("//p[contains(text(), 'Debe tener al menos 3 caracteres')]")),
      5000
    );
    
    const errorMessage = await driver.findElement(
      By.xpath("//p[contains(text(), 'Debe tener al menos 3 caracteres')]")
    );
    
    assert.ok(errorMessage);
  });

  it("Debe habilitar el botón cuando todos los campos son válidos", async function () {
    // Llenar NIT
    const nitInput = await driver.findElement(By.id("nit"));
    await nitInput.clear();
    await nitInput.sendKeys("123456789");
    
    // Llenar nombre de la compañía
    const companyNameInput = await driver.findElement(By.id("companyName"));
    await companyNameInput.clear();
    await companyNameInput.sendKeys("El Corral");
    
    // Llenar correo de contacto
    const contactEmailInput = await driver.findElement(By.id("contactEmail"));
    await contactEmailInput.clear();
    await contactEmailInput.sendKeys("contacto@elcorral.com");
    
    // Llenar nombre del administrador
    const adminNameInput = await driver.findElement(By.id("adminName"));
    await adminNameInput.clear();
    await adminNameInput.sendKeys("Juan Carlos Hernández");
    
    // Llenar correo del administrador
    const adminEmailInput = await driver.findElement(By.id("adminEmail"));
    await adminEmailInput.clear();
    await adminEmailInput.sendKeys("admin@elcorral.com");
    
    // Llenar contraseña
    const passwordInput = await driver.findElement(By.id("password"));
    await passwordInput.clear();
    await passwordInput.sendKeys("password123");
    
    // Esperar un momento para que Angular procese las validaciones
    await driver.sleep(500);
    
    // Verificar que el botón esté habilitado
    const button = await driver.findElement(By.css("button[type='submit']"));
    const enabled = await button.isEnabled();
    
    assert.strictEqual(enabled, true);
  });

  it("Debe tener el enlace de inicio de sesión", async function () {
    const loginLink = await driver.findElement(
      By.xpath("//a[contains(text(), '¿Ya tienes cuenta? Inicia sesión')]")
    );
    
    assert.ok(loginLink);
    
    const href = await loginLink.getAttribute("href");
    assert.ok(href.includes("/auth/login"));
  });

});