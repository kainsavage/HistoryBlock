// Fire that badboy off when the window is loaded.
window.addEventListener("load",historyblock.init,false);

/* Mainly here for my sanity.
 *
 * historyblock.js is essentially a singleton instantiation of
 * the function to which historyblock references.
 * Writing this sentence correctly melted my brain. >_<
 * 
 * Once the mapped-to function is defined,
 * it gets automatically executed and the "private" variables
 * are lost (scope) to everything except the returned object
 * which is referenced via historyblock.
 *
 * In reality, the historyblock return statement is an Array
 * object (key-value map if we're being specific) which maps
 * keys to functions (or values... but just functions for HB).
 * When historyblock returns, the array looks like:
 *
 *   historyblock["init"=>function(){...}, etc]
 *
 * SOOOOOOO, the line at the top of historyblock.js basically
 * could be:
 *
 *   var historyblock = new Array("init":function(){...},etc);
 *
 * Except that we have a lot of "private" variables and functions
 * that we want historyblock to keep track of but not globally
 * declare. This is why the entire thing is wrapped in a function
 * (closure). When the function returns, it closes over the state
 * that goes out of scope to the rest of the program (basically
 * anything written in JS and running in FF). So, while nothing
 * else can access those "private" variable/functions because they
 * are out of scope, the closure retains references to them and
 * can access them.
 *
 * It's awesome.
 */