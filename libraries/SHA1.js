/**
 * A lightweight SHA1 library built on top of the browser's crypto object.
 */
class SHA1 {
	constructor() {
    // Deliberately empty.
	}

  /**
   * Digests the given string into the hex-encoded SHA1 hash.
   *
   * @param {string} str
   *        The string to be digested.
   */
  async digest(str) {
    let encoded = new TextEncoder("utf-8").encode(str);

    let buffer = await crypto.subtle.digest("SHA-1", encoded);

    let hexCodes = [];
    let view = new DataView(buffer);
    for (let i = 0; i < view.byteLength; i += 4) {
      // Using getUint32 reduces the number of iterations needed (we process 4 bytes each time)
      let value = view.getUint32(i)
      // toString(16) will give the hex representation of the number without padding
      let stringValue = value.toString(16)
      // We use concatenation and slice for padding
      let padding = '00000000'
      let paddedValue = (padding + stringValue).slice(-padding.length)
      hexCodes.push(paddedValue);
    }

    // Join all the hex strings into one
    return hexCodes.join("");
  }
}