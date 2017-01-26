// This must be declared as 'var' so that it will be in scope to the xul
// components.
var historyblock;

// Fire that badboy off when the window is loaded.
window.addEventListener("load",() => { historyblock = new HistoryBlock(); },false);