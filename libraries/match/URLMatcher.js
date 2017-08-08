class URLMatcher extends Matcher {

  /**
   * Returns the given URL.
   *
   * @param {string} url
   *        The url to return.
   */
  match(url) {
    let domain = url.substring(url.indexOf('//') + 2);

    return domain;
  }
}