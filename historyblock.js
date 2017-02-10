const hostRegexp = /^(.*:\/\/)?[^\/]*/;

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
    this.hash = new SHA1();

    browser.tabs.onRemoved.addListener( 
      (tabId, removeInfo) => this.onTabRemoved(tabId, removeInfo)
    );

    browser.windows.onRemoved.addListener(
      windowId => this.onWindowRemoved(windowId)
    );

    browser.history.onVisited.addListener(
      info => this.onPageVisited(info)
    );

    chrome.contextMenus.create({
      id: "blockthis",
      title: browser.i18n.getMessage('block'),
      contexts: ["all"]
    });

    chrome.contextMenus.create({
      id: "unblockthis",
      title: browser.i18n.getMessage('unblock'),
      contexts: ["all"]
    });

    chrome.contextMenus.onClicked.addListener(
      (info, tab) => this.onContextMenuItemClicked(info, tab)
    );

    browser.runtime.onMessage.addListener( (message) => this.onMessage(message) );
  }

  /**
   *
   */
  async onMessage(message) {
    switch(message.action) {
      case "addToBlacklist":
        this.block(message.url);
        break;
    }
  }

  /**
   * Called when a tab is removed (closed). If the hashed domain name of the 
   * url of the closed tab exists in the HistoryBlock blacklist, then tell the
   * session to forget about that closed tab, thus removing it from the 
   * recently closed tabs list.
   *
   * @param {integer} tabId
   *        The identifier of the tab before it was closed. Note: tabs that are
   *        closed lose their tabId, so this value is useless.
   * @param {object} removeInfo
   *        Metadata about the removed tab.
   */
  async onTabRemoved(tabId, removeInfo) {
    let info = await browser.sessions.getRecentlyClosed();

    if(info[0].tab) {
      let domain = this.getDomainName(info[0].tab.url);
      let hash = await this.hash.digest(domain);
      let blacklist = await this.getBlacklist();

      if(blacklist.includes(hash)) {
        browser.moresessions.forgetClosedTab(info[0].tab.windowId, info[0].tab.sessionId); 
      }
    }
  }

  /**
   * Called when a window is removed (closed). If the hashed domain name of the
   * url of the first tab in the closed window exists in the HistoryBlock 
   * blacklist, then tell the session to forget about that closed window, thus
   * removing it from the recently closed windows list.
   *
   * @param {integer} windowId
   *        The identifier of the window before it was closed. Note: windows 
   *        that are closed lose their windowId, so this value is useless.
   */
  async onWindowRemoved(windowId) {
    let info = await browser.sessions.getRecentlyClosed();

    if(info[0].window) {
      let domain = this.getDomainName(info[0].window.tabs[0].url);
      let hash = await this.hash.digest(domain);
      let blacklist = await this.getBlacklist();

      if(blacklist.includes(hash)) {
        browser.moresessions.forgetClosedWindow(info[0].window.sessionId);
      }
    }
  }

  /**
   * Called when a page finishes loading completely and is added to history. If
   * the domain name of the url of this visit exists in the HistoryBlock 
   * blacklist, then remove the url from the history.
   *
   * @param {object} info
   *        The data about the visit.
   */
  async onPageVisited(info) {
    return this.removeHistory(info.url);
  }

  /**
   * Attempts to remove the given url from the browser history.
   *
   * @param {string} url
   *        The url to remove from the browser history.
   */
  async removeHistory(url) {
    return browser.history.deleteUrl({'url': url});
  }

  /**
   * Called when one of the context menu items is clicked. Largely this is just
   * a router for the different types of context menu clicks.
   *
   * @param {object} info
   *        The data about the context menu click.
   * @param {object} tab
   *        The tab in which the context menu click occurred.
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
   * Retrieves the blacklist from browser storage.
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
   * Attempts to blacklist the domain name of the given url.
   *
   * @param {string} url
   *        The url to add to the blacklist.
   */
  async block(url) {
    let domain = this.getDomainName(url);

    if(domain) {
      let hash = await this.hash.digest(domain);
      let blacklist = await this.getBlacklist();

      if(!blacklist.includes(hash)) {
        blacklist.push(hash);

        browser.storage.sync.set({blacklist:blacklist});

        let test = await browser.storage.sync.get();
      }
    }
  }

  /**
   * Attempts to unblacklist the domain name of the url of the given tab.
   *
   * @param {string} url
   *        The url to remove from the blacklist.
   */
  async unblock(url) {
    let domain = this.getDomainName(url);

    if(domain) {
      let hash = await this.hash.digest(domain);
      let blacklist = await this.getBlacklist();

      if(blacklist.includes(hash)) {
        blacklist.splice(blacklist.indexOf(hash), 1);

        browser.storage.sync.set({blacklist:blacklist});
      }
    }
  }

  /**
   * Helper function for returning the current domain name.
   * Examples: 
   *   https://foo.bar.baz.google.com/ -> google.com
   *   http://www.google.co.uk/ -> google.co.uk
   *
   * @param {string} url
   *        The url for which the domain name should be returned.
   */
  getDomainName(url) {
    let domain = url.match(hostRegexp);
    domain = domain[0].replace(domain[1],"");

    return psl.parse(domain).domain;
  }
}

// Instantiate the HistoryBlock addon.
new HistoryBlock();