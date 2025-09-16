class URLMatcher extends Matcher {

  /**
   * Returns the given URL without query parameters and anchors.
   *
   * @param {string} url
   *        The url to return.
   */
  match(url) {
    let protocolIndex = url.indexOf('//');
    let domain;
    
    if (protocolIndex !== -1) {
      domain = url.substring(protocolIndex + 2);
    } else {
      domain = url;
    }
    
    // Remove query parameters (?) and anchors (#)
    let queryIndex = domain.indexOf('?');
    let anchorIndex = domain.indexOf('#');
    
    // Find the earliest of query or anchor index
    let endIndex = domain.length;
    if (queryIndex !== -1) {
      endIndex = queryIndex;
    }
    if (anchorIndex !== -1 && anchorIndex < endIndex) {
      endIndex = anchorIndex;
    }
    
    return domain.substring(0, endIndex);
  }
}
