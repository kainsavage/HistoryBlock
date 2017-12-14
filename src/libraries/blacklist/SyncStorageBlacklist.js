/**
 * SyncStorageBlacklist is an implementation accessing a list of hashed 
 * URLs. Specifically, this list is storage in the browser implementation's
 * sync storage.
 */
class SyncStorageBlacklist extends Blacklist {

  /**
   * Simple Constructor.
   * 
   * @param {Hash} hash
   *        The hash to use in order to test and digest.
   */
  constructor(hash) {
    super(hash);
  }

  /**
   * Empties out the blacklist.
   *
   * @return {Promise}
   *         A Promise that is fulfilled after the blacklist has been cleared.
   */
  async clear() {
    await browser.storage.sync.remove('blacklist');

    // Re-initializes the object.
    await this.list();

    // Purposefully do not wait for this Promise to be fulfilled.
    browser.runtime.sendMessage({ action: ACTION.BLACKLIST_UPDATED });
  }

  /**
   * Retrieves the blacklist from browser storage.
   *
   * @return {Promise}
   *         A Promise that is fulfilled with the value of the blacklist.
   */
  async list() {
    let storage = await browser.storage.sync.get();

    if (!storage.blacklist) {
      await browser.storage.sync.set({ blacklist: [] });

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
  async import(list) {
    if (list) {
      let blarr = list.split(',');
      let blacklist = await this.list();

      for (let i = 0; i < blarr.length; i++) {
        let hash = blarr[i].trim();
        if (!blacklist.includes(hash) && this.hash.test(hash)) {
          blacklist.push(hash);
        }
      }

      await browser.storage.sync.set({ blacklist: blacklist });

      // Purposefully do not wait for this Promise to be fulfilled.
      browser.runtime.sendMessage({ action: ACTION.BLACKLIST_UPDATED });
    }
  }
}