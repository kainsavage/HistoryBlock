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
    this.changeBlacklistType();
    this.changeBlacklistMatching();
    this.createContextMenuItems();
    this.attachContextMenuControls();
    this.createFunctionBindings();
    this.attachEventListeners();
  }

  /**
   * Creates the HistoryBlock context menu items.
   */
  createContextMenuItems() {
    this.blockContextMenuItem = {
      id: "blockthis",
      title: browser.i18n.getMessage('block'),
      contexts: ["all"]
    };
    this.unblockContextMenuItem = {
      id: "unblockthis",
      title: browser.i18n.getMessage('unblock'),
      contexts: ["all"]
    };
  }

  /**
   * Attaches the context menu controls if enabled in the HistoryBlock options.
   */
  async attachContextMenuControls() {
    let storage = await browser.storage.sync.get();

    if(storage.enableContextMenu === undefined) {
      storage.enableContextMenu = true;
      await browser.storage.sync.set({enableContextMenu: storage.enableContextMenu});
    }

    if(storage.enableContextMenu) {
      browser.contextMenus.create(this.blockContextMenuItem);
      browser.contextMenus.create(this.unblockContextMenuItem);
    }
    else {
      browser.contextMenus.removeAll();
    }
  }

  /**
   * Creates boundFunctions out of all the event listener functions
   * so that the `this` variable always refers to the HistoryBlock object.
   */
  createFunctionBindings() {
    this.onTabRemoved = this.onTabRemoved.bind(this);
    this.onWindowRemoved = this.onWindowRemoved.bind(this);
    this.onPageVisited = this.onPageVisited.bind(this);
    this.onContextMenuItemClicked = this.onContextMenuItemClicked.bind(this);
    this.onMessage = this.onMessage.bind(this);
  }

  /**
   * Attaches the various HistoryBlock event listeners.
   */
  attachEventListeners() {
    browser.tabs.onRemoved.addListener(this.onTabRemoved);
    browser.windows.onRemoved.addListener(this.onWindowRemoved);
    browser.history.onVisited.addListener(this.onPageVisited);
    browser.contextMenus.onClicked.addListener(this.onContextMenuItemClicked);
    browser.runtime.onMessage.addListener(this.onMessage);
  }

  /**
   * Called whenever a message is sent from another extension (or options page).
   *
   * @return {Promise}
   *         A Promise that is fulfilled after the given message has been 
   *         handled.
   */
  async onMessage(message) {
    switch(message.action) {
      case 'addToBlacklist':
        return this.block(message.url);
      case 'importBlacklist':
        return this.importBlacklist(message.blacklist);
      case 'removeFromBlacklist':
        return this.unblock(message.url);
      case 'clearBlacklist':
        return this.clearBlacklist();
      case 'changeBlacklistType':
        await this.changeBlacklistType(message.type)
        return this.clearBlacklist();
      case 'changeBlacklistMatching':
        await this.changeBlacklistMatching(message.matching);
        return this.clearBlacklist();
      case 'changeBlacklistCookies':
        return await this.changeBlacklistCookies(message.blacklistCookies);
      case 'changeContextMenuControls':
        return await this.changeContextMenuControls(message.enabled);
    }
  }

  /**
   * Called when one of the context menu items is clicked. Largely this is just
   * a router for the different types of context menu clicks.
   *
   * @param  {object} info
   *         The data about the context menu click.
   * @param  {object} tab
   *         The tab in which the context menu click occurred.
   * @return {Promise}
   *         A promise that is fulfilled after the context menu click has been
   *         handled.
   */
  async onContextMenuItemClicked(info, tab) {
    switch(info.menuItemId) {
      case "blockthis":
        return this.block(tab.url);
      case "unblockthis":
        return this.unblock(tab.url);
    }
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
    let info = await browser.sessions.getRecentlyClosed({maxResults: 1});

    if(info[0].tab) {
      let tab = info[0].tab;
      let domain = this.matcher.match(tab.url);
      let hash = await this.hash.digest(domain);
      let blacklist = await this.getBlacklist();

      if(blacklist.includes(hash)) {
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
    let info = await browser.sessions.getRecentlyClosed({maxResults: 1});

    if(info[0].window) {
      let containsBlacklistedTab = false;
      for(let i = 0; i < info[0].window.tabs.length; i++) {
        let tab = info[0].window.tabs[i];
        let domain = this.matcher.match(tab.url);
        let hash = await this.hash.digest(domain);
        let blacklist = await this.getBlacklist();

        if(blacklist.includes(hash)) {
          containsBlacklistedTab = true;
        }
      }

      if(containsBlacklistedTab) {
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
    let blacklist = await this.getBlacklist();

    if(blacklist.includes(hash)) {
      await browser.history.deleteUrl({'url': info.url});
    }
  }

  /**
   * Empties out the blacklist.
   *
   * @return {Promise}
   *         A Promise that is fulfilled after the blacklist has been cleared.
   */
  async clearBlacklist() {
    await browser.storage.sync.remove('blacklist');

    // Re-initializes the object.
    await this.getBlacklist();

    // Purposefully do not wait for this Promise to be fulfilled.
    browser.runtime.sendMessage({action: 'blacklistUpdated'});
  }

  /**
   * Retrieves the blacklist from browser storage.
   *
   * @return {Promise}
   *         A Promise that is fulfilled with the value of the blacklist.
   */
  async getBlacklist() {
    let storage = await browser.storage.sync.get();

    if(!storage.blacklist) {
      await browser.storage.sync.set({blacklist:[]});

      storage = await browser.storage.sync.get();
    }

    return storage.blacklist;
  }

  /**
   * Attempts to import the list of hashes into the blacklist.
   *
   * @return {Promise}
   *         A Promise that is fulfilled when the given list of hashes have
   *         been imported into the blacklist.
   */
  async importBlacklist(list) {
    if(list) {
      let blarr = list.split(',');
      let blacklist = await this.getBlacklist();

      for(let i = 0; i < blarr.length; i++) {
        let hash = blarr[i].trim();
        if(!blacklist.includes(hash) && this.hash.test(hash)) {
          blacklist.push(hash);
        }
      }

      await browser.storage.sync.set({blacklist:blacklist});

      // Purposefully do not wait for this Promise to be fulfilled.
      browser.runtime.sendMessage({action: 'blacklistUpdated'});
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

    if(domain) {
      let hash = await this.hash.digest(domain);
      let blacklist = await this.getBlacklist();

      if(!blacklist.includes(hash)) {
        blacklist.push(hash);

        await browser.storage.sync.set({blacklist:blacklist});

        // Purposefully do not wait for this Promise to be fulfilled.
        browser.runtime.sendMessage({action: 'blacklistUpdated'});

        await this.removeCookies(url);

        await browser.history.deleteUrl({'url': url});
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

    if(domain) {
      let hash = await this.hash.digest(domain);
      let blacklist = await this.getBlacklist();

      if(blacklist.includes(hash)) {
        blacklist.splice(blacklist.indexOf(hash), 1);

        await browser.storage.sync.set({blacklist:blacklist});

        // Purposefully do not wait for this Promise to be fulfilled.
        browser.runtime.sendMessage({action: 'blacklistUpdated'});
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

    if(blacklistCookies) {
      let cookies = await browser.cookies.getAll({
        url: url
      });

      cookies.forEach( async cookie => {
        await browser.cookies.remove({
          url: url,
          name: cookie.name
        });
      });
    }
  }

  /**
   * Changes the type of blacklist encryption being used.
   *
   * @param  {string} type
   *         The type of blacklist encryption to use.
   * @return {Promise}
   *         A Promise that is fulfilled after the blacklist encryption type
   *         is potentially changed.
   */
  async changeBlacklistType(type) {
    let blacklist = await this.getBlacklist();

    if(!type) {
      type = await browser.storage.sync.get('type');
      type = type.type;
    }

    if(type === 'none') {
      this.hash = new NoHash();
    }
    else {
      this.hash = new SHA1();
      // Hash the old non-blocked entry.
      blacklist.forEach(async (domain) => {
        await this.block(domain);
      })
    }
    
    await browser.storage.sync.set({type: type});
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
    if(!matching) {
      matching = await browser.storage.sync.get('matching');
      matching = matching.matching;
    }

    if(matching === 'subdomain') {
      this.matcher = new SubdomainMatcher();
    }
    else if(matching === 'url') {
      this.matcher = new URLMatcher();
    }
    else {
      this.matcher = new DomainMatcher();
    }

    await browser.storage.sync.set({matching: matching});
  }

  /**
   * Changes whether cookies should be blacklisted.
   * 
   * @param  {boolean} blacklistCookies 
   *         Whether cookies should be blacklisted.
   * @return {Promise}
   *         A Promise that is fulfilled after the blacklistCookies option is
   *         set.
   */
  async changeBlacklistCookies(blacklistCookies) {
    await browser.storage.sync.set({blacklistCookies: blacklistCookies});
  }

  /**
   * Changes whether the context menu controls are enabled.
   * 
   * @param  {boolean} enabled
   *         Whether the context menu controls should be enabled.
   * @return {Promise}
   *         A Promise that is fulfilled after the context menu controls option
   *         of enabled is set.
   */
  async changeContextMenuControls(enabled) {
    await browser.storage.sync.set({enableContextMenu: enabled});

    await this.attachContextMenuControls();
  }
}

// Instantiate the HistoryBlock addon.
new HistoryBlock();