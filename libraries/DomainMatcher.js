class DomainMatcher extends Matcher {

  /**
   * Returns the domain name of the given URL.
   * Examples: 
   *   https://foo.bar.baz.google.com/ -> google.com
   *   http://www.google.co.uk/ -> google.co.uk
   *   http://localhost:3000 -> localhost
   *   http://127.0.0.1 -> 127.0.0.1
   *
   * @param {string} url
   *        The url for which the domain name should be returned.
   */
  match(url) {
    let domain = url.match(hostRegexp);
    domain = domain[0].replace(domain[1],"");

    // Handle localhost and IP addresses
    if (this.isLocalhost(domain) || this.isIPAddress(domain)) {
      return this.extractHostname(domain);
    }

    // For public domains, use PSL parsing
    const parsed = psl.parse(domain);
    return parsed.domain;
  }

  /**
   * Checks if the domain is localhost or a localhost variant.
   *
   * @param {string} domain
   *        The domain to check.
   * @return {boolean}
   *         True if the domain is localhost.
   */
  isLocalhost(domain) {
    const hostname = this.extractHostname(domain);
    return hostname === 'localhost' || hostname.endsWith('.localhost');
  }

  /**
   * Checks if the domain is an IP address.
   *
   * @param {string} domain
   *        The domain to check.
   * @return {boolean}
   *         True if the domain is an IP address.
   */
  isIPAddress(domain) {
    const hostname = this.extractHostname(domain);
    // Check for IPv4 addresses (basic pattern)
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    // Check for IPv6 addresses (basic pattern)
    const ipv6Pattern = /^[0-9a-fA-F:]+$/;
    
    return ipv4Pattern.test(hostname) || ipv6Pattern.test(hostname);
  }

  /**
   * Extracts the hostname from a domain string (removes port).
   *
   * @param {string} domain
   *        The domain string.
   * @return {string}
   *         The hostname without port.
   */
  extractHostname(domain) {
    const colonIndex = domain.indexOf(':');
    if (colonIndex !== -1) {
      return domain.substring(0, colonIndex);
    }
    return domain;
  }
}
