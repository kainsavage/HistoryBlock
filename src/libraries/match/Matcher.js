/**
 * Matcher interface.
 */
class Matcher {
  constructor() {
    this.hostRegexp = /^(.*:\/\/)?[^\/]*/;
  }

  /**
   * Determines the portion of the given url that matches the rules for this
   * specific Matcher implementation.
   * 
   * @param  {string} url 
   *         The url to match
   * @return {string}
   *         The matching portion of the given url.
   */
  match(url) {
    throw new Error();
  }
}