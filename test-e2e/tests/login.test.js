// usa funciones normales (no arrow) para que Mocha pueda setear this.timeout
const { By, until } = require("selenium-webdriver");
const { createDriver } = require("../helpers/driver");
const assert = require("assert");

describe("Formulario de Login - Angular", function () {
  this.timeout(30000);

  let driver;

  before(async function () {
    driver = await createDriver();

    await driver.get("http://localhost:4200/auth/login");

    await driver.wait(
      until.elementLocated(By.css("form")),
      15000
    );

    await driver.wait(
      until.elementLocated(By.id("email")),
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
    const emailInput = await driver.findElement(By.id("email"));
    const passwordInput = await driver.findElement(By.id("password"));

    assert.ok(emailInput);
    assert.ok(passwordInput);

    const button = await driver.findElement(By.css("button[type='submit']"));
    const enabled = await button.isEnabled();

    assert.strictEqual(enabled, false);
  });

  it("Debe mostrar error cuando el campo de correo está vacío", async function () {
    const emailInput = await driver.findElement(By.id("email"));
    
    await emailInput.click();
    await emailInput.clear();
    
    // Click fuera del campo para activar el touched
    const passwordInput = await driver.findElement(By.id("password"));
    await passwordInput.click();
    
    // Esperar a que aparezca el mensaje de error
    await driver.wait(
      until.elementLocated(By.xpath("//p[contains(text(), 'El correo es obligatorio')]")),
      5000
    );
    
    const errorMessage = await driver.findElement(
      By.xpath("//p[contains(text(), 'El correo es obligatorio')]")
    );
    
    assert.ok(errorMessage);
    const errorText = await errorMessage.getText();
    assert.strictEqual(errorText, "El correo es obligatorio.");
  });

  it("Debe mostrar error cuando el correo tiene formato inválido", async function () {
    const emailInput = await driver.findElement(By.id("email"));
    
    await emailInput.click();
    await emailInput.clear();
    await emailInput.sendKeys("correo-invalido");
    
    // Click fuera del campo
    const passwordInput = await driver.findElement(By.id("password"));
    await passwordInput.click();
    
    await driver.wait(
      until.elementLocated(By.xpath("//p[contains(text(), 'Ingresa un correo válido')]")),
      5000
    );
    
    const errorMessage = await driver.findElement(
      By.xpath("//p[contains(text(), 'Ingresa un correo válido')]")
    );
    
    assert.ok(errorMessage);
    const errorText = await errorMessage.getText();
    assert.strictEqual(errorText, "Ingresa un correo válido.");
  });

  it("Debe mostrar error cuando el campo de contraseña está vacío", async function () {
    const passwordInput = await driver.findElement(By.id("password"));
    
    await passwordInput.click();
    await passwordInput.clear();
    
    // Click fuera del campo
    const emailInput = await driver.findElement(By.id("email"));
    await emailInput.click();
    
    await driver.wait(
      until.elementLocated(By.xpath("//p[contains(text(), 'La contraseña es obligatoria')]")),
      5000
    );
    
    const errorMessage = await driver.findElement(
      By.xpath("//p[contains(text(), 'La contraseña es obligatoria')]")
    );
    
    assert.ok(errorMessage);
    const errorText = await errorMessage.getText();
    assert.strictEqual(errorText, "La contraseña es obligatoria.");
  });

  it("Debe mantener el botón deshabilitado con solo la contraseña válida", async function () {
    const emailInput = await driver.findElement(By.id("email"));
    const passwordInput = await driver.findElement(By.id("password"));
    
    await emailInput.clear();
    
    await passwordInput.clear();
    await passwordInput.sendKeys("password123");
    
    // Click en el password para activar touched en email
    await passwordInput.click();
    
    await driver.sleep(500);
    
    const button = await driver.findElement(By.css("button[type='submit']"));
    const enabled = await button.isEnabled();
    
    assert.strictEqual(enabled, false);
  });

  it("Debe habilitar el botón cuando ambos campos son válidos", async function () {
    const emailInput = await driver.findElement(By.id("email"));
    const passwordInput = await driver.findElement(By.id("password"));
    
    await emailInput.clear();
    await emailInput.sendKeys("usuario@correo.com");
    
    await passwordInput.clear();
    await passwordInput.sendKeys("password123");
    
    // Esperar un momento para que Angular procese las validaciones
    await driver.sleep(500);
    
    const button = await driver.findElement(By.css("button[type='submit']"));
    const enabled = await button.isEnabled();
    
    assert.strictEqual(enabled, true);
  });

  it("Debe verificar el placeholder del campo de correo", async function () {
    const emailInput = await driver.findElement(By.id("email"));
    const placeholder = await emailInput.getAttribute("placeholder");
    
    assert.strictEqual(placeholder, "tu@correo.com");
  });

  it("Debe verificar el placeholder del campo de contraseña", async function () {
    const passwordInput = await driver.findElement(By.id("password"));
    const placeholder = await passwordInput.getAttribute("placeholder");
    
    assert.strictEqual(placeholder, "********");
  });

  it("Debe verificar que el campo de contraseña sea de tipo password", async function () {
    const passwordInput = await driver.findElement(By.id("password"));
    const type = await passwordInput.getAttribute("type");
    
    assert.strictEqual(type, "password");
  });

  it("Debe tener el texto correcto en el botón de submit", async function () {
    const button = await driver.findElement(By.css("button[type='submit']"));
    const buttonText = await button.getText();
    
    assert.strictEqual(buttonText, "Iniciar sesión");
  });

  it("Debe tener el enlace de registro", async function () {
    const registerLink = await driver.findElement(
      By.xpath("//a[contains(text(), '¿No tienes cuenta? Regístrate')]")
    );
    
    assert.ok(registerLink);
    
    const href = await registerLink.getAttribute("href");
    assert.ok(href.includes("/auth/registro"));
  });

  it("Debe mantener los valores ingresados después de un error de validación", async function () {
    const emailInput = await driver.findElement(By.id("email"));
    
    await emailInput.clear();
    await emailInput.sendKeys("test@example.com");
    
    // Provocar un error en password
    const passwordInput = await driver.findElement(By.id("password"));
    await passwordInput.click();
    await emailInput.click(); // Salir del campo
    
    // Verificar que el email se mantiene
    const emailValue = await emailInput.getAttribute("value");
    assert.strictEqual(emailValue, "test@example.com");
  });

  it("Debe validar correos con diferentes formatos inválidos", async function () {
    const emailInput = await driver.findElement(By.id("email"));
    const passwordInput = await driver.findElement(By.id("password"));
    
    const invalidEmails = ["test@", "@example.com", "test.example.com", "test @example.com"];
    
    for (const invalidEmail of invalidEmails) {
      await emailInput.clear();
      await emailInput.sendKeys(invalidEmail);
      await passwordInput.click();
      
      await driver.wait(
        until.elementLocated(By.xpath("//p[contains(text(), 'Ingresa un correo válido')]")),
        5000
      );
      
      const errorMessage = await driver.findElement(
        By.xpath("//p[contains(text(), 'Ingresa un correo válido')]")
      );
      
      assert.ok(errorMessage, `Debería mostrar error para: ${invalidEmail}`);
    }
  });

});