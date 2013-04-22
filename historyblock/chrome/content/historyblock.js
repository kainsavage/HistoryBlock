/**
 * The HistoryBlock class.
 *
 * This is the "object" which is instantiated by overlay.js
 * when the extension is installed.
 */
var historyblock = (function () {
    'use strict';
    // -------------------------------------------- //
    //               Private variables              //
    // -------------------------------------------- //
    var hasInitialized = false,
        hasShutdown = false,

        // XPCOM shortcuts
        Cc = Components.classes,
        Ci = Components.interfaces,

        STATE_STOP = Ci.nsIWebProgressListener.STATE_STOP,

        whiteSpace = /\s/,

        // Special thanks to Viktar Karpach for this bit of regular expressions.
        slashesRegexp = /(^([^:]*:\/\/)?)/,
        hostRegexp = /^([^:]*:\/\/)?[^\/]*/,
        blockCookies = null,

        downloadManager = Cc["@mozilla.org/download-manager;1"].createInstance(Ci.nsIDownloadManager),
        navHistoryService = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService),
        prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch),
        domainstring = prefs.getCharPref("extensions.historyblock.stringpref"),
        localprefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.historyblock."),
        historyManager = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsIBrowserHistory),
        observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService),
        cookieManager = Cc["@mozilla.org/cookiemanager;1"].getService(Ci.nsICookieManager2),
        sessionStore = Cc["@mozilla.org/browser/sessionstore;1"].getService(Ci.nsISessionStore),

        // Used for state on the set timeout
        curWindow,
        tabIndex,

        // -------------------------------------------- //
        //                Private methods               //
        // -------------------------------------------- //

        /**
        * A conveniece method for creating an nsIURI object.
        * aOriginCharset may be null
        * aBaseUri may be null
        */
        makeURI = function (aURL, aOriginCharset, aBaseURI) {
            var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
            if (aURL.indexOf("://") === -1) {
                // No protocol, this will error; assume http
                aURL = "http://" + aURL + "/";
            }
            return ioService.newURI(aURL, aOriginCharset, aBaseURI);
        },

        /**
        * Wrapper for a timeout effect; largely I just need to be able to capture state
        * from within a setTimeout call. This does this "neatly".
        */
        forgetClosedTab = function () {
            // If there is a tab to be "forgotten", forget it!
            // Gecko2.0 hotness
            sessionStore.forgetClosedTab(window, tabIndex);
        },

        /**
        * The bread-n-butter of  Every method in historyblock really calls removeHistory
        * OR calls some of the code inside of removeHistory directly for special cases
        * (this is basically just adding/removing hostnames and downloads).
        *
        * hostname - nsIURI representation of the hostname
        *
        * tab - If present, this tab will attempted to be removed from the recently closed
        *       tabs menu, and the history will NOT be wiped. If NULL, then history will be
        *       wiped for subdomains.
        */
        removeHistory = function (hostname, tab) {
            var subdomains = hostname.spec.match(hostRegexp)[0].replace(slashesRegexp, ""),
                domains = domainstring.split(","),
                hashedTargetUrl = historyblock.SHA1.hex_sha1(subdomains),
                blIndex;

            // Walk our blacklisted domains
            for (blIndex = 0; blIndex < domains.length; blIndex++) {
                // If the hashed URL of the closed tab contains a hashed blacklisted hostname...
                if (hashedTargetUrl === domains[blIndex].replace(whiteSpace, "")) {
                    historyManager.removePagesFromHost(subdomains, true);
                    if (tab !== undefined) {
                        // Set state
                        curWindow = window;
                        tabIndex = tab.tabIndex;
                        // I really don't like having to use a setTimeout here, but so far FF
                        // does not give me any other option. What I really need is an event
                        // that fires as the last step of a tab being closed. Unfortunately,
                        // the best I can do is "RIGHT AS" the tab is closing but before it
                        // has been actually closed. So, the tab is gone, but it has not yet
                        // been added to the recentlyClosedTabs list... so I have to wait a
                        // tiny amount of time while that updates, then tell FF to forget it.
                        setTimeout(forgetClosedTab, 50);
                    }
                    // Hash the newBlockedHost for privacy's sake.
                    return hashedTargetUrl;
                }
            }
            // If we made it here, then the subdomain didn't fit, try the whole damned domain
            if (subdomains.split(".").length > 2) {
                subdomains = subdomains.split(".");
                subdomains = subdomains[subdomains.length - 2] + "." + subdomains[subdomains.length - 1];
                hashedTargetUrl = historyblock.SHA1.hex_sha1(subdomains);
                // Walk our blacklisted domains
                for (blIndex = 0; blIndex < domains.length; blIndex++) {
                    // If the hashed URL of the closed tab contains a hashed blacklisted hostname...
                    if (hashedTargetUrl === domains[blIndex].replace(whiteSpace, "")) {
                        historyManager.removePagesFromHost(subdomains, true);
                        if (tab !== undefined) {
                            // Set state
                            curWindow = window;
                            tabIndex = tab.tabIndex;
                            // I really don't like having to use a setTimeout here, but so far FF
                            // does not give me any other option. What I really need is an event
                            // that fires as the last step of a tab being closed. Unfortunately,
                            // the best I can do is "RIGHT AS" the tab is closing but before it
                            // has been actually closed. So, the tab is gone, but it has not yet
                            // been added to the recentlyClosedTabs list... so I have to wait a
                            // tiny amount of time while that updates, then tell FF to forget it.
                            setTimeout(forgetClosedTab, 50);
                        }
                        // Hash the newBlockedHost for privacy's sake.
                        return hashedTargetUrl;
                    }
                }
            }

            return hashedTargetUrl;
        },

        /**
        * Not actually listened for explicitly, but rather gets called when the observe
        * method finds adding a hostname applicable.
        */
        onHostnameAdd = function () {
            // Get the new blocked host
            var newBlockedHost = prefs.getCharPref("extensions.historyblock.newblockedurl").match(hostRegexp)[0].replace(slashesRegexp, ""),
            // Create a URI which represents the newBlockedHost
                newUri = makeURI(newBlockedHost, null, null),
                domains = domainstring.split(","),
                i;

            // Block it and get the newBlockedHost as a hash
            newBlockedHost = removeHistory(newUri);

            for (i = 0; i < domains.length; i++) {
                if (domainstring.indexOf(newBlockedHost) !== -1) {
                    // Attempt was made to add a previously-added domain... ignore and succeed.
                    prefs.setCharPref("extensions.historyblock.newblockedurl", "");
                    return;
                }
            }
            // Made it past the sentinel, we have a good hostname that isn't a repeat.
            // Add it to the local prefs
            domainstring += (", " + newBlockedHost);
            domainstring = domainstring.replace(",,", ",");
            domainstring = domainstring.replace(", ,", ",");
            if (domainstring.length >= 2) {
                if (domainstring.substring(0, 2) === ' ,') {
                    domainstring = domainstring.substring(1, domainstring.length);
                }
                if (domainstring.substring(0, 1) === ',') {
                    domainstring = domainstring.substring(1, domainstring.length);
                }
                if (domainstring.substring(domainstring.length - 2, domainstring.length) === ', ') {
                    domainstring = domainstring.substring(0, domainstring.length - 2);
                }
            }
            // Set the new prefs
            prefs.setCharPref("extensions.historyblock.stringpref", domainstring);
            // Set the newblockedurl to null
            prefs.setCharPref("extensions.historyblock.newblockedurl", "");
        },

        /**
        * This is called whenever a hostname is entered with the remove checkbox true.
        */
        onHostnameRemove = function () {
            // Get the new blocked host
            var unBlockedHost = prefs.getCharPref("extensions.historyblock.unblockedurl").match(hostRegexp)[0].replace(slashesRegexp, ""),
                // Create a URI which represents the newBlockedHost
                newUri = makeURI(unBlockedHost, null, null);

            // Don't ask me why this works...
            unBlockedHost = removeHistory(newUri);

            if (domainstring.indexOf(unBlockedHost) !== -1) {
                domainstring = domainstring.replace(unBlockedHost, "");
                domainstring = domainstring.replace(", ,", ",");
                if (domainstring.substring(0, 2) === ", " && domainstring.length > 2) {
                    domainstring = domainstring.substring(2, domainstring.length);
                } else if (domainstring.substring(0, 1) === "," && domainstring.length === 2) {
                    domainstring = "";
                } else if (domainstring.length > 2 && domainstring.substring(domainstring.length - 2, domainstring.length) === ", ") {
                    domainstring = domainstring.substring(0, domainstring.length - 2);
                }
                prefs.setCharPref("extensions.historyblock.stringpref", domainstring);
                prefs.setCharPref("extensions.historyblock.unblockedurl", "");
                return;
            }
            // We always want this to happen no matter what
            prefs.setCharPref("extensions.historyblock.unblockedurl", "");
        },

        prefObserver = {
            // These are only placeholder listeners, errors get thrown if these don't exist.
            // Apparently required by the mozilla addons folks...
            onVisit: function (aURI, aVisitID, aTime, aSessionID, aReferringID, aTransitionType) { },
            onBeforeDeleteURI: function (aURI, aGUID) { return 0; },
            onBeginUpdateBatch: function () { return 0; },
            onClearHistory: function () { return 0; },
            onDeleteURI: function (aURI) { return 0; },
            onDeleteVisits: function (aURI, aVisitTime, aGUID) { return 0; },
            onEndUpdateBatch: function () { return 0; },
            onPageChanged: function (aURI, aWhat, aValue) { return 0; },
            onPageExpired: function (aURI, aVisitTime, aWholeEntry) { return 0; },
            onTitleChanged: function (aURI, aPageTitle) { return 0; },
            onLocationChange: function (aBrowser, webProgress, request, location) { },
            onProgressChange: function (aBrowser, webProgress, request, curSelfProgress, maxSelfProgress, curTotalProgress, maxTotalProgress) { },
            onSecurityChange: function (aBrowser, aWebProgress, aRequest, aState) { },
            onStatusChange: function (aBrowser, aWebProgress, aRequest, aStatus, aMessage) { },
            onRefreshAttempted: function (aBrowser, webProgress, aRefreshURI, aMillis, aSameURI) { return true; },
            onLinkIconAvailable: function (aBrowser) { },

            // Register this prefObserver as an observer against the localprefs interface.
            register: function () {
                navHistoryService.addObserver(this, false);
                observerService.addObserver(this, "dl-done", false);
                localprefs.QueryInterface(Ci.nsIPrefBranch2);
                localprefs.addObserver("", this, false);
            },

            // Unregister called at shutdown.
            unregister: function () {
                if (!localprefs) { return; }
                localprefs.removeObserver("", this);
            },

            /**
            * This is used to observe when the prefs get changed.
            */
            observe: function (subject, topic, state) {
                if (topic === "nsPref:changed") {
                    if (state === "newblockedurl") {
                        // Call the to handle the additional hostname
                        onHostnameAdd();
                    } else if (state === "unblockedurl") {
                        // Call the to handle the removed hostname
                        onHostnameRemove();
                    } else if (state === "stringpref") {
                        // For testing purposes only, really. If the user changes "about:config" for this pref, then
                        // we need to update our loaded copy.
                        domainstring = prefs.getCharPref("extensions.historyblock.stringpref");
                    } else if (state === "blockcookies") {
                        // For testing purposes only, really. If the user changes "about:config" for this pref, then
                        // we need to update our loaded copy.
                        blockCookies = prefs.getBoolPref("extensions.historyblock.blockcookies");
                    }
                } else if (topic === "dl-done") {
                    var oDownload = subject.QueryInterface(Ci.nsIDownload),
                        domains = domainstring.split(","),
                        url = oDownload.source.spec,
                        hashedTargetUrl = url.match(hostRegexp),
                        hostname = hashedTargetUrl[0].replace(slashesRegexp, ""),
                        subdomains,
                        blIndex;

                    // Hash that hostname
                    hashedTargetUrl = historyblock.SHA1.hex_sha1(hostname);

                    for (blIndex = 0; blIndex < domains.length; blIndex++) {
                        if (hashedTargetUrl === domains[blIndex].replace(whiteSpace, "")) {
                            downloadManager.removeDownload(oDownload.id);
                            return;
                        }
                    }

                    // If we made it here, then the subdomain didn't fit, try the whole damned domain
                    if (hostname.split(".").length > 2) {
                        subdomains = hostname.split(".");
                        subdomains = subdomains[subdomains.length - 2] + "." + subdomains[subdomains.length - 1];
                        // Hash that hostname
                        hashedTargetUrl = historyblock.SHA1.hex_sha1(subdomains);

                        for (blIndex = 0; blIndex < domains.length; blIndex++) {
                            if (hashedTargetUrl === domains[blIndex].replace(whiteSpace, "")) {
                                downloadManager.removeDownload(oDownload.id);
                                return;
                            }
                        }
                    }
                }
            }
        },

        /**
        * Helper for getting all the cookies associated with a hostname.
        */
        getBlacklistedCookies = function (hostname) {
            var expiry,
                cookieEnum = cookieManager.getCookiesFromHost(hostname),
                blacklistCookies = [],
                cookie,
                nextHost;
            // Sentinel, don't bother if we aren't blocking cookies.
            if (blockCookies) { return blacklistCookies; }

            while (cookieEnum.hasMoreElements()) {
                cookie = cookieEnum.getNext().QueryInterface(Ci.nsICookie2);
                nextHost = cookie.host;
                nextHost = nextHost.match(hostRegexp);
                if (nextHost !== undefined) {
                    nextHost = nextHost[0];
                    if (hostname.split(".").length > 2 && (cookie.host.indexOf(hostname) !== -1 ||
                        cookie.host.indexOf(hostname.substring(hostname.indexOf("."), hostname.length)) !== -1)) {
                        // Need to do some hax to work around a 3.6 FF bug
                        expiry = cookie.expiry;
                        if (expiry > Math.pow(2, 62)) {
                            expiry = Math.pow(2, 62);
                        }

                        blacklistCookies.push({
                            host: cookie.host,
                            path: cookie.path,
                            name: cookie.name,
                            value: cookie.value,
                            isSecure: cookie.isSecure,
                            isHttpOnly: cookie.isHttpOnly,
                            isSession: cookie.isSession,
                            expiry: expiry
                        });
                    } else if (nextHost === hostname) {
                        // Need to do some hax to work around a 3.6 FF bug
                        expiry = cookie.expiry;
                        if (expiry > Math.pow(2, 62)) {
                            expiry = Math.pow(2, 62);
                        }

                        blacklistCookies.push({
                            host: cookie.host,
                            path: cookie.path,
                            name: cookie.name,
                            value: cookie.value,
                            isSecure: cookie.isSecure,
                            isHttpOnly: cookie.isHttpOnly,
                            isSession: cookie.isSession,
                            expiry: expiry
                        });
                    }
                }
            }
            return blacklistCookies;
        },

        /**
        * Helper which adds back each nsICookie2 object
        * contained in blacklistCookies.
        */
        readdBlacklistCookies = function (blacklistCookies) {
            var cookie,
                i,
                hostname = "";

            // Sentinel, don't bother if we aren't blocking cookies.
            if (blockCookies) { return; }

            for (i = 0; i < blacklistCookies.length; i++) {
                cookie = blacklistCookies[i];
                hostname = cookie.host;

                cookieManager.add(
                    cookie.host,
                    cookie.path,
                    cookie.name,
                    cookie.value,
                    cookie.isSecure,
                    cookie.isHttpOnly,
                    cookie.isSession,
                    cookie.expiry
                );
            }

            return;
        },

        /**
        * Gets called whenever a tab has closed.
        * event.target is a tab 
        */
        tabClosed = function (event) {
            var hostname = event.target.linkedBrowser.currentURI;

            removeHistory(hostname, event.target);
        },

        /**
        * Gets called when the user clicks "Block This!" from the right-click menu (just a pass-through to keep publics clean).
        */
        onBlockThis = function () {
            var currentUri = getBrowser().currentURI,
                hostname = getBrowser().currentURI.spec;

            hostname = hostname.match(hostRegexp);
            hostname = hostname[0].replace(slashesRegexp, "");
            if (confirm('Do you really want to block "' + hostname + '"?')) {
                // set the temp variable that will fire the rest
                prefs.setCharPref("extensions.historyblock.newblockedurl", hostname);

                return removeHistory(currentUri);
            }
        },

        /**
        * Gets fired every time the state changes on ANY page on ANY tab in THIS window.
        */
        onStateChange = function (aBrowser, aWebProgress, aRequest, aStateFlag, aStatus) {
            var hostname,
                subdomains = null,
                hashedTargetUrl = null,
                domains = null,
                blIndex,
                inhibited = false;

            if (aStateFlag & STATE_STOP) {
                // Only gets into this if statement when a page is completely done rendering.
                // Fires on HTML, XML, GIFs, etc.
                if (aStatus === 0) {
                    hostname = aBrowser.currentURI;

                    removeHistory(hostname);
                }
            }
        },

        /**
        * Tear down
        */
        shutdown = function () {
            if (!hasShutdown) {
                gBrowser.tabContainer.removeEventListener("TabClose", tabClosed, true);
                gBrowser.removeTabsProgressListener({ onStateChange: onStateChange });
                prefObserver.unregister();

                // Remove the shut-down listener.
                window.removeEventListener("unload", shutdown, false);
                hasShutdown = true;
            }
        },

        /**
        * Build up
        */
        init = function () {
            if (!hasInitialized) {
                gBrowser.tabContainer.addEventListener("TabClose", tabClosed, true);
                gBrowser.addTabsProgressListener({ onStateChange: onStateChange });
                prefObserver.register();

                // Add the shutdown listener
                window.addEventListener("unload", shutdown, false);
                window.removeEventListener("load", init, false);
                hasInitialized = true;
            }
        };

    // -------------------------------------------- //
    //                 Public methods               //
    // -------------------------------------------- //

    // This should be returned as a historyblock "object".
    return {
        onBlockThis: onBlockThis,
        init: init
    };
}());