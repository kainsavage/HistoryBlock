const resetBlacklist = 'Are you sure you want to delete the blacklist (this cannot be undone)?';
const addUrl = 'Enter the url or domain name to blacklist.';

class Options {
  constructor() {
    document.querySelector("#resetBlacklist").addEventListener("click", () => {
      if(confirm(resetBlacklist)) this.resetBlacklist();
    });

    document.querySelector("#addToBlacklist").addEventListener("click", () => {
      let url = prompt(addUrl);
      if(url) {
        this.addToBlacklist(url);
      }
    });

    this.renderBlacklist();
  }

  /**
   *
   */
  async resetBlacklist() {
    let storage = await browser.storage.sync.get();
    console.log(storage);
    await browser.storage.sync.remove('blacklist');
    storage = await browser.storage.sync.get();
    console.log(storage);
  }

  /**
   *
   */
  async renderBlacklist() {
    let storage = await browser.storage.sync.get();

    if(storage.blacklist) {
      let el = document.querySelector("#blacklist");
      storage.blacklist.forEach( (hash) => {
        let li = document.createElement('li');
        li.innerHTML = hash;
        el.appendChild(li);
      });
    }
  }

  /**
   *
   */
  async addToBlacklist(url) {
    browser.runtime.sendMessage({action: 'addToBlacklist', url: url});
  }
}

new Options();