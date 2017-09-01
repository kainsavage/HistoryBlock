# HistoryBlock

HistoryBlock is a browser extension for maintaining a blacklist of undesirable web addresses which should not be tracked by the history or the recently closed tabs/windows of the browser.

## Options Page

### Blacklist Encryption

#### SHA1 (default)

With SHA1 blacklist encryption, every entry added to the blacklist is first matched (see [Address Matching](#address-matching)) and then digested using SHA1 encryption to create a [hash value](https://en.wikipedia.org/wiki/Hash_function) which is then stored with HistoryBlock.

The same process occurs on every page visit and tab/window close to check the address against the blacklist. In this way, the blacklist remains encrypted so that no one could see, in plain text, what sites are included in the blacklist.

#### None

With no encryption, every entry added to the blacklist is first matched (see [Address Matching](#address-matching)) and the stored with HistoryBlock.

When a page is visited or a tab/window closed, the address is checked against the blacklist.

Storing blacklist entries in plain text is **not** recommended as they will be visible on the addons page (`about:addons`).

### Address Matching

#### Domain (default)

Domain matching uses only the domain name portion of the web address for determining whether it is in the blacklist.

Example: Blocking `https://www.google.com/` would result in `google.com` to be added to the blacklist. Any visit to a `google.com` domain would result in a block.

Domain matching is the most liberal and therefore the default matching setting. Domain matching will cover most use cases well enough.

#### Subdomain

Subdomain matching uses the domain in conjunction with any subdomain portion (including `www.`).

Example: Blocking `https://www.google.com/` would result in `www.google.com` to be added to the blacklist. Any visit to `www.google.com` addresses would be blocked, but not others (`docs.google.com` for example).

Subdomain matching is slightly less liberal and requires more tuning by a user to get the exact coverage needed.

#### URL

URL matching uses the entire web address (minus the protocol).

Example: Blocking `https://www.google.com/` would **only** block visits to `www.google.com` (and not `www.google.com/foo`).

URL matching is the most conservative matching technique and is only suitable for use cases in which only specific URLs need to be blocked, but other visits to the same domain/subdomain should not. URL matching is **not** recommended for most users.

### User Data

#### Cookies

Determines whether cookies should be blocked using the same rules as History entries.

Note: This will cause many websites which store cookies used for authentication to "forget" a logged in user after blocking occurs. For example, if a user has blacklisted a site using this type of cookie-based authentication, visits the site, logs in, closes the tab, then revisits the site, that user will not be logged into that site because the cookie has been removed.

### Controls

#### Context Menu

Controls whether the HistoryBlock context menu (right-click menu) entry is visible.

### Blacklist

The blacklist as it exists given the current HistoryBlock settings.

### Control Buttons

#### Import

The Import button is only available if [Blacklist Encryption](#blacklist-encryption) is set to `SHA1`. This control is a legacy support for migrating a HistoryBlock v1.x blacklist to a v2.x blacklist.

Prompts the user to enter a comma-separated list of hash values to add to the current blacklist.

##### Migrating Legacy Blacklist

Visit `about:config` and search for `extensions.historyblock.stringpref`. Double-click the row to open the value editor, and copy the entire value (it will be a comma-separated list of hash values) suitable for entering at the import control.

#### Add Domain

Adds the given address to the blacklist using the current settings; this action is analogous to visiting the address and using the context menu 'Block' control.

#### Remove Domain

Removes the given address from the blacklist using the current settings; this action is analogous to visiting the address and using the context menu 'Unblcok' control.

#### Clear Blacklist

Removes all entries from the blacklist.

Note: this action **cannot** be undone; be very careful.

## Context Menu

Both Block and Unblock are available on every page in the context menu so as not to illustrate to the user whether the current address exists in the blacklist.

### Block

Blocks the current tab's address using the current settings for [Address Matching](#address-matching) and [Blacklist Encryption](#blacklist-encryption).

### Unblock

Blocks the current tab's address using the current settings for [Address Matching](#address-matching) and [Blacklist Encryption](#blacklist-encryption).