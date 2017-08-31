/**
 * Blacklist interface.
 */
class Blacklist {

  /**
   * Simple constructor.
   * 
   * @param {Hash} hash 
   *        The hash to use in order to test and digest.
   */
  constructor(hash) {
    this.hash = hash;
  }

  /**
   * Clears the blacklist.
   * 
   * @return {Promise}
   *         A Promise that is fulfilled when the blacklist has been cleared.
   */
  async clear() {
    throw new Error();
  }

  /**
   * Lists all entries in the blacklist.
   * 
   * @return {Promise}
   *         A Promise that is fulfilled with the list of all entries in the
   *         blacklist.
   */
  async list() {
    throw new Error();
  }

  /**
   * Imports all the entries in list into the blacklist.
   * 
   * @param {string[]} list 
   *        The list of entries to import into the blacklist.
   */
  async import(list) {
    throw new Error();
  }
}