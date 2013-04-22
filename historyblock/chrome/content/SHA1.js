/**
 * The SHA1 library.
 * 
 * This is automatically executed when included as a script,
 * so historyblock objects will all have referene to the SHA1 
 * public methods via:
 *
 * historyblock.SHA1.[some public method]
 */

historyblock.SHA1 = (function () {
    /**
    * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
    * in FIPS PUB 180-1
    * Version 2.1a Copyright Paul Johnston 2000 - 2002.
    * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
    * Distributed under the BSD License
    * See http://pajhome.org.uk/crypt/md5 for details.
    */
    var hexcase = 0,
    /* hex output format. 0 - lowercase; 1 - uppercase        */
    b64pad = "",
    /* base-64 pad character. "=" for strict RFC compliance   */
    chrsz = 8,
    /* bits per input character. 8 - ASCII; 16 - Unicode      */

    /**
    * Bitwise rotate a 32-bit number to the left.
    */
    rol = function (num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
    },

    /**
    * Add integers, wrapping at 2^32. This uses 16-bit operations internally
    * to work around bugs in some JS interpreters.
    */
    safe_add = function (x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF),
            msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    },

    /**
    * Perform the appropriate triplet combination for the current
    * iteration
    */
    sha1_ft = function (t, b, c, d) {
        if (t < 20) { return (b & c) | ((~b) & d); }
        if (t < 40) { return b ^ c ^ d; }
        if (t < 60) { return (b & c) | (b & d) | (c & d); }
        return b ^ c ^ d;
    },

    /**
    * Determine the appropriate additive constant for the current iteration
    */
    sha1_kt = function (t) {
        return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 : (t < 60) ? -1894007588 : -899497514;
    },

    /**
    * Convert an 8-bit or 16-bit string to an array of big-endian words
    * In 8-bit function, characters >255 have their hi-byte silently ignored.
    */
    str2binb = function (str) {
        var bin = [],
            mask = (1 << chrsz) - 1,
            i;

        for (i = 0; i < str.length * chrsz; i += chrsz) {
            bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (32 - chrsz - i % 32);
        }
        return bin;
    },

    /**
    * Convert an array of big-endian words to a string
    */
    binb2str = function (bin) {
        var str = "",
            mask = (1 << chrsz) - 1,
            i;
        for (i = 0; i < bin.length * 32; i += chrsz) {
            str += String.fromCharCode((bin[i >> 5] >>> (32 - chrsz - i % 32)) & mask);
        }
        return str;
    },

    /**
    * Convert an array of big-endian words to a hex string.
    */
    binb2hex = function (binarray) {
        var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef",
            str = "",
            i;
        for (i = 0; i < binarray.length * 4; i++) {
            str += hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) + hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8)) & 0xF);
        }
        return str;
    },

    /**
    * Convert an array of big-endian words to a base-64 string
    */
    binb2b64 = function (binarray) {
        var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
            str = "",
            i, j,
            triplet;
        for (i = 0; i < binarray.length * 4; i += 3) {
            triplet = (((binarray[i >> 2] >> 8 * (3 - i % 4)) & 0xFF) << 16) | (((binarray[i + 1 >> 2] >> 8 * (3 - (i + 1) % 4)) & 0xFF) << 8) | ((binarray[i + 2 >> 2] >> 8 * (3 - (i + 2) % 4)) & 0xFF);
            for (j = 0; j < 4; j++) {
                if (i * 8 + j * 6 > binarray.length * 32) {
                    str += b64pad;
                }
                else {
                    str += tab.charAt((triplet >> 6 * (3 - j)) & 0x3F);
                }
            }
        }
        return str;
    },

    /**
    * Calculate the SHA-1 of an array of big-endian words, and a bit length
    */
    core_sha1 = function (x, len) {
        var w = new Array(80),
        a = 1732584193,
        b = -271733879,
        c = -1732584194,
        d = 271733878,
        e = -1009589776,
        olda, oldb, oldc, oldd, olde,
        i, j, t;

        /* append padding */
        x[len >> 5] |= 0x80 << (24 - len % 32);
        x[((len + 64 >> 9) << 4) + 15] = len;

        for (i = 0; i < x.length; i += 16) {
            olda = a;
            oldb = b;
            oldc = c;
            oldd = d;
            olde = e;

            for (j = 0; j < 80; j++) {
                if (j < 16) { w[j] = x[i + j]; }
                else { w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1); }
                t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)), safe_add(safe_add(e, w[j]), sha1_kt(j)));
                e = d;
                d = c;
                c = rol(b, 30);
                b = a;
                a = t;
            }

            a = safe_add(a, olda);
            b = safe_add(b, oldb);
            c = safe_add(c, oldc);
            d = safe_add(d, oldd);
            e = safe_add(e, olde);
        }
        return [a, b, c, d, e];
    },

    /**
    * Calculate the HMAC-SHA1 of a key and some data
    */
    core_hmac_sha1 = function (key, data) {
        var bkey = str2binb(key),
            ipad = new Array(16),
            opad = new Array(16),
            i, hash;

        if (bkey.length > 16) {
            bkey = core_sha1(bkey, key.length * chrsz);
        }

        for (i = 0; i < 16; i++) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }

        hash = core_sha1(ipad.concat(str2binb(data)), 512 + data.length * chrsz);
        return core_sha1(opad.concat(hash), 512 + 160);
    };

    return {
        /**
        * These are the functions you'll usually want to call
        * They take string arguments and return either hex or base-64 encoded strings
        */
        hex_sha1: function (s) {
            return binb2hex(core_sha1(str2binb(s), s.length * chrsz));
        },
        b64_sha1: function (s) {
            return binb2b64(core_sha1(str2binb(s), s.length * chrsz));
        },
        str_sha1: function (s) {
            return binb2str(core_sha1(str2binb(s), s.length * chrsz));
        },
        hex_hmac_sha1: function (key, data) {
            return binb2hex(core_hmac_sha1(key, data));
        },
        b64_hmac_sha1: function (key, data) {
            return binb2b64(core_hmac_sha1(key, data));
        },
        str_hmac_sha1: function (key, data) {
            return binb2str(core_hmac_sha1(key, data));
        }
    };
} ());
// The () means that it's automatically executed. 