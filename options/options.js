class Options {
  constructor() {
    document.querySelector("#resetBlacklist").addEventListener("click", () => {
      if(confirm(browser.i18n.getMessage('resetBlacklist'))) {
        this.resetBlacklist().then(() => this.renderBlacklist());
      }
    });

    document.querySelector("#addToBlacklist").addEventListener("click", () => {
      let url = prompt(browser.i18n.getMessage('addUrl'));
      if(url) {
        this.addToBlacklist(url).then(() => this.renderBlacklist());
      }
    });

    document.querySelector("#removeFromBlacklist").addEventListener("click", () => {
      let url = prompt(browser.i18n.getMessage('removeUrl'));
      if(url) {
        this.removeFromBlacklist(url).then(() => this.renderBlacklist());
      }
    });

    document.querySelector("#blacklisttype").addEventListener("change", (event) => {
      let blacklistType = event.target.value;

      if(blacklistType === 'none' && 
          confirm(browser.i18n.getMessage('changeBlacklistTypeNone')) ||
         blacklistType === 'sha1' && 
          confirm(browser.i18n.getMessage('changeBlacklistTypeSHA1'))) {
        this.changeBlacklistType(blacklistType).then(() => this.renderBlacklistType());
      }
      else {
        this.renderBlacklistType();
      }
    });

    document.querySelector("#blacklistmatching").addEventListener("change", (event) => {
      let matching = event.target.value;

      if(matching === 'domain' && 
          confirm(browser.i18n.getMessage('changeMatchingToDomain')) ||
         matching === 'subdomain' && 
          confirm(browser.i18n.getMessage('changeMatchingToSubdomain')) ||
         matching === 'url' && 
          confirm(browser.i18n.getMessage('changeMatchingToURL'))) {
        this.changeBlacklistMatching(matching);
      }
      else {
        this.renderBlacklistMatching();
      }
    });

    document.querySelector("#import").addEventListener("click", () => {
      let blacklist = prompt(browser.i18n.getMessage('importBlacklist'));

      if(blacklist) {
        this.importBlacklist(blacklist);
      }
    });

    browser.runtime.onMessage.addListener( (message) => this.onMessage(message) );

    this.renderBlacklistType();
    this.renderBlacklistMatching();
    this.renderBlacklist();
  }

  /**
   * Fired when a message is received from another extension or background 
   * script.
   *
   * @param {string} message
   *        The message.
   */
  async onMessage(message) {
    switch(message.action) {
      case "blacklistUpdated":
        this.renderBlacklist();
        break;
    }
  }

  /**
   * Sends a message to have HistoryBlock clear the blacklist.
   */
  async resetBlacklist() {
    return browser.runtime.sendMessage({action: 'clearBlacklist'});
  }

  /**
   * Sends a message to have HistoryBlock add the given URLs to the blacklist.
   *
   * @param {string} input
   *        The list of comma-separated URLs to add to the blacklist.
   */
  async addToBlacklist(input) {
    let urls = input.split(',');

    for(let i = 0; i < urls.length; i++) {
      await browser.runtime.sendMessage({action: 'addToBlacklist', url: urls[i]});
    }
  }

  /**
   * Sends a message to have HistoryBlock import the given blacklist.
   */
  async importBlacklist(blacklist) {
    return browser.runtime.sendMessage({action: 'importBlacklist', blacklist: blacklist});
  }

  /**
   * Sends a message to have HistoryBlock remove the given URLs from the blacklist.
   *
   * @param {string} url
   *        The list of comma-separated URLs to remove from the blacklist.
   */
  async removeFromBlacklist(input) {
    let urls = input.split(',');

    for(let i = 0; i < urls.length; i++) {
      await browser.runtime.sendMessage({action: 'removeFromBlacklist', url: urls[i]});
    }
  }

  /**
   * Sends a message to have HistoryBlock change the blacklist encryption type.
   *
   * @param {string} type
   *        The type of encryption to use on blacklist entries.
   */
  async changeBlacklistType(type) {
    await browser.runtime.sendMessage({action: 'changeBlacklistType', type: type});
  }

  /**
   * Sends a message to have HistoryBlock change the matching technique.
   *
   * @param {string} matching
   *        The technique of matching to use on URLs.
   */
  async changeBlacklistMatching(matching) {
    await browser.runtime.sendMessage({action: 'changeBlacklistMatching', matching: matching});
  }

  /**
   * Renders the blacklist encryption type controls.
   */
  async renderBlacklistType() {
    let storage = await browser.storage.sync.get();

    if(typeof storage.type !== 'string') {
      storage.type = 'sha1';
    }

    if(storage.type === 'none') {
      document.querySelector("#import").style.visibility = 'hidden';
    }
    else if(storage.type === 'sha1') {
      document.querySelector("#import").style.visibility = 'visible';
    }

    let ul = document.querySelector('#blacklisttype');

    for(let i=0; i<ul.childElementCount; i++) {
      let radio = ul.children[i].children[0];
      if(radio.value === storage.type) {
        radio.checked = true;
      }
    }
  }

  /**
   * Renders the blacklist matching technique controls.
   */
  async renderBlacklistMatching() {
    let storage = await browser.storage.sync.get();

    if(typeof storage.matching !== 'string') {
      storage.matching = 'domain';
    }

    let ul = document.querySelector('#blacklistmatching');

    for(let i=0; i<ul.childElementCount; i++) {
      let radio = ul.children[i].children[0];
      if(radio.value === storage.matching) {
        radio.checked = true;
      }
    }
  }

  /**
   * Renders the blacklist.
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