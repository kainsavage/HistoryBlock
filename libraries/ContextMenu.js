/**
 * ContextMenu handles everything to do with adding/remove context menu items
 * as well as handling actions of said items.
 */
class ContextMenu {

  /**
   * Simple constructor which initializes all context menu facets and attaches
   * listeners to each item.
   * @param {object} historyblock 
   */
  constructor(historyblock) {
    this.historyblock = historyblock;

    this.createContextMenuItems();
    this.attachContextMenuControls();
    this.createFunctionBindings();
    this.attachEventListeners();
  }

  /**
   * Creates the HistoryBlock context menu items.
   */
  createContextMenuItems() {
    this.blockContextMenuItem = {
      id: "blockthis",
      title: browser.i18n.getMessage(i18n.BLOCK),
      contexts: ["all"]
    };
    this.unblockContextMenuItem = {
      id: "unblockthis",
      title: browser.i18n.getMessage(i18n.UNBLOCK),
      contexts: ["all"]
    };
  }

  /**
   * Attaches the context menu controls if enabled in the HistoryBlock options.
   */
  async attachContextMenuControls() {
    let storage = await browser.storage.sync.get();

    if (storage.enableContextMenu === undefined) {
      storage.enableContextMenu = true;
      await browser.storage.sync.set({ enableContextMenu: storage.enableContextMenu });
    }

    // Always remove the context menus we are about to add, just in case.
    await browser.contextMenus.remove(this.blockContextMenuItem.id);
    await browser.contextMenus.remove(this.unblockContextMenuItem.id);

    if (storage.enableContextMenu) {
      await browser.contextMenus.create(this.blockContextMenuItem);
      await browser.contextMenus.create(this.unblockContextMenuItem);
    }
  }

  /**
   * Creates boundFunctions out of all the event listener functions
   * so that the `this` variable always refers to the HistoryBlock object.
   */
  createFunctionBindings() {
    this.onContextMenuItemClicked = this.onContextMenuItemClicked.bind(this);
    this.onMessage = this.onMessage.bind(this);
  }

  /**
   * Attaches the various HistoryBlock event listeners.
   */
  attachEventListeners() {
    browser.contextMenus.onClicked.addListener(this.onContextMenuItemClicked);
    browser.runtime.onMessage.addListener(this.onMessage);
  }

  /**
   * Called whenever a message is sent from another extension (or options page).
   *
   * @return {Promise}
   *         A Promise that is fulfilled after the given message has been 
   *         handled.
   */
  async onMessage(message) {
    switch (message.action) {
      case ACTION.CHANGE_CONTEXT_MENU_CONTROLS:
        return await this.changeContextMenuControls(message.enabled);
    }
  }

  /**
   * Called when one of the context menu items is clicked. Largely this is just
   * a router for the different types of context menu clicks.
   *
   * @param  {object} info
   *         The data about the context menu click.
   * @param  {object} tab
   *         The tab in which the context menu click occurred.
   * @return {Promise}
   *         A promise that is fulfilled after the context menu click has been
   *         handled.
   */
  async onContextMenuItemClicked(info, tab) {
    switch (info.menuItemId) {
      case "blockthis":
        return this.historyblock.block(tab.url);
      case "unblockthis":
        return this.historyblock.unblock(tab.url);
    }
  }

  /**
   * Changes whether the context menu controls are enabled.
   * 
   * @param  {boolean} enabled
   *         Whether the context menu controls should be enabled.
   * @return {Promise}
   *         A Promise that is fulfilled after the context menu controls option
   *         of enabled is set.
   */
  async changeContextMenuControls(enabled) {
    await browser.storage.sync.set({ enableContextMenu: enabled });

    await this.attachContextMenuControls();
  }
}