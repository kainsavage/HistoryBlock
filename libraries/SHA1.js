/**
 * The SHA1 library.
 */

class SHA1 {
	constructor() {
	}

  /**
   * Digests the given string into the hex-encoded SHA1 hash.
   */
  digest(str) {
    let buffer = new TextEncoder("utf-8").encode(str);

    return crypto.subtle.digest("SHA-1", buffer).then( (hash) => {
      return this.hex(hash);
    });
  }

  /**
   * Only to be used internally.
   */
  hex(buffer) {
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