/**
 * HistoryBlock is an extension for maintaining a blacklist of undesirable 
 * domain names which should not be tracked by any history/session/cache/etc
 * of the browser.
 */
class HistoryBlock {

  /**
   * Simple constructor which initializes all the required listeners and 
   * components of the HistoryBlock addon.
   */
  constructor() {
    this.changeBlacklistEncryption();
    this.changeBlacklistMatching();
    this.changeBlacklistType();
    this.createFunctionBindings();
    this.attachEventListeners();

    this.contextMenu = new ContextMenu(this);
  }

  /**
   * Creates boundFunctions out of all the event listener functions
   * so that the `this` variable always refers to the HistoryBlock object.
   */
  createFunctionBindings() {
    this.onTabRemoved = this.onTabRemoved.bind(this);
    this.onWindowRemoved = this.onWindowRemoved.bind(this);
    this.onPageVisited = this.onPageVisited.bind(this);
    this.onMessage = this.onMessage.bind(this);
  }

  /**
   * Attaches the various HistoryBlock event listeners.
   */
  attachEventListeners() {
    browser.tabs.onRemoved.addListener(this.onTabRemoved);
    browser.windows.onRemoved.addListener(this.onWindowRemoved);
    browser.history.onVisited.addListener(this.onPageVisited);
    browser.runtime.onMessage.addListener(this.onMessage);
  }

  /**
   * Called whenever a message is sent from another extension (or options page).
   *
   * @return {boolean}
   *         Whether this handler successfully handle the message.
   */
  onMessage(message, sender, sendResponse) {
    switch (message.action) {
      case ACTION.GET_BLACKLIST:
        return this.blacklist.list();
      case ACTION.ADD_TO_BLACKLIST:
        this.block(message.url);
      case ACTION.IMPORT_BLACKLIST:
        this.blacklist.import(message.blacklist);
      case ACTION.REMOVE_FROM_BLACKLIST:
        this.unblock(message.url);
      case ACTION.CLEAR_BLACKLIST:
        this.blacklist.clear();
      case ACTION.CHANGE_BLACKLIST_ENCRYPTION_TYPE:
        this.changeBlacklistEncryption(message.encryptionType).then(() => this.blacklist.clear());
      case ACTION.CHANGE_BLACKLIST_MATCHING:
        this.changeBlacklistMatching(message.matching).then(() => this.blacklist.clear());
      case ACTION.ENABLE_BLACKLIST_COOKIES:
        this.enableBlacklistCookies();
      case ACTION.DISABLE_BLACKLIST_COOKIES:
        this.disableBlacklistCookies();
    }

    return false;
  }

  /**
   * Called when a tab is removed (closed). If the hashed domain name of the 
   * url of the closed tab exists in the HistoryBlock blacklist, then tell the
   * session to forget about that closed tab, thus removing it from the 
   * recently closed tabs list.
   *
   * @param  {integer} tabId
   *         The identifier of the tab before it was closed. Note: tabs that are
   *         closed lose their tabId, so this value is useless.
   * @param  {object} removeInfo
   *         Metadata about the removed tab.
   * @return {Promise}
   *         A Promise that is fulfilled after a tab has been removed and then
   *         potentially forgotten.
   */
  async onTabRemoved(tabId, removeInfo) {
    let info = await browser.sessions.getRecentlyClosed({ maxResults: 1 });

    if (info[0].tab) {
      let tab = info[0].tab;
      let domain = this.matcher.match(tab.url);
      let hash = await this.hash.digest(domain);
      let blacklist = await this.blacklist.list();

      if (blacklist.includes(hash)) {
        await browser.sessions.forgetClosedTab(tab.windowId, tab.sessionId);

        await this.removeCookies(tab.url);
      }
    }
  }

  /**
   * Called when a window is removed (closed). If the hashed domain name of the
   * url of the first tab in the closed window exists in the HistoryBlock 
   * blacklist, then tell the session to forget about that closed window, thus
   * removing it from the recently closed windows list.
   *
   * @param  {integer} windowId
   *         The identifier of the window before it was closed. Note: windows 
   *         that are closed lose their windowId, so this value is useless.
   * @return {Promise}
   *         A Promise that is fulfilled after a window has been removed and
   *         then potentially forgotten.
   */
  async onWindowRemoved(windowId) {
    let info = await browser.sessions.getRecentlyClosed({ maxResults: 1 });

    if (info[0].window) {
      let containsBlacklistedTab = false;
      for (let i = 0; i < info[0].window.tabs.length; i++) {
        let tab = info[0].window.tabs[i];
        let domain = this.matcher.match(tab.url);
        let hash = await this.hash.digest(domain);
        let blacklist = await this.blacklist.list();

        if (blacklist.includes(hash)) {
          containsBlacklistedTab = true;
        }
      }

      if (containsBlacklistedTab) {
        await browser.sessions.forgetClosedWindow(info[0].window.sessionId);

        await this.removeCookies(tab.url);
      }
    }
  }

  /**
   * Called when a page finishes loading completely and is added to history. If
   * the domain name of the url of this visit exists in the HistoryBlock 
   * blacklist, then remove the url from the history.
   *
   * @param  {object} info
   *         The data about the visit.
   * @return {Promise}
   *         A Promise that is fulfilled after a page has been visited and 
   *         then potentially removed from the browser history.
   */
  async onPageVisited(info) {
    let domain = this.matcher.match(info.url);
    let hash = await this.hash.digest(domain);
    let blacklist = await this.blacklist.list();

    if (blacklist.includes(hash)) {
      await browser.history.deleteUrl({ url: info.url });
    }
  }

