/**
 * A pass-through hasher.
 */
class NoHash {

  /**
   * Returns true - all strings satisfy NoHash's test.
   *
   * @return {boolean} true
   *         True
   */
  test(str) {
    return true;
  }

  /**
   * Digests the given string into the exact same string.
   *
   * @param {string} str
   *        The string to be digested.
   */
  async digest(str) {
    return str;
  }
}