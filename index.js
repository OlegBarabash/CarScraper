import puppeteer from "puppeteer-core";
import fs from "fs-extra";

const SBR_WS_ENDPOINT =
  "wss://brd-customer-hl_7e2f3345-zone-scraping_cars:yggiufuzayq9@brd.superproxy.io:9222";
const URL = "https://www.icarros.com.br/comprar/volkswagen/gol?reg=city";

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserWSEndpoint: SBR_WS_ENDPOINT });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });
    page.setDefaultNavigationTimeout(2 * 60 * 1000);

    await page.goto(URL);
    await page.waitForSelector(".offer-card");

    const carsLinks = await getLinksFromPage(page);

    for (let i = 1; i < 10; i += 1) {
      await nextPage(page);
      await page.waitForNavigation();
      carsLinks.push(...(await getLinksFromPage(page)));
    }

    const carsListInfo = [];

    for (let i = 0; i < carsLinks.length; i += 1) {
      const { url } = carsLinks[i];
      await page.goto(url);
      await page.waitForSelector(".sectionlimit .conteudo-anuncio");

      const infoNote = await page.$$(".card-conteudo span");
      const info = await Promise.all(
        infoNote.map(async (li) => {
          return await li.evaluate((sp) => sp.textContent);
        })
      );

      carsListInfo.push({
        offer_url: url,
        title: await page.$eval("#ctdoTopo h1", (elem) => elem.innerText),
        car_year: info[0],
        car_millage: info[1],
        color: info[2],
      });
    }

    fs.writeFile(
      "carsLinksInfo.json",
      JSON.stringify(carsListInfo, null, 4),
      (err) => {
        if (err) throw err;
      }
    );
  } catch (error) {
    console.error("ERROR - ", error);
  } finally {
    browser.close();
  }
})();

const getLinksFromPage = async (p) =>
  await p.$$eval("#cards-grid .offer-card   ", (elements) =>
    elements.map((e) => ({
      url: e.querySelector("a").href,
    }))
  );

const nextPage = async (p) => {
  const selector =
    ".pagination .ids-icon-button__neutral .itaufonts_seta_right";
  await p.waitForSelector(selector);
  await p.click(selector);
};
