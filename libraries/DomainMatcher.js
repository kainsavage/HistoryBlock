class DomainMatcher extends Matcher {

  /**
   * Returns the domain name of the given URL.
   * Examples: 
   *   https://foo.bar.baz.google.com/ -> google.com
   *   http://www.google.co.uk/ -> google.co.uk
   *
   * @param {string} url
   *        The url for which the domain name should be returned.
   */
  match(url) {
    let domain = url.match(hostRegexp);
    domain = domain[0].replace(domain[1], "");

    return psl.parse(domain).domain;
  }
}