  /**
   * Attempts to blacklist the domain name of the given url.
   *
   * @param  {string} url
   *         The url to add to the blacklist.
   * @return {Promise}
   *         A Promise that is fulfilled after the given URL is potentially
   *         added to the blacklist.
   */
  async block(url) {
    let domain = this.matcher.match(url);

    if (domain) {
      let hash = await this.hash.digest(domain);
      let blacklist = await this.blacklist.list();

      if (!blacklist.includes(hash)) {
        blacklist.push(hash);

        await browser.storage.sync.set({ blacklist: blacklist });

        // Purposefully do not wait for this Promise to be fulfilled.
        browser.runtime.sendMessage({ action: ACTION.BLACKLIST_UPDATED });

        await this.removeCookies(url);

        await browser.history.deleteUrl({ url: url });
      }
    }
  }

  /**
   * Attempts to unblacklist the domain name of the url of the given tab.
   *
   * @param  {string} url
   *         The url to remove from the blacklist.
   * @return {Promise}
   *         A Promise that is fulfilled after the given URL is potentially
   *         removed from the blacklist.
   */
  async unblock(url) {
    let domain = this.matcher.match(url);

    if (domain) {
      let hash = await this.hash.digest(domain);
      let blacklist = await this.blacklist.list();

      if (blacklist.includes(hash)) {
        blacklist.splice(blacklist.indexOf(hash), 1);

        await browser.storage.sync.set({ blacklist: blacklist });

        // Purposefully do not wait for this Promise to be fulfilled.
        browser.runtime.sendMessage({ action: ACTION.BLACKLIST_UPDATED });
      }
    }
  }

  /**
   * Deletes all cookies directly related to the given URL.
   * 
   * Note: only deletes cookies if user has set preference to do so.
   * 
   * @param  {string} url
   *         The full URL that will determine the cookies to delete.
   * @return {Promise}
   *         A Promise that is fulfilled after the cookies associated
   *         to url are deleted.
   */
  async removeCookies(url) {
    let blacklistCookies = await browser.storage.sync.get('blacklistCookies');
    blacklistCookies = blacklistCookies.blacklistCookies;

    if (blacklistCookies) {
      let cookies = await browser.cookies.getAll({
        url: url
      });

      cookies.forEach(async cookie => {
        await browser.cookies.remove({
          url: url,
          name: cookie.name
        });
      });
    }
  }

  /**
   * Changes the type of blacklist to use.
   * 
   * @param  {string} blacklistType
   *         The type of blacklist to use.
   * @return {Promise}
   *         A Promise that is fulfilled after blacklist type is potentially
   *         changed.
   */
  async changeBlacklistType(blacklistType) {
    if (!blacklistType) {
      blacklistType = await browser.storage.sync.get('blacklistType');
      blacklistType = blacklistType.blacklistType;
    }

    if (false) {
      // Stubbed to always fail.
      // In the future when there will be additional type(s), this will
      // be checking against the value of blacklistType
    }
    else {
      this.blacklist = new SyncStorageBlacklist(this.hash);
    }

    await browser.storage.sync.set({ blacklistType: blacklistType });
  }

  /**
   * Changes the type of blacklist encryption being used.
   *
   * @param  {string} encryption
   *         The type of blacklist encryption to use.
   * @return {Promise}
   *         A Promise that is fulfilled after the blacklist encryption type
   *         is potentially changed.
   */
  async changeBlacklistEncryption(encryption) {
    if (!encryption) {
      encryption = await browser.storage.sync.get('encryption');
      encryption = encryption.encryption;
    }

    if (encryption === 'none') {
      this.hash = new NoHash();
    }
    else {
      this.hash = new SHA1();
    }

    await browser.storage.sync.set({ encryption: encryption });
  }

  /**
   * Changes the blacklist matching being used.
   *
   * @param  {string} matching
   *         The technique of matching to use.
   * @return {Promise}
   *         A Promise that is fulfilled after the blacklist URL matching
   *         technique is potentially changed.
   */
  async changeBlacklistMatching(matching) {
    if (!matching) {
      matching = await browser.storage.sync.get('matching');
      matching = matching.matching;
    }

    if (matching === 'subdomain') {
      this.matcher = new SubdomainMatcher();
    }
    else if (matching === 'url') {
      this.matcher = new URLMatcher();
    }
    else {
      this.matcher = new DomainMatcher();
    }

    await browser.storage.sync.set({ matching: matching });
  }

  /**
   * Sets the option specifying that cookies should be blacklisted.
   * 
   * @return {Promise}
   *         A Promise that is fulfilled after the blacklistCookies option is
   *         set.
   */
  async enableBlacklistCookies() {
    await browser.storage.sync.set({ blacklistCookies: true });
  }

  /**
   * Sets the option specifying that cookies should not be blacklisted.
   * 
   * @return {Promise}
   *         A Promise that is fulfilled after the blacklistCookies option is
   *         set.
   */
  async disableBlacklistCookies() {
    await browser.storage.sync.set({ blacklistCookies: false });
  }
}

// Instantiate the HistoryBlock addon.
new HistoryBlock();