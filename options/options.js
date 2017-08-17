class Options {
  constructor() {
    this.createFunctionBindings();
    this.attachDOMListeners();
    this.attachWebExtensionListeners();
    this.renderBlacklistTypeControls();
    this.renderBlacklistMatchingControls();
    this.renderBlacklistCookieControls();
    this.renderContextMenuControls();
    this.renderBlacklist();
  }

  /**
   * Creates boundFunctions out of all the event listener functions
   * so that the `this` variable always refers to the Options object.
   */
  createFunctionBindings() {
    this.onMessage = this.onMessage.bind(this);
    this.resetBlacklist = this.resetBlacklist.bind(this);
    this.addToBlacklist = this.addToBlacklist.bind(this);
    this.removeFromBlacklist = this.removeFromBlacklist.bind(this);
    this.changeBlacklistType = this.changeBlacklistType.bind(this);
    this.changeBlacklistMatching = this.changeBlacklistMatching.bind(this);
    this.changeCookies = this.changeCookies.bind(this);
    this.importBlacklist = this.importBlacklist.bind(this);
    this.changeContextMenu = this.changeContextMenu.bind(this);
  }

  /**
   * Attaches the event listeners to the WebExtension components.
   */
  attachWebExtensionListeners() {
    browser.runtime.onMessage.addListener(this.onMessage);
  }

  /**
   * Attaches the event listeners to the DOM.
   */
  attachDOMListeners() {
    document.querySelector("#resetBlacklist")
      .addEventListener("click", this.resetBlacklist);
    document.querySelector("#addToBlacklist")
      .addEventListener("click", this.addToBlacklist);
    document.querySelector("#removeFromBlacklist")
      .addEventListener("click", this.removeFromBlacklist);
    document.querySelectorAll("#blacklisttype > li > input[type='radio']").forEach(radio => {
      radio.addEventListener("click", this.changeBlacklistType);
    });
    document.querySelectorAll("#blacklistmatching > li > input[type='radio']").forEach(radio => {
      radio.addEventListener("click", this.changeBlacklistMatching);
    });
    document.querySelector("#cookies")
      .addEventListener("click", this.changeCookies);
    document.querySelector("#contextmenu")
      .addEventListener("change", this.changeContextMenu)
    document.querySelector("#import")
      .addEventListener("click", this.importBlacklist);
  }

  /**
   * Fired when a message is received from another extension or background 
   * script.
   *
   * @param {string} message
   *        The message.
   * @return {Promise}
   *         A Promise that will be fulfilled when the message has been 
   *         handled.
   */
  async onMessage(message) {
    switch (message.action) {
      case ACTION.BLACKLIST_UPDATED:
        return this.renderBlacklist();
    }
  }

  /**
   * Sends a message to have HistoryBlock clear the blacklist.
   * 
   * @return {Promise}
   *         A Promise that will be fulfilled after the blacklist has been 
   *         cleared.
   */
  async resetBlacklist() {
    if (confirm(browser.i18n.getMessage(i18n.RESET_BLACKLIST_CONFIRM_TEXT))) {
      await browser.runtime.sendMessage({ action: ACTION.CLEAR_BLACKLIST });
      await this.renderBlacklist();
    }
  }

  /**
   * Sends a message to have HistoryBlock add the given URLs to the blacklist.
   *
   * @return {Promise}
   *         A Promise that will be fulfilled after the input has been added to
   *         the blacklist.
   */
  async addToBlacklist() {
    let input = prompt(browser.i18n.getMessage(i18n.ADD_URL_PROMPT_TEXT));
    if (input) {
      let urls = input.split(',');

      for (let i = 0; i < urls.length; i++) {
        await browser.runtime.sendMessage({ action: ACTION.ADD_TO_BLACKLIST, url: urls[i] });
      }

      await this.renderBlacklist();
    }
  }

  /**
   * Sends a message to have HistoryBlock import the given blacklist.
   * 
   * @return {Promise}
   *         A Promise that will be fulfilled after the input has been added to
   *         the blacklist.
   */
  async importBlacklist() {
    let blacklist = prompt(browser.i18n.getMessage(i18n.IMPORT_BLACKLIST_PROMPT_TEXT));

    if (blacklist) {
      await browser.runtime.sendMessage({ action: ACTION.IMPORT_BLACKLIST, blacklist: blacklist });
    }
  }

  /**
   * Sends a message to have HistoryBlock remove the given URLs from the blacklist.
   *
   * @return {Promise}
   *         A Promise that will be fulfilled after the input has been removed
   *         from the blacklist.
   */
  async removeFromBlacklist() {
    let input = prompt(browser.i18n.getMessage(i18n.REMOVE_URL_PROMPT_TEXT));
    if (input) {
      let urls = input.split(',');

      for (let i = 0; i < urls.length; i++) {
        await browser.runtime.sendMessage({ action: ACTION.REMOVE_FROM_BLACKLIST, url: urls[i] });
      }

      await this.renderBlacklist();
    }
  }

  /**
   * Sends a message to have HistoryBlock change the blacklist encryption type.
   *
   * @param {object} event
   *        The event fired.
   * @return {Promise}
   *         A Promise that will be fulfilled after the blacklist encryption 
   *         type has been changed.
   */
  async changeBlacklistType(event) {
    let blacklistType = event.target.value;
    if ((blacklistType === 'none' &&
      confirm(browser.i18n.getMessage(i18n.CHANGE_BLACKLIST_TYPE_NONE_CONFIRM_TEXT))) ||
      (blacklistType === 'sha1' &&
        confirm(browser.i18n.getMessage(i18n.CHANGE_BLACKLIST_TYPE_SHA1_CONFIRM_TEXT)))) {
      await browser.runtime.sendMessage({ action: ACTION.CHANGE_BLACKLIST_ENCRYPTION_TYPE, type: blacklistType });
      return true;
    }

    event.preventDefault();
    return false;
  }

  /**
   * Sends a message to have HistoryBlock change the matching technique.
   *
   * @param {object} event
   *        The event that was fired.
   * @return {Promise}
   *         A Promise that will be fulfilled after the blacklist URL matching
   *         technique has been changed.
   */
  async changeBlacklistMatching(event) {
    let matching = event.target.value;
    if ((matching === 'domain' &&
      confirm(browser.i18n.getMessage(i18n.CHANGE_BLACKLIST_MATCHING_DOMAIN_CONFIRM_TEXT))) ||
      (matching === 'subdomain' &&
        confirm(browser.i18n.getMessage(i18n.CHANGE_BLACKLIST_MATCHING_SUBDOMAIN_CONFIRM_TEXT))) ||
      (matching === 'url' &&
        confirm(browser.i18n.getMessage(i18n.CHANGE_BLACKLIST_MATCHING_URL_CONFIRM_TEXT)))) {
      await browser.runtime.sendMessage({ action: ACTION.CHANGE_BLACKLIST_MATCHING, matching: matching });
      return true;
    }

    event.preventDefault();
    return false;
  }

  /**
   * Sends a message to have HistoryBlock change whether cookies are 
   * blacklisted.
   * 
   * @param {object} event 
   *        The event that was fired.
   */
  async changeCookies(event) {
    let blacklistCookies = event.target.checked;
    if (blacklistCookies && confirm(browser.i18n.getMessage(i18n.ENABLE_BLACKLIST_COOKIES_CONFIRM_TEXT))) {
      await browser.runtime.sendMessage({ action: ACTION.ENABLE_BLACKLIST_COOKIES });
    }
    else {
      await browser.runtime.sendMessage({ action: ACTION.DISABLE_BLACKLIST_COOKIES });
    }

    await this.renderBlacklistCookieControls();
  }

  /**
   * Sends a message to have HistoryBlock change whether the context menu 
   * controls are enabled.
   * 
   * @param {object} event
   *        The event that was fired.
   */
  async changeContextMenu(event) {
    let enabled = event.target.checked;
    await browser.runtime.sendMessage({
      action: ACTION.CHANGE_CONTEXT_MENU_CONTROLS,
      enabled: enabled
    });
  }

  /**
   * Renders the blacklist encryption type controls.
   *
   * @return {Promise}
   *         A Promise that will be fulfilled after the blacklist encryption
   *         type elements have been rendered.
   */
  async renderBlacklistTypeControls() {
    let storage = await browser.storage.sync.get();

    if (typeof storage.type !== 'string') {
      storage.type = 'sha1';
    }

    if (storage.type === 'none') {
      document.querySelector("#import").style.visibility = 'hidden';
    }
    else if (storage.type === 'sha1') {
      document.querySelector("#import").style.visibility = 'visible';
    }

    let radios = document.querySelectorAll('#blacklisttype input');

    for (let i = 0; i < radios.length; i++) {
      let radio = radios[i];
      if (radio.value === storage.type) {
        radio.checked = true;
      }
    }
  }

  /**
   * Renders the blacklist matching technique controls.
   *
   * @return {Promise}
   *         A Promise that will be fulfilled after the blacklist URL matching
   *         technique elements have been rendered.
   */
  async renderBlacklistMatchingControls() {
    let storage = await browser.storage.sync.get();

    if (typeof storage.matching !== 'string') {
      storage.matching = 'domain';
    }

    let radios = document.querySelectorAll('#blacklistmatching input');

    for (let i = 0; i < radios.length; i++) {
      let radio = radios[i];
      if (radio.value === storage.matching) {
        radio.checked = true;
      }
    }
  }

  /**
   * Renders the blacklist cookies option controls.
   * 
   * @return {Promise}
   *         A Promise that will be fulfilled after the blacklist cookies
   *         control elements have been rendered.
   */
  async renderBlacklistCookieControls() {
    let storage = await browser.storage.sync.get();

    if (typeof storage.blacklistCookies !== 'boolean') {
      storage.blacklistCookies = false;
    }

    document.querySelector("#cookies").checked = storage.blacklistCookies;
  }

  /**
   * Renders the blacklist context menu controls.
   * 
   * @return {Promise}
   *         A Promise that will be fulfilled after the blacklist context menu
   *         control elements have been rendered.
   */
  async renderContextMenuControls() {
    let storage = await browser.storage.sync.get();

    if (typeof storage.enableContextMenu !== 'boolean') {
      storage.enableContextMenu = true;
    }

    document.querySelector("#contextmenu").checked = storage.enableContextMenu;
  }

  /**
   * Renders the blacklist.
   *
   * @return {Promise}
   *         A Promise that will be fulfilled after the blacklist has been 
   *         rendered.
   */
  async renderBlacklist() {
    let storage = await browser.storage.sync.get();

    if (storage.blacklist) {
      let el = document.querySelector("#blacklist");
      el.innerHTML = null;
      storage.blacklist.forEach(hash => {
        let li = document.createElement('li');
        li.innerHTML = hash;
        el.appendChild(li);
      });
    }
  }
}

new Options();