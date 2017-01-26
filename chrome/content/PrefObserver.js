// XPCOM shortcuts
const navHistoryService = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
const observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
const localprefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.historyblock.");

class PrefObserver {
  constructor(historyblock) {
    this.historyblock = historyblock;

    Components.utils.import("resource://gre/modules/Downloads.jsm");

    Downloads.getList(Downloads.ALL).then((downloads) => {
      downloads.addView(this);
    });
  }

  // Register this prefObserver as an observer against the localprefs interface.
  register() {
    navHistoryService.addObserver(this, false);
    observerService.addObserver(this, "dl-done", false);
    localprefs.QueryInterface(Ci.nsIPrefBranch2);
    localprefs.addObserver("", this, false);
  }

  // Unregister called at shutdown.
  unregister() {
    if (!localprefs) { return; }
    localprefs.removeObserver("", this);
  }

  onDownloadChanged(download) {
    if(download.succeeded) {
      let domain = this.historyblock.getDomainName(download.source.url);

      // Hash that hostname
      this.historyblock.hash.digest(domain).then(hash => {
        if(this.historyblock.domainstring.includes(hash)) {
          Downloads.getList(Downloads.ALL).then( downloads => {
            this.historyblock.removeHistory(domain);
          });
        }
      });
    }
  }

  /**
  * This is used to observe when the prefs get changed.
  */
  observe(subject, topic, state) {
    if (topic === "nsPref:changed") {
      if (state === "newblockedurl") {
        // Call the to handle the additional hostname
        this.historyblock.onHostnameAdd();
      } else if (state === "unblockedurl") {
        // Call the to handle the removed hostname
        this.historyblock.onHostnameRemove();
      } else if (state === "stringpref") {
        // For testing purposes only, really. If the user changes "about:config" for this pref, then
        // we need to update our loaded copy.
        this.historyblock.domainstring = prefs.getCharPref("extensions.historyblock.stringpref");
      }
    }
  }
}