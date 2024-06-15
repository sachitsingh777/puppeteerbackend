const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());  // Enable CORS
app.use(express.json());  // Middleware to parse JSON request body

let articles = [];

// Route to handle POST request for scraping Medium


app.post('/scrape', async (req, res) => {
    const { topic } = req.body; // Extract topic from request body
    if (!topic) {
        return res.status(400).json({ error: 'Topic is required' });
    }

    try {
        // Launch Puppeteer browser instance
        const browser = await puppeteer.launch({
            headless: true, // Run in headless mode (no UI)
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        // Create a new page within the browser
        const page = await browser.newPage();

        // Navigate to Medium search page for the specified topic
        await page.goto(`https://medium.com/search?q=${encodeURIComponent(topic)}`, { waitUntil: 'networkidle2' });

        // Wait for the search input field to be available
        await page.waitForSelector('input[role="combobox"][data-testid="headerSearchInput"]');

        // Extract article data using Puppeteer's evaluate function
        const articles = await page.evaluate(() => {
            // Select all article elements on the page
            const articleElements = Array.from(document.querySelectorAll('div.js-postListHandle article'));

            // Map over the first 5 articles found and extract relevant data
            return articleElements.slice(0, 5).map(article => {
                const titleElement = article.querySelector('h3');
                const title = titleElement ? titleElement.innerText.trim() : null;

                const authorElement = article.querySelector('a[rel=author]');
                const author = authorElement ? authorElement.innerText.trim() : null;

                const dateElement = article.querySelector('time');
                const date = dateElement ? dateElement.getAttribute('datetime') : null;

                const urlElement = article.querySelector('a');
                const url = urlElement ? urlElement.href : null;

                return { title, author, date, url };
            });
        });

        // Close the Puppeteer browser
        await browser.close();

        // Respond with the scraped articles
        res.status(200).json(articles);
    } catch (error) {
        // Handle errors and send appropriate HTTP response
        console.error('Error scraping Medium:', error);
        res.status(500).json({ error: error.message });
    }
});


// Route to get the scraped articles
app.get('/articles', (req, res) => {
    // Respond with the latest scraped articles
    res.status(200).json(articles);
});

// Start the server and listen on the specified port
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
