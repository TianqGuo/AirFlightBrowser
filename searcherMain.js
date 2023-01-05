// puppeteer-extra is a drop-in replacement for puppeteer,
// it augments the installed puppeteer with plugin functionality
const puppeteer = require('puppeteer-extra');

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// require executablePath from puppeteer
const {executablePath} = require('puppeteer');

const username = "";

const password = "";

puppeteer.use(StealthPlugin());


(async () => {
    // const browser = await puppeteer.launch({headless: false, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
    const browser = await puppeteer.launch({headless: false, executablePath: executablePath() });
    const page = await browser.newPage();
    const timeout = 20000;
    page.setDefaultTimeout(timeout);

    {
        const targetPage = page;
        await targetPage.setViewport({"width":2003,"height":1289})
    }
    
    {
        const targetPage = page;
        const promises = [];
        promises.push(targetPage.waitForNavigation());
        await targetPage.goto("https://arh.antoinevastel.com/bots/areyouheadless");
        await Promise.all(promises);
        await page.waitForTimeout(3000);
        await targetPage.goto("https://www.ana.co.jp/en/us/");
        await Promise.all(promises);
    }

    await page.waitForTimeout(3000);

    // click flight awards
    {
      const targetPage = page;
      await scrollIntoViewIfNeeded(["aria/Flight Awards"], targetPage, timeout);
      const element = await waitForSelectors([["aria/Flight Awards"]], targetPage, { timeout, visible: true });
      await element.click();
    }

    await page.waitForTimeout(3000);

    {
        const targetPage = page;
        // const promises = [];
        // promises.push(targetPage.waitForNavigation());
        await scrollIntoViewIfNeeded([["aria/Award Reservation This page will open in a new tab. If the page is on an external website, it may not be in line with accessibility guidelines. ","aria/[role=\"generic\"]"],["#be-wws-secondary-tab__panel2-d1c8616a-d6fb-ca9a-7d7a-ce635c6ee127 > div > ul > li:nth-child(3) > a > span"],["xpath///*[@id=\"be-wws-secondary-tab__panel2-d1c8616a-d6fb-ca9a-7d7a-ce635c6ee127\"]/div/ul/li[3]/a/span"]], targetPage, timeout);
        const element = await waitForSelectors([["aria/Award Reservation This page will open in a new tab. If the page is on an external website, it may not be in line with accessibility guidelines. ","aria/[role=\"generic\"]"],["#be-wws-secondary-tab__panel2-d1c8616a-d6fb-ca9a-7d7a-ce635c6ee127 > div > ul > li:nth-child(3) > a > span"],["xpath///*[@id=\"be-wws-secondary-tab__panel2-d1c8616a-d6fb-ca9a-7d7a-ce635c6ee127\"]/div/ul/li[3]/a/span"]], targetPage, { timeout, visible: true });
        await element.click();
        // await Promise.all(promises);
    }

    await page.waitForTimeout(5000);

    // get all open pages by the browser
    // the popup should be the last page opened
    const pages = await browser.pages(); 
    const popup = pages[pages.length - 1];

    await popup.waitForTimeout(2000);

    // {
    //   const targetPage = popup;
    //   await targetPage.goto("https://arh.antoinevastel.com/bots/areyouheadless");
    // }

    // input username
    {
      const targetPage = popup;
      await scrollIntoViewIfNeeded([["#accountNumber"]], targetPage, timeout);
      const element = await waitForSelectors([["#accountNumber"]], targetPage, { timeout, visible: true });
      await element.type(username);
    }

    // input password

    {
      const targetPage = popup;
      await scrollIntoViewIfNeeded([["#password"]], targetPage, timeout);
      const element = await waitForSelectors([["#password"]], targetPage, { timeout, visible: true });
      await element.type(password);
    }

    // wait for the page idle
    popup.waitForNavigation({waitUntil: 'networkidle2'})

    // click login
    {
      const targetPage = popup;
      const promises = [];
      promises.push(targetPage.waitForNavigation());
      await scrollIntoViewIfNeeded([["#amcMemberLogin"]], targetPage, timeout);
      const element = await waitForSelectors([["#amcMemberLogin"]], targetPage, { timeout, visible: true });
      await element.click();
      await Promise.all(promises);
    }

    // await browser.close();

    async function waitForSelectors(selectors, frame, options) {
      for (const selector of selectors) {
        try {
          return await waitForSelector(selector, frame, options);
        } catch (err) {
          console.error(err);
        }
      }
      throw new Error('Could not find element for selectors: ' + JSON.stringify(selectors));
    }

    async function scrollIntoViewIfNeeded(selectors, frame, timeout) {
      const element = await waitForSelectors(selectors, frame, { visible: false, timeout });
      if (!element) {
        throw new Error(
          'The element could not be found.'
        );
      }
      await waitForConnected(element, timeout);
      const isInViewport = await element.isIntersectingViewport({threshold: 0});
      if (isInViewport) {
        return;
      }
      await element.evaluate(element => {
        element.scrollIntoView({
          block: 'center',
          inline: 'center',
          behavior: 'auto',
        });
      });
      await waitForInViewport(element, timeout);
    }

    async function waitForConnected(element, timeout) {
      await waitForFunction(async () => {
        return await element.getProperty('isConnected');
      }, timeout);
    }

    async function waitForInViewport(element, timeout) {
      await waitForFunction(async () => {
        return await element.isIntersectingViewport({threshold: 0});
      }, timeout);
    }

    async function waitForSelector(selector, frame, options) {
      if (!Array.isArray(selector)) {
        selector = [selector];
      }
      if (!selector.length) {
        throw new Error('Empty selector provided to waitForSelector');
      }
      let element = null;
      for (let i = 0; i < selector.length; i++) {
        const part = selector[i];
        if (element) {
          element = await element.waitForSelector(part, options);
        } else {
          element = await frame.waitForSelector(part, options);
        }
        if (!element) {
          throw new Error('Could not find element: ' + selector.join('>>'));
        }
        if (i < selector.length - 1) {
          element = (await element.evaluateHandle(el => el.shadowRoot ? el.shadowRoot : el)).asElement();
        }
      }
      if (!element) {
        throw new Error('Could not find element: ' + selector.join('|'));
      }
      return element;
    }

    async function waitForElement(step, frame, timeout) {
      const count = step.count || 1;
      const operator = step.operator || '>=';
      const comp = {
        '==': (a, b) => a === b,
        '>=': (a, b) => a >= b,
        '<=': (a, b) => a <= b,
      };
      const compFn = comp[operator];
      await waitForFunction(async () => {
        const elements = await querySelectorsAll(step.selectors, frame);
        return compFn(elements.length, count);
      }, timeout);
    }

    async function querySelectorsAll(selectors, frame) {
      for (const selector of selectors) {
        const result = await querySelectorAll(selector, frame);
        if (result.length) {
          return result;
        }
      }
      return [];
    }

    async function querySelectorAll(selector, frame) {
      if (!Array.isArray(selector)) {
        selector = [selector];
      }
      if (!selector.length) {
        throw new Error('Empty selector provided to querySelectorAll');
      }
      let elements = [];
      for (let i = 0; i < selector.length; i++) {
        const part = selector[i];
        if (i === 0) {
          elements = await frame.$$(part);
        } else {
          const tmpElements = elements;
          elements = [];
          for (const el of tmpElements) {
            elements.push(...(await el.$$(part)));
          }
        }
        if (elements.length === 0) {
          return [];
        }
        if (i < selector.length - 1) {
          const tmpElements = [];
          for (const el of elements) {
            const newEl = (await el.evaluateHandle(el => el.shadowRoot ? el.shadowRoot : el)).asElement();
            if (newEl) {
              tmpElements.push(newEl);
            }
          }
          elements = tmpElements;
        }
      }
      return elements;
    }

    async function waitForFunction(fn, timeout) {
      let isActive = true;
      const timeoutId = setTimeout(() => {
        isActive = false;
      }, timeout);
      while (isActive) {
        const result = await fn();
        if (result) {
          clearTimeout(timeoutId);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error('Timed out');
    }
})().catch(err => {
    console.error(err);
    process.exit(1);
});
