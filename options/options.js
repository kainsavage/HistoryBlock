class Options {
  constructor() {
    this.attachDOMListeners();
    
    browser.runtime.onMessage.addListener(
      message => this.onMessage(message) );

    this.renderBlacklistType();
    this.renderBlacklistMatching();
    this.renderContextMenu();
    this.renderBlacklist();
  }

  /**
   * Attaches the event listeners to the DOM.
   */
  attachDOMListeners() {
    document.querySelector("#resetBlacklist").addEventListener(
      "click", () => this.resetBlacklist());
    document.querySelector("#addToBlacklist").addEventListener(
      "click", () => this.addToBlacklist());
    document.querySelector("#removeFromBlacklist").addEventListener(
      "click", () => this.removeFromBlacklist());
    document.querySelector("#blacklisttype").addEventListener(
      "change", event => this.changeBlacklistType(event.target.value));
    document.querySelector("#blacklistmatching").addEventListener(
      "change", event => this.changeBlacklistMatching(event.target.value));
    document.querySelector("#contextmenu").addEventListener(
      "change", event => this.changeContextMenu(event.target.value));
    document.querySelector("#import").addEventListener(
      "click", () => this.importBlacklist() );
    document.querySelector("#export").addEventListener(
      "click", () => this.exportBlacklist() );
  }

  /**
   * Fired when a message is received from another extension or background 
   * script.
   *
   * @param {string} message
   *        The message.
   * @return {Promise} promise
   *         A Promise that will be fulfilled when the message has been 
   *         handled.
   */
  async onMessage(message) {
    switch(message.action) {
      case "blacklistUpdated":
        return this.renderBlacklist();
    }
  }

  /**
   * Sends a message to have HistoryBlock clear the blacklist.
   * 
   * @return {Promise} promise
   *         A Promise that will be fulfilled after the blacklist has been 
   *         cleared.
   */
  async resetBlacklist() {
    if(confirm(browser.i18n.getMessage('resetBlacklist'))) {
      await browser.runtime.sendMessage({action: 'clearBlacklist'});
      await this.renderBlacklist();
    }
  }

  /**
   * Sends a message to have HistoryBlock add the given URLs to the blacklist.
   *
   * @return {Promise} promise
   *         A Promise that will be fulfilled after the input has been added to
   *         the blacklist.
   */
  async addToBlacklist() {
    let input = prompt(browser.i18n.getMessage('addUrl'));
    if(input) {
      let urls = input.split(',');

      for(let i = 0; i < urls.length; i++) {
        await browser.runtime.sendMessage({action: 'addToBlacklist', url: urls[i]});
      }

      await this.renderBlacklist();
    }
  }

  /**
   * Sends a message to have HistoryBlock import the given blacklist.
   * 
   * @return {Promise} blacklist
   *         A Promise that will be fulfilled after the input has been added to
   *         the blacklist.
   */
  async importBlacklist() {
    let blacklist = prompt(browser.i18n.getMessage('importBlacklist'));

    if(blacklist) {
      await browser.runtime.sendMessage({action: 'importBlacklist', blacklist: blacklist});
    }
  }

  /**
   * Exports the current blacklist to the clipboard.
   * 
   * @return {Promise} promise
   *         A Promise that will be fulfilled after the blacklist has been 
   *         exported.
   */
  async exportBlacklist() {
    let storage = await browser.storage.sync.get();
    
    if(storage.blacklist && storage.blacklist.length > 0) {
      let blacklistString = storage.blacklist.join(',');
      
      try {
        await navigator.clipboard.writeText(blacklistString);
        alert('Blacklist exported to clipboard!');
      } catch (err) {
        // Fallback for browsers that don't support clipboard API
        let textArea = document.createElement('textarea');
        textArea.value = blacklistString;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Blacklist copied to clipboard!');
      }
    } else {
      alert('Blacklist is empty!');
    }
  }

  /**
   * Sends a message to have HistoryBlock remove the given URLs from the blacklist.
   *
   * @return {Promise} promise
   *         A Promise that will be fulfilled after the input has been removed
   *         from the blacklist.
   */
  async removeFromBlacklist() {
    let input = prompt(browser.i18n.getMessage('removeUrl'));
    if(input) {
      let urls = input.split(',');

      for(let i = 0; i < urls.length; i++) {
        await browser.runtime.sendMessage({action: 'removeFromBlacklist', url: urls[i]});
      }

      await this.renderBlacklist();
    }
  }

  /**
   * Sends a message to have HistoryBlock change the blacklist encryption type.
   *
   * @param {string} blacklistType
   *        The type of encryption to use on blacklist entries.
   * @return {Promise} promise
   *         A Promise that will be fulfilled after the blacklist encryption 
   *         type has been changed.
   */
  async changeBlacklistType(blacklistType) {
    if(blacklistType === 'none' && 
        confirm(browser.i18n.getMessage('changeBlacklistTypeNone')) ||
       blacklistType === 'sha1' && 
        confirm(browser.i18n.getMessage('changeBlacklistTypeSHA1'))) {
      await browser.runtime.sendMessage({action: 'changeBlacklistType', type: blacklistType});
    }
    
    await this.renderBlacklistType();
  }

  /**
   * Sends a message to have HistoryBlock change the matching technique.
   *
   * @param {string} matching
   *        The technique of matching to use on URLs.
   * @return {Promise} promise
   *         A Promise that will be fulfilled after the blacklist URL matching
   *         technique has been changed.
   */
  async changeBlacklistMatching(matching) {
    if(matching === 'domain' && 
        confirm(browser.i18n.getMessage('changeMatchingToDomain')) ||
       matching === 'subdomain' && 
        confirm(browser.i18n.getMessage('changeMatchingToSubdomain')) ||
       matching === 'url' && 
        confirm(browser.i18n.getMessage('changeMatchingToURL'))) {
      await browser.runtime.sendMessage({action: 'changeBlacklistMatching', matching: matching});
    }
      
    await this.renderBlacklistMatching();
  }

  /**
   * Sends a message to have HistoryBlock change the context menu setting.
   *
   * @param {string} contextMenuSetting
   *        The context menu setting ('enabled' or 'disabled').
   * @return {Promise} promise
   *         A Promise that will be fulfilled after the context menu setting
   *         has been changed.
   */
  async changeContextMenu(contextMenuSetting) {
    await browser.runtime.sendMessage({action: 'changeContextMenu', contextMenu: contextMenuSetting});
    await this.renderContextMenu();
  }

  /**
   * Renders the blacklist encryption type controls.
   *
   * @return {Promise} promise
   *         A Promise that will be fulfilled after the blacklist encryption
   *         type elements have been rendered.
   */
  async renderBlacklistType() {
    let storage = await browser.storage.sync.get();

    if(typeof storage.type !== 'string') {
      storage.type = 'sha1';
    }

    if(storage.type === 'none') {
      document.querySelector("#import").style.visibility = 'visible';
      document.querySelector("#export").style.visibility = 'visible';
    }
    else if(storage.type === 'sha1') {
      document.querySelector("#import").style.visibility = 'visible';
      document.querySelector("#export").style.visibility = 'visible';
    }

    let radios = document.querySelectorAll('#blacklisttype input');

    for(let i=0; i<radios.length; i++) {
      let radio = radios[i];
      if(radio.value === storage.type) {
        radio.checked = true;
      }
    }
  }

  /**
   * Renders the blacklist matching technique controls.
   *
   * @return {Promise} promise
   *         A Promise that will be fulfilled after the blacklist URL matching
   *         technique elements have been rendered.
   */
  async renderBlacklistMatching() {
    let storage = await browser.storage.sync.get();

    if(typeof storage.matching !== 'string') {
      storage.matching = 'domain';
    }

    let radios = document.querySelectorAll('#blacklistmatching input');

    for(let i=0; i<radios.length; i++) {
      let radio = radios[i];
      if(radio.value === storage.matching) {
        radio.checked = true;
      }
    }
  }

  /**
   * Renders the context menu controls.
   *
   * @return {Promise} promise
   *         A Promise that will be fulfilled after the context menu elements
   *         have been rendered.
   */
  async renderContextMenu() {
    let storage = await browser.storage.sync.get();

    if(typeof storage.contextMenu !== 'string') {
      storage.contextMenu = 'enabled';
    }

    let radios = document.querySelectorAll('#contextmenu input');

    for(let i=0; i<radios.length; i++) {
      let radio = radios[i];
      if(radio.value === storage.contextMenu) {
        radio.checked = true;
      }
    }
  }

  /**
   * Renders the blacklist.
   *
   * @return {Promise} promise
   *         A Promise that will be fulfilled after the blacklist has been 
   *         rendered.
   */
  async renderBlacklist() {
    let storage = await browser.storage.sync.get();

    if(storage.blacklist) {
      let el = document.querySelector("#blacklist");
      el.innerHTML = null;
      storage.blacklist.forEach( (hash) => {
        let li = document.createElement('li');
        li.innerHTML = hash;
        el.appendChild(li);
      });
    }
  }
}

new Options();
