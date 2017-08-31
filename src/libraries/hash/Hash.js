/**
 * Hash interface.
 */
class Hash {

  /**
   * Tests whether the given string is a valid hash of this type.
   * 
   * @param  {string} str
   *         The string to test.
   * @return {boolean}
   *         Whether the given string is a valid hash of this type.
   */
  test(str) {
    throw new Error();
  }

  /**
   * Digests the given string into the hash of this type.
   * 
   * @param  {string} str 
   *         The string to digest.
   * @return {Promise}
   *         A Promise that is fulfilled when the given string has been
   *         digested.
   */
  async digest(str) {
    throw new Error();
  }
}