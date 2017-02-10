/**
 * A pass-through hasher.
 */
class NoHash {
  constructor() {
    // Deliberately empty.
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