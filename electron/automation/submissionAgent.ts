import { chromium } from 'playwright-extra';
// @ts-ignore
import stealth from 'puppeteer-extra-plugin-stealth';
import fs from 'node:fs';

chromium.use(stealth());

export async function runSubmission(data: any, sendProgress: (msg: any) => void) {
    const { paper, venue, credentials } = data;
    
    sendProgress({ step: 'init', message: 'Launching stealth Chromium browser...' });
    
    try {
        const potentialPaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
        ];
        
        let execPath = undefined;
        for (const p of potentialPaths) {
            if (fs.existsSync(p)) {
                execPath = p;
                break;
            }
        }

        const bounds = data.absoluteBounds || { x: 50, y: 50, width: 400, height: 650 };
        // We add a tiny buffer for the window frame borders depending on the OS, but in app mode it's small.
        const startSize = `--window-size=${bounds.width},${bounds.height}`;
        const startPos = `--window-position=${bounds.x},${bounds.y}`;

        const browser = await chromium.launch({
            headless: false, // User can see what's happening
            executablePath: execPath,
            args: [
                '--app=data:,', 
                startSize, 
                startPos,
                '--no-sandbox',
                '--disable-infobars',
                '--hide-scrollbars'
            ]
        });
        
        const context = await browser.newContext({ viewport: null });
        const page = await context.newPage();
        
        const portalUrl = credentials?.portal_url || venue.submission_url || `https://submit.example.com`;
        
        sendProgress({ step: 'navigate', message: `Navigating to ${portalUrl} in micro-browser...` });
        await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {
            // Ignore timeouts
        });
        
        sendProgress({ step: 'login', message: 'Ready for login...' });
        
        // Wait 3 seconds for demo purposes
        await page.waitForTimeout(3000);
        
        // Dynamic Zoom for user intervention!
        sendProgress({ step: 'form_fill', message: `Human intervention required! Zooming browser...` });
        
        // Resize the actual OS window to be large so the user can see everything clearly
        await page.evaluate(() => window.resizeTo(1200, 800));
        await page.evaluate(() => window.moveTo(
            (window.screen.availWidth / 2) - 600, 
            (window.screen.availHeight / 2) - 400
        ));
        
        // Give the user 10 seconds to solve the captcha or fill the form out
        sendProgress({ step: 'form_fill', message: `Please solve the challenge or verify inputs within the expanded window...` });
        await page.waitForTimeout(10000); 
        
        // Shrink it back down exactly into the placeholder DOM bounds
        sendProgress({ step: 'form_fill', message: `Action complete. Returning micro web view to bounds.` });
        
        await page.evaluate((b) => window.resizeTo(b.width, b.height), bounds);
        await page.evaluate((b) => window.moveTo(b.x, b.y), bounds);
        
        // Return success mock
        return { success: true, url: portalUrl };
        
    } catch (error: any) {
        sendProgress({ step: 'error', message: `Browser error: ${error.message}` });
        return { success: false, error: error.message };
    }
}
