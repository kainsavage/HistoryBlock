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
    // Since this is a superclass implementation, we always return false as we
    // want no one to actually use this implementation and instead override.
    return false;
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
    // Since this is a superclass implementation, we always return null as we
    // want no one to actually use this implementation and instead override.
    return null;
  }
}