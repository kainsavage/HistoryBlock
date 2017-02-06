// XPCOM shortcuts
const Cc = Components.classes;
const Ci = Components.interfaces;

const STATE_STOP = Ci.nsIWebProgressListener.STATE_STOP;

const hostRegexp = /^(.*:\/\/)?[^\/]*/;

const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
const historyManager = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsIBrowserHistory);
const sessionStore = Cc["@mozilla.org/browser/sessionstore;1"].getService(Ci.nsISessionStore);

/**
 * The HistoryBlock class.
 *
 * This is the "object" which is instantiated by overlay.js
 * when the extension is installed.
 */
class HistoryBlock {
  constructor() {
    if (!this.hasInitialized) {
      this.hasInitialized = false;
      this.hasShutdown = false;

      this.hash = new SHA1();
      this.prefObserver = new PrefObserver(this);

      this.domainstring = prefs.getCharPref("extensions.historyblock.stringpref");

      // This actually cannot be done until HB is a web extension, and that cannot be done until
      // the session store API is ported. The problem is that when this is fired, the context of
      // that window includes this HB instance, so using setTimeout, for example, fails the moment
      // the window is actually closed as it is 'deleted'.
      // Web extensions have the notion of a "background" script which is long-lived across many
      // windows, which would make this process trivial; however, there is nothing equivalent to
      // sessionStore yet implemented and `Components.classes` is hard-deprecated, so there is no
      // way to forget a closed tab (let alone a window) with the rewrite to be a web extension.
      //window.addEventListener("DOMWindowClose", event => this.windowClosed(event), false);

      gBrowser.tabContainer.addEventListener("TabClose", event => this.tabClosed(event), true);
      gBrowser.addTabsProgressListener({ onStateChange: 
        (aBrowser, aWebProgress, aRequest, aStateFlag, aStatus) => { 
          this.onStateChange(aBrowser, aWebProgress, aRequest, aStateFlag, aStatus); 
        } 
      });
      this.prefObserver.register();

      // Add the shutdown listener
      window.addEventListener("unload", () => { 
        this.shutdown(); 
      }, false);
      this.hasInitialized = true;
    }
  }

  /**
   * Helper function for returning the current domain name.
   * Examples: 
   *   https://foo.bar.baz.google.com/ -> google.com
   *   http://www.google.co.uk/ -> google.co.uk
   */
  getDomainName(url) {
    let domain = url || getBrowser().currentURI.spec;

    domain = domain.match(hostRegexp);
    domain = domain[0].replace(domain[1],"");

    return psl.parse(domain).domain;
  }

  /**
   * The bread-n-butter of  Every method in historyblock really calls removeHistory
   * OR calls some of the code inside of removeHistory directly for special cases
   * (this is basically just adding/removing hostnames and downloads).
   */
  removeHistory(domain) {
    this.hash.digest(domain).then(() => historyManager.removePagesFromHost(domain, true));
  }

  /**
   * Adds the given domain to the blacklist.
   */
  blacklistDomain(domain) {
    return this.hash.digest(domain).then( hash => {
      if(!this.domainstring.includes(hash)) {
        // Made it past the sentinel, we have a good hostname that isn't a repeat.
        // Add it to the local prefs
        if(this.domainstring.split(',').indexOf("") === -1) {
          this.domainstring += ",";
        }
        this.domainstring += hash;
        // Set the new prefs
        prefs.setCharPref("extensions.historyblock.stringpref", this.domainstring);
      }
    });
  }

  /**
   * Not actually listened for explicitly, but rather gets called when the observe
   * method finds adding a hostname applicable.
   */
  onHostnameAdd() {
    // Get the new blocked host
    let domain = this.getDomainName(prefs.getCharPref("extensions.historyblock.newblockedurl"));

    if(domain) {
      this.blacklistDomain(domain)
        .then(() => prefs.setCharPref("extensions.historyblock.newblockedurl", ""))
        .then(() => this.removeHistory(domain));
    }
  }

  /**
   * This is called whenever a hostname is entered with the remove checkbox true.
   */
  onHostnameRemove() {
    // Get the new blocked host
    let domain = this.getDomainName(prefs.getCharPref("extensions.historyblock.unblockedurl"));

    if(domain) {
      this.hash.digest(domain).then( hash => {
        if(this.domainstring.includes(hash)) {
          this.domainstring = this.domainstring.replace(',' + hash, "");
          this.domainstring = this.domainstring.replace(hash + ',', "");
          this.domainstring = this.domainstring.replace(hash, "");
          prefs.setCharPref("extensions.historyblock.stringpref", this.domainstring);
        }
        prefs.setCharPref("extensions.historyblock.unblockedurl", "");
      });
    }
  }

  /**
   * Gets called whenever a tab has closed.
   */
  tabClosed(event) {
    let domain = this.getDomainName(event.target.linkedBrowser.currentURI.spec);
    if(domain) {
      this.hash.digest(domain).then( hash => {
        if(this.domainstring.includes(hash)) {
          this.removeHistory(domain);

          if (event.target) {
            // I really don't like having to use a setTimeout here, but so far FF
            // does not give me any other option. What I really need is an event
            // that fires as the last step of a tab being closed. Unfortunately,
            // the best I can do is "RIGHT AS" the tab is closing but before it
            // has been actually closed. So, the tab is gone, but it has not yet
            // been added to the recentlyClosedTabs list... so I have to wait a
            // tiny amount of time while that updates, then tell FF to forget it.
            setTimeout(() => {
              // If there is a tab to be "forgotten", forget it!
              // Gecko2.0 hotness
              sessionStore.forgetClosedTab(window, event.target.tabIndex);
            }, 250);
          }
        }
      });
    }
  }

  /**
   * Gets called when the user clicks "Block This!" from the right-click menu.
   */
  onBlockThis() {
    let domain = this.getDomainName();

    if(domain) {
      if (confirm('Do you really want to block "' + domain + '"?')) {
        // set the temp variable that will fire the rest
        prefs.setCharPref("extensions.historyblock.newblockedurl", domain);
      }
    }
  }

  /**
   * Gets fired every time the state changes on ANY page on ANY tab in THIS window.
   */
  onStateChange(aBrowser, aWebProgress, aRequest, aStateFlag, aStatus) {
    if (aStateFlag & STATE_STOP) {
      // Only gets into this if statement when a page is completely done rendering.
      // Fires on HTML, XML, GIFs, etc.
      if (aStatus === 0) {
        let domain = this.getDomainName(aBrowser.currentURI.spec);

        if(domain) {
          this.hash.digest(domain).then( hash => {
            if(this.domainstring.includes(hash)) {
              this.removeHistory(domain);
            }
          });
        }
      }
    }
  }

  /**
   * Tear down
   */
  shutdown() {
    if (!this.hasShutdown) {
      gBrowser.tabContainer.removeEventListener("TabClose", 
        (event) => { 
          this.tabClosed(event); 
        }, 
        true);
      gBrowser.removeTabsProgressListener({ onStateChange: 
        (aBrowser, aWebProgress, aRequest, aStateFlag, aStatus) => { 
          this.onStateChange(aBrowser, aWebProgress, aRequest, aStateFlag, aStatus);
        }
      });
      this.prefObserver.unregister();

      // Remove the shut-down listener.
      window.removeEventListener("unload", () => { 
        this.shutdown(); 
      }, false);
      this.hasShutdown = true;
    }
  }
}