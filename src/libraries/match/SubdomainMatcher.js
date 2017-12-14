class SubdomainMatcher extends Matcher {

  constructor() {
    super();
  }

  /**
   * Returns the subdomain name of the given URL.
   * Examples: 
   *   https://foo.bar.baz.google.com/ -> foo.bar.baz.google.com
   *   http://www.google.co.uk/ -> www.google.co.uk
   *
   * @param {string} url
   *        The url for which the subdomain name should be returned.
   */
  match(url) {
    let domain = url.match(this.hostRegexp);
    domain = domain[0].replace(domain[1], "");

    return domain;
  }
}