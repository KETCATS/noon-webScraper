const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const fs = require('fs');

// to get the last page in seller page
async function pagesCount(page) {
    await page.goto(
        "https://www.noon.com/saudi-en/p-19752?limit=150"
    );
    const html = await page.content();
    const $ = cheerio.load(html);
    const lastPage = $("#__next > div > section > div > div > div > div.sc-1be8ju5-5.ikCHFE > div.sc-1be8ju5-8.cqIPQh > div > ul > li:nth-child(6) > a");
    const lastPageIndex = parseInt(lastPage.text());
    console.log(`last page is ${lastPageIndex} we're passed here`)
    return lastPageIndex;
}

//Higher order function to repeat scraping products from all pages
async function scrapeProducts(page, lastPage) {
    let products = [];
    for (let index = 1; index <= lastPage; index++) {
        products.push.apply(products, await scrapePage(page, index));
    }
    console.log(products)
    return products
}

//TODO make seller page dynamic by using variables
async function scrapePage(page, pageIndex) {
    try {
        await page.goto(
            `https://www.noon.com/saudi-en/p-19752?limit=150&page=${pageIndex}`
            , { 'timeout': 10000, 'waitUntil': 'load' });
    } catch {
        await page.goto(
            `https://www.noon.com/saudi-en/p-19752?limit=150&page=${pageIndex}`
            , { 'timeout': 10000, 'waitUntil': 'load' });
    }
    const html = await page.content();
    const $ = cheerio.load(html);
    //TODO fix this 5sec rule

    const products = $(".productContainer").map((index, element) => {
        const SKU = $(element).find("a").attr("id").split(/[- ]+/).pop();
        const linkToUrl = `https://www.noon.com${$(element).find("a").attr("href")}`;
        const productName = $(element).find(`[data-qa='product-name']`).children().text();
        const yourPrice = $(element).find(".currency").parent().text()
        return { SKU, linkToUrl, yourPrice, productName }

    }).get()

    return products;
}


async function pageManager(products, pages) {
    let arr = [];
    for (let i = 0; i < products.length; i++) {
        arr.push(i);
    }
    while (arr.length > 0) {
        if (arr.length <= 4) { scrapeCompetitivePrice(products, pages[0], arr.pop()) };
        await Promise.all([
            scrapeCompetitivePrice(products, pages[0], arr.pop()),
            scrapeCompetitivePrice(products, pages[1], arr.pop()),
            scrapeCompetitivePrice(products, pages[2], arr.pop()),
            scrapeCompetitivePrice(products, pages[3], arr.pop()),
            scrapeCompetitivePrice(products, pages[4], arr.pop())
        ])
    }
}

async function scrapeCompetitivePrice(products, page, index) {
    //forEach loop doesnt work well with puppeteer(it works concurrently) thats why for i loop(a page then another)

    /*
            try {
                await page.waitForSelector('#element', { timeout: 1000 });
                // do what you have to do here
            } catch (e) {
                console.log('element probably not exists');
            }
    */

    try {
        await page.goto(products[index].linkToUrl, { 'timeout': 10000, 'waitUntil': 'load' })
    } catch {
        await page.goto(products[index].linkToUrl, { 'timeout': 10000, 'waitUntil': 'load' })
        console.table("Hey i'm here again teh catch is Real")
    }
    const html = await page.content();
    const $ = cheerio.load(html);
    const productImg = $(".lazyload-wrapper").find("img").attr("src");
    const lowestPrice = $(".lowestPrice").text();
    products[index].lowestPrice = lowestPrice;
    products[index].productImg = productImg;
    console.log("printed number : " + index);


}

async function sleep(miliseconds) {
    return new Promise(resolve => setTimeout(resolve, miliseconds));
}

async function main() {
    //MongoSTuff//await MongoDB();
    const browser = await puppeteer.launch({
        headless: false,
    });
    // headless : false,, open a browser window
    // ,, good when debugging becuase browser isn't hidden ,
    //otherwise if using a ready scraper & when deployed on a server headless : true

    const pages = [await browser.newPage(), await browser.newPage(), await browser.newPage(), await browser.newPage(), await browser.newPage()];
    const lastPage = await pagesCount(pages[0]);
    const products = await scrapeProducts(pages[0], lastPage);
    await pageManager(products, pages);
    const data = JSON.stringify(products);
    fs.writeFile("Data.json", data, function (err, result) { if (err) console.log('error', err) })
    await browser.close()
} main();

//TODO make code stop if access denied page is faced
//TODO make more pages
//TODO make switch on element load not page load
//TODO make it complete for left products if stopped
//TODO make pages goes faster independantly from one another
//TODO make it stops when arr is finished of scraping links, line : 62
