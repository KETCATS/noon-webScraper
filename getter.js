const request = require('request-promise');
const fs = require('fs');

async function getHtml(url) {
    const html = await request
        .get(url);
    return html;
}

function saveHtmlToFile(html) {
    fs.writeFileSync("./test.html", html);
}

async function main() {
    const html = await getHtml("https://www.noon.com/saudi-en/p-19752");
    saveHtmlToFile(html);
}

main();

