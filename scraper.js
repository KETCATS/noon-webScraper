const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const rq = require("request-promise");
const fs = require('fs');

//TODO make seller page dynamic by using variables
async function scrapeProducts(page) {
    await page.goto(
        "https://www.noon.com/saudi-en/p-19752"
    );
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

async function scrapeCompetitivePrice(products, page) {
    //forEach loop doesnt work well with puppeteer(it works concurrently) thats why for i loop(a page then another)
    for (var i = 0; i < products.length; i++) {
        await page.goto(products[i].linkToUrl);
        const html = await page.content();
        const $ = cheerio.load(html);
        const productImg = $(".lazyload-wrapper").find("img").attr("src");
        const lowestPrice = $(".lowestPrice").text();
        products[i].lowestPrice = lowestPrice;
        products[i].productImg = productImg;
        await sleep(1000); //Sleep 1 sec
    }
    const data = JSON.stringify(products);
    fs.writeFile("Data.json", data, function (err, result) { if (err) console.log('error', err) })
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

    const page = await browser.newPage();
    const products = await scrapeProducts(page);
    await scrapeCompetitivePrice(products, page);
}
main();