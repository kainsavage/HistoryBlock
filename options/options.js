const resetBlacklist = 'Are you sure you want to delete the blacklist (this cannot be undone)?';
const addUrl = 'Enter the url or domain name to blacklist.';
const removeUrl = 'Enter the url or domain name to remove from the blacklist.';
const changeBlacklistTypeNone = 'Choosing "none" for encryption type means that anyone who can open this page can see your blacklist in plain text (not recommended). This action will clear your blacklist entirely; are you sure you want your blacklist to be unencrypted?';
const changeBlacklistTypeSHA1 = 'This action will clear your blacklist entirely; are you sure you want your blacklist to be encrypted using SHA1?';
const changeMatchingToDomain = 'This action will clear your blacklist entirely; are you sure you want your blacklist to be matched on domains?';
const changeMatchingToSubdomain = 'This action will clear your blacklist entirely; are you sure you want your blacklist to be matched on subdomains?';
const changeMatchingToURL = 'This action will clear your blacklist entirely; are you sure you want your blacklist to be matched on URLs?';

class Options {
  constructor() {
    document.querySelector("#resetBlacklist").addEventListener("click", () => {
      if(confirm(resetBlacklist)) {
        this.resetBlacklist().then(() => this.renderBlacklist());
      }
    });

    document.querySelector("#addToBlacklist").addEventListener("click", () => {
      let url = prompt(addUrl);
      if(url) {
        this.addToBlacklist(url).then(() => this.renderBlacklist());
      }
    });

    document.querySelector("#removeFromBlacklist").addEventListener("click", () => {
      let url = prompt(removeUrl);
      if(url) {
        this.removeFromBlacklist(url).then(() => this.renderBlacklist());
      }
    });

    document.querySelector("#blacklisttype").addEventListener("change", (event) => {
      let blacklistType = event.target.value;

      if(blacklistType === 'none' && confirm(changeBlacklistTypeNone) ||
         blacklistType === 'sha1' && confirm(changeBlacklistTypeSHA1)) {
        this.changeBlacklistType(blacklistType); 
      }
      else {
        this.renderBlacklistType();
      }
    });

    document.querySelector("#blacklistmatching").addEventListener("change", (event) => {
      let matching = event.target.value;

      if(matching === 'domain' && confirm(changeMatchingToDomain) ||
         matching === 'subdomain' && confirm(changeMatchingToSubdomain) ||
         matching === 'url' && confirm(changeMatchingToURL)) {
        this.changeBlacklistMatching(matching);
      }
      else {
        this.renderBlacklistMatching();
      }
    })

    browser.runtime.onMessage.addListener( (message) => this.onMessage(message) );

    this.renderBlacklistType();
    this.renderBlacklistMatching();
    this.renderBlacklist();
  }

  /**
   *
   */
  async onMessage(message) {
    switch(message.action) {
      case "blacklistUpdated":
        this.renderBlacklist();
        break;
    }
  }

  /**
   *
   */
  async resetBlacklist() {
    return browser.runtime.sendMessage({action: 'clearBlacklist'});
  }

  /**
   *
   */
  async addToBlacklist(url) {
    return browser.runtime.sendMessage({action: 'addToBlacklist', url: url});
  }

  /**
   *
   */
  async removeFromBlacklist(url) {
    return browser.runtime.sendMessage({action: 'removeFromBlacklist', url: url});
  }

  /**
   *
   */
  async changeBlacklistType(type) {
    await browser.runtime.sendMessage({action: 'changeBlacklistType', type: type});

    return this.resetBlacklist();
  }

  async changeBlacklistMatching(matching) {
    await browser.runtime.sendMessage({action: 'changeBlacklistMatching', matching: matching});

    return this.resetBlacklist();
  }

  /**
   *
   */
  async renderBlacklistType() {
    let storage = await browser.storage.sync.get();

    if(typeof storage.type !== 'string') {
      storage.type = 'sha1';
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
   *
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
   *
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