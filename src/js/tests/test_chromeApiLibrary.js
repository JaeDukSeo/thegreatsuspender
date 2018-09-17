/*global chrome, gsUtils, gsChrome, assertTrue */
var testSuites = typeof testSuites === 'undefined' ? [] : testSuites;
testSuites.push(
  (function() {
    'use strict';

    async function removeTestTab(tabId, retainFocus) {
      const currentTab = await new Promise(r => chrome.tabs.getCurrent(r));
      await new Promise(r => chrome.tabs.remove(tabId, r));
      if (retainFocus) {
        await new Promise(r =>
          chrome.tabs.update(currentTab.id, { active: true }, r)
        );
      }
    }
    async function removeTestWindow(windowId, retainFocus) {
      const currentWindow = await new Promise(r =>
        chrome.windows.getCurrent(r)
      );
      await new Promise(r => chrome.windows.remove(windowId, r));
      const removedWindow = await new Promise(r => chrome.windows.get(windowId, r));
      if (removedWindow) {
        await gsUtils.setTimeout(100);
      }
      if (retainFocus) {
        await new Promise(r =>
          chrome.windows.update(currentWindow.id, { focused: true }, r)
        );
      }
    }

    const testTabUrl = 'http://rabbits.com/';

    const tests = [
      // Test gsUtils.setTimeout
      async () => {
        const timeout = 500;
        const timeBefore = new Date().getTime();
        await gsUtils.setTimeout(timeout);
        const timeAfter = new Date().getTime();
        const isTimeAfterValid =
          timeAfter > timeBefore + timeout &&
          timeAfter < timeBefore + timeout + 200;

        return assertTrue(isTimeAfterValid);
      },

      // Test gsChrome.cookiesGetAll and gsChrome.cookiesRemove
      async () => {
        const cookieUrl = 'http://rabbits.com/';
        const cookieName = 'gsTest';
        const cookieValue = 'rabbitts';

        await new Promise(r =>
          chrome.cookies.remove({ url: cookieUrl, name: cookieName }, r)
        );
        const cookieAtStart = await new Promise(r =>
          chrome.cookies.get({ url: cookieUrl, name: cookieName }, r)
        );
        const isCookieAtStartValid = cookieAtStart === null;

        await new Promise(r =>
          chrome.cookies.set(
            { url: cookieUrl, name: cookieName, value: cookieValue },
            r
          )
        );
        const cookieBefore = await new Promise(r =>
          chrome.cookies.get({ url: cookieUrl, name: cookieName }, r)
        );
        const isCookieBeforeValid = cookieBefore.value === cookieValue;

        const cookiesBefore = await gsChrome.cookiesGetAll();
        const isCookiePresentInGetAll = cookiesBefore.some(
          o => o.value.indexOf(cookieValue) === 0
        );

        await gsChrome.cookiesRemove(cookieUrl, cookieName);
        const cookiesAfter = await gsChrome.cookiesGetAll();
        const isCookieRemovedFromGetAll = cookiesAfter.every(
          o => o.value.indexOf(cookieValue) !== 0
        );

        return assertTrue(
          isCookieAtStartValid &&
            isCookieBeforeValid &&
            isCookiePresentInGetAll &&
            isCookieRemovedFromGetAll
        );
      },

      // Test gsUtils.tabsCreate
      async () => {
        // stub gsUtils.error function
        let errorObj;
        gsUtils.error = (id, _errorObj, ...args) => {
          errorObj = _errorObj;
        };

        const newTab1 = await gsChrome.tabsCreate();
        const isNewTab1Valid =
          newTab1 === null && errorObj === 'url not specified';

        const newTab2 = await gsChrome.tabsCreate(testTabUrl);
        const isNewTab2Valid = newTab2.url === testTabUrl;

        // cleanup
        await removeTestTab(newTab2.id, true);

        return assertTrue(isNewTab1Valid && isNewTab2Valid);
      },

      // Test gsUtils.tabsUpdate
      async () => {
        // stub gsUtils.error function
        let errorObj;
        gsUtils.error = (id, _errorObj, ...args) => {
          errorObj = _errorObj;
        };

        // create a test tab to update
        const testTab1 = await new Promise(r =>
          chrome.tabs.create({ url: testTabUrl, active: false }, r)
        );
        const isTestTab1Valid = testTab1.url === testTabUrl;

        const updateTab1 = await gsChrome.tabsUpdate();
        const isUpdateTab1Valid =
          updateTab1 === null &&
          errorObj === 'tabId or updateProperties not specified';

        const updateTab2 = await gsChrome.tabsUpdate(testTab1.id);
        const isUpdateTab2Valid =
          updateTab2 === null &&
          errorObj === 'tabId or updateProperties not specified';

        const updateTab3 = await gsChrome.tabsUpdate(7777, {});
        const isUpdateTab3Valid =
          updateTab3 === null && errorObj.message === 'No tab with id: 7777.';

        const isUpdateTab4BeforeValid = testTab1.pinned === false;
        const updateTab4 = await gsChrome.tabsUpdate(testTab1.id, {
          pinned: true,
        });
        const isUpdateTab4AfterValid = updateTab4.pinned === true;

        // cleanup
        await removeTestTab(testTab1.id, false);

        return assertTrue(
          isTestTab1Valid &&
            isUpdateTab1Valid &&
            isUpdateTab2Valid &&
            isUpdateTab3Valid &&
            isUpdateTab4BeforeValid &&
            isUpdateTab4AfterValid
        );
      },

      // Test gsUtils.tabsGet
      async () => {
        // stub gsUtils.error function
        let errorObj;
        gsUtils.error = (id, _errorObj, ...args) => {
          errorObj = _errorObj;
        };

        // create a test tab
        const testTab1 = await new Promise(r =>
          chrome.tabs.create({ url: testTabUrl, active: false }, r)
        );
        const isTestTab1Valid = testTab1.url === testTabUrl;

        const tab1 = await gsChrome.tabsGet();
        const isTab1Valid = tab1 === null && errorObj === 'tabId not specified';

        const tab2 = await gsChrome.tabsGet(7777);
        const isTab2Valid =
          tab2 === null && errorObj.message === 'No tab with id: 7777.';

        const tab3 = await gsChrome.tabsGet(testTab1.id);
        const isTab3Valid = tab3.url === testTabUrl;

        // cleanup
        await removeTestTab(testTab1.id, false);

        return assertTrue(
          isTestTab1Valid && isTab1Valid && isTab2Valid && isTab3Valid
        );
      },

      // Test gsChrome.tabsQuery
      async () => {
        const tabsBefore = await gsChrome.tabsQuery();

        // create a test tab
        const testTab1 = await new Promise(r =>
          chrome.tabs.create({ url: testTabUrl, active: false }, r)
        );
        const isTestTab1Valid = testTab1.url === testTabUrl;

        const tabsAfter = await gsChrome.tabsQuery();
        const areTabsAfterValid = tabsAfter.length === tabsBefore.length + 1;

        // cleanup
        await removeTestTab(testTab1.id, false);

        return assertTrue(isTestTab1Valid && areTabsAfterValid);
      },

      // Test gsChrome.tabsRemove
      async () => {
        // stub gsUtils.error function
        let errorObj;
        gsUtils.error = (id, _errorObj, ...args) => {
          errorObj = _errorObj;
        };

        // create a test tab
        const testTab1 = await new Promise(r =>
          chrome.tabs.create({ url: testTabUrl, active: false }, r)
        );
        const isTestTab1Valid = testTab1.url === testTabUrl;

        await gsChrome.tabsRemove();
        const isTabRemove1Valid = errorObj === 'tabId not specified';

        await gsChrome.tabsRemove(7777);
        const isTabRemove2Valid = errorObj.message === 'No tab with id: 7777.';

        await gsChrome.tabsRemove(testTab1.id);

        const testTab1Removed = await gsChrome.tabsGet(testTab1.id);
        const isTabRemove3Valid = testTab1Removed === null;

        return assertTrue(
          isTestTab1Valid &&
            isTabRemove1Valid &&
            isTabRemove2Valid &&
            isTabRemove3Valid
        );
      },

      // Test gsChrome.windowsCreate
      async () => {
        const windowsBefore = await new Promise(r =>
          chrome.windows.getAll({ populate: true }, r)
        );

        // create a test window
        const testWindow1 = await gsChrome.windowsCreate({
          focused: false,
        });
        const isTestWindow1Valid = testWindow1.tabs.length === 1;

        const windowsAfter = await new Promise(r =>
          chrome.windows.getAll({ populate: true }, r)
        );
        const areWindowsAfterValid =
          windowsAfter.length === windowsBefore.length + 1 &&
          windowsAfter[windowsBefore.length].tabs[0].title === 'New Tab';

        // cleanup
        await removeTestWindow(testWindow1.id, false);

        return assertTrue(isTestWindow1Valid && areWindowsAfterValid);
      },

      // Test gsUtils.windowsGetAll
      async () => {
        const windowsBefore = await gsChrome.windowsGetAll();

        // create a test window
        const testWindow1 = await new Promise(r =>
          chrome.windows.create({ focused: false }, r)
        );
        const isTestWindow1Valid = testWindow1.tabs.length === 1;

        const windowsAfter = await gsChrome.windowsGetAll();
        const areWindowsAfterValid =
          windowsAfter.length === windowsBefore.length + 1 &&
          windowsAfter[windowsBefore.length].tabs[0].title === 'New Tab';

        // cleanup
        await removeTestWindow(testWindow1.id, false);

        return assertTrue(isTestWindow1Valid && areWindowsAfterValid);
      },

      // Test gsChrome.windowsUpdate
      async () => {
        // stub gsUtils.error function
        let errorObj;
        gsUtils.error = (id, _errorObj, ...args) => {
          errorObj = _errorObj;
        };

        // create a test window to update
        const testWindow1 = await new Promise(r =>
          chrome.windows.create({ focused: false }, r)
        );
        const isTestWindow1Valid = testWindow1.tabs.length === 1;

        const updateWindow1 = await gsChrome.windowsUpdate();
        const isUpdateWindow1Valid =
          updateWindow1 === null &&
          errorObj === 'windowId or updateInfo not specified';

        const updateWindow2 = await gsChrome.windowsUpdate(testWindow1.id);
        const isUpdateWindow2Valid =
          updateWindow2 === null &&
          errorObj === 'windowId or updateInfo not specified';

        const updateWindow3 = await gsChrome.windowsUpdate(7777, {});
        const isUpdateWindow3Valid =
          updateWindow3 === null &&
          errorObj.message === 'No window with id: 7777.';

        const testWidth = 500;
        const isUpdateWindow4BeforeValid = testWindow1.width !== testWidth;
        const updateWindow4 = await gsChrome.windowsUpdate(
          testWindow1.id,
          {
            width: testWidth,
          }
        );
        const isUpdateWindow4AfterValid = updateWindow4.width === testWidth;

        // cleanup
        await removeTestWindow(testWindow1.id, false);

        return assertTrue(
          isTestWindow1Valid &&
            isUpdateWindow1Valid &&
            isUpdateWindow2Valid &&
            isUpdateWindow3Valid &&
            isUpdateWindow4BeforeValid &&
            isUpdateWindow4AfterValid
        );
      },
    ];

    return {
      name: 'Chrome API Library',
      tests,
    };
  })()
);