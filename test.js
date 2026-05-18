const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 800, deviceScaleFactor: 2 });
  
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for canvas to be ready
    await page.waitForSelector('canvas', { timeout: 10000 });
    console.log("Canvas found!");

    // Initial screenshot
    await page.screenshot({ path: 'before_draw.png' });

    // Get canvas bounding box
    const canvasElement = await page.$('canvas');
    const box = await canvasElement.boundingBox();
    
    if (!box) {
        console.log("Canvas has no bounding box!");
        await browser.close();
        return;
    }

    console.log(`Canvas bounds: x=${box.x}, y=${box.y}, width=${box.width}, height=${box.height}`);

    // Click on RED color (assuming it's in the DOM, let's just draw with default color first)
    
    // Simulate drawing a line
    const startX = box.x + box.width * 0.2;
    const startY = box.y + box.height * 0.5;
    const endX = box.x + box.width * 0.8;
    const endY = box.y + box.height * 0.5;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    
    // Move slowly to trigger pointermove events
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
        const x = startX + ((endX - startX) * (i / steps));
        const y = startY + ((endY - startY) * (i / steps));
        await page.mouse.move(x, y, { steps: 1 });
        await new Promise(r => setTimeout(r, 10)); // small delay
    }
    
    await page.mouse.up();
    console.log("Drawing action complete.");

    // Final screenshot
    await page.screenshot({ path: 'after_draw.png' });
    console.log("Screenshots saved as before_draw.png and after_draw.png");

  } catch (err) {
    console.error("Error during test:", err);
  } finally {
    await browser.close();
  }
})();
