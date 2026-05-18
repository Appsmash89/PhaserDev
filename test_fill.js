const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 800, deviceScaleFactor: 2 });
  
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for canvas to be ready
    await page.waitForSelector('canvas', { timeout: 10000 });
    console.log("Canvas found!");

    // Wait a little bit for Phaser to finish rendering initial state
    await new Promise(r => setTimeout(r, 2000));

    // Initial screenshot
    await page.screenshot({ path: 'before_fill.png' });

    // Get canvas bounding box
    const canvasElement = await page.$('canvas');
    const box = await canvasElement.boundingBox();
    
    if (!box) {
        console.log("Canvas has no bounding box!");
        await browser.close();
        return;
    }

    console.log(`Canvas bounds: x=${box.x}, y=${box.y}, width=${box.width}, height=${box.height}`);

    // Click in the middle of the canvas to trigger flood fill
    // We expect the 'FILL' tool to be active by default as per the updated state.
    const clickX = box.x + box.width * 0.5;
    const clickY = box.y + box.height * 0.5;

    await page.mouse.click(clickX, clickY);
    console.log("Clicked canvas. Waiting for animation...");

    // Take screenshots during the animation
    for(let i=0; i<3; i++) {
        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: `fill_frame_${i+1}.png` });
        console.log(`Saved frame ${i+1}`);
    }

    // Wait extra time for the animation to finish fully
    await new Promise(r => setTimeout(r, 5000));
    
    // Final screenshot
    await page.screenshot({ path: 'after_fill.png' });
    console.log("Animation complete. Final screenshot saved as after_fill.png");

  } catch (err) {
    console.error("Error during test:", err);
  } finally {
    await browser.close();
  }
})();
