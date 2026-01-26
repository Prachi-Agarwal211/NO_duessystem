const { chromium } = require('playwright');

(async () => {
    console.log('🚀 Starting Audit Check...');
    let browser;
    try {
        browser = await chromium.launch();
        const page = await browser.newPage();

        // Capture console logs
        page.on('console', msg => {
            if (msg.type() === 'error') console.log(`❌ CONSOLE ERROR [${msg.location().url}]: ${msg.text()}`);
        });

        page.on('pageerror', exception => {
            console.log(`❌ UNCAUGHT EXCEPTION: "${exception}"`);
        });

        const checkPage = async (url) => {
            console.log(`\n----------------------------------------`);
            console.log(`Processing ${url}...`);
            try {
                const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
                if (!response) {
                    console.log('⚠️ No response received');
                    return;
                }
                console.log(`✅ Status: ${response.status()}`);
                console.log(`📄 Title: ${await page.title()}`);

                // Check for specific elements
                const h1 = await page.evaluate(() => document.querySelector('h1')?.innerText);
                console.log(`#️⃣ H1: ${h1 || 'None'}`);

                // Check for loading spinners
                const spinners = await page.locator('.animate-spin').count();
                if (spinners > 0) {
                    console.warn(`⚠️ Warning: Found ${spinners} active loading spinners on page.`);
                }

            } catch (e) {
                console.error(`❌ Failed to load ${url}: ${e.message}`);
            }
        };

        await checkPage('http://localhost:3000');
        await checkPage('http://localhost:3000/staff/login');
        // We can't easily check protected routes without login flow, but we can check if they redirect
        await checkPage('http://localhost:3000/department');

    } catch (err) {
        console.error('🔥 Fatal Audit Error:', err);
    } finally {
        if (browser) await browser.close();
        console.log('\nAudit Complete.');
        process.exit(0);
    }
})();
