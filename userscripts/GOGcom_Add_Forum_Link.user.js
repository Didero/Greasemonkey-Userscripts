// ==UserScript==
// @name           GOG.com Add Forum Link
// @namespace      http://userscripts.org/users/didero
// @description    On GOG, each game has a subforum, but this isn't linked to on the game page. This script adds that link, if it can be found. If all the games in a series share a forum, it links to that series' forum.
// @include        http://www.gog.com/game/*
// @include        http://www.gog.com/*/game/*
// @include        https://secure.gog.com/game/*
// @include        https://secure.gog.com/*/game/*
// @author         Didero
// @version        2.2.2
// @updateURL      https://github.com/Didero/Greasemonkey-Userscripts/raw/master/userscripts/GOGcom_Add_Forum_Link.js
// @downloadURL    https://github.com/Didero/Greasemonkey-Userscripts/raw/master/userscripts/GOGcom_Add_Forum_Link.js
// @grant          GM_registerMenuCommand
// ==/UserScript==

//First some variables that more advanced users might want to customise (I hope that's not necessary though)
var forumLabelText = 'game forum'; //The text that will show in the left column of the game information
var forumNotFoundText = 'unavailable'; //The text for when the specific forum of the game can't be found
var seriesSuffix = ' (and series)'; //Will be appended to the link when the forum found is for the game's series instead of for the one game
var loadingText = 'loading...';

//Some functions to replace built-in Greasemonkey functions, for portability
function setValue(key, value) {
	localStorage.setItem("GAFL_"+key, value);
}
function getValue(key, defaultValue) {
	var value = localStorage.getItem("GAFL_"+key);
	if (value) return value;
	else return defaultValue;
}
function keyExists(key) {
	return localStorage.getItem(key) !== null;
}
function deleteValue(key) {
	localStorage.removeItem("GAFL_"+key);
}
function deleteAllValues() {
	//Don't use 'localStorage.clear()' since that also clears the data of other scripts
	for (var i = 0, len = localStorage.length; i < len; i++) {
		var key = localStorage.key(i);
		if (key.indexOf("GAFL_") == 0) localStorage.removeItem(key);
	}
}
function isValueStored() {
	for (var i = 0, len = localStorage.length; i < len; i++) {
		if (localStorage.key(i).indexOf("GAFL_") == 0) return true;
	}
	return false;
}


//This is used for two attempts at finding the forum, by first removing just the word, and then removing this and the word before (f.i. 'gold edition')
var collectionSuffixes = ['edition', 'complete', 'bundle', 'platinum', 'collection', 'gold', 'pack', 'deluxe'];
var debug = getValue('debug', false);

//** GREASEMONKY SPECIFIC **//
GM_registerMenuCommand((getValue('storeResults', false) ? 'Disable' : 'Enable') +' Storing Forum Location For Future Use', toggleStoreResults,'S');
function toggleStoreResults() {
	toggleGreasemonkeyValue('storeResults', false, true);
}
//Allow re-discovering of the displayed forum location. If the location is stored, it'll get cleared, otherwise it's just a page refresh
GM_registerMenuCommand('Refresh Stored Forum Location For This Game', clearForumLocation, 'R');
function clearForumLocation() {
	deleteValue(getGamePartOfUrl());
	window.location.reload();
}

//Allow users to set a custom forum location, to solve unfindable forums (like e.g. The 11th Hour)
GM_registerMenuCommand('Set Custom Forum Location', setCustomLocation, 'C');
function setCustomLocation() {
	var location = prompt('Please enter the URL of the forum that you want a link to on this page.\n\n'+defaultUrl,getValue(getGamePartOfUrl(),''));
	if (location != null && location != '') { //check if the user didn't cancel
		location = cleanUpString(location); //Make sure it's a valid URL
		var linktext = gameName;
		//If the new link goes to a 'series' page and the link doesn't have the series suffix, add it
		if (endsWith(location, '_series') && !endsWith(forumlink.innerHTML, seriesSuffix)) linktext += seriesSuffix;
		//If the new link doesn't go to a 'series' page and the link does have the suffix, remove it
		else if (!endsWith(location, '_series') && endsWith(forumlink.innerHTML, seriesSuffix)) linktext = linktext.replace(seriesSuffix, '');
		setLinkTarget(defaultUrl+location, linktext);
		storeForumLocation(defaultUrl+location); //make sure the location gets stored, even if general storing is disabled
		alert('Custom location successfully set to "' + defaultUrl + location + '".');
	}
}

//Allow the user to have the forum link open in a new window
GM_registerMenuCommand('Set Forum Link To Open In '+ (getValue('openInNewWindow', false) ? 'This' : 'A New') + ' Window', toggleOpenInNewWindow, 'W');
function toggleOpenInNewWindow() {
	toggleGreasemonkeyValue('openInNewWindow', false, true);
}

GM_registerMenuCommand((debug ? 'Disable' : 'Enable') + ' Debug Mode', toggleDebugMode, 'M');
function toggleDebugMode() {
	//If the script will set 'debug' to true, so if it's false now, show a reminder of where the debug messages will show up
	if (!debug) alert("Debug messages will be shown in the 'Error Console'.\n('Tools'->'Web Developer'->'Error Console' or ctrl+shift+J)");
	toggleGreasemonkeyValue('debug', false, true);
}

// Also allow the option to clear values stored by this script, if there are any or if there will be one after loading (stored forum url)
if (isValueStored()) {
	GM_registerMenuCommand('Delete All Data Stored By This Script', deleteData, 'D');
}
//Clear value
function deleteData() {
	deleteAllValues();
	alert('All stored data was successfully deleted.');
	window.location.reload();
}

function storeForumLocation(url) {
	if (url != defaultUrl) {
		var gameKey = getGamePartOfUrl();
		var forumLocation = getPartAfterLastChar(url, '/');
		debuglog('Storing forum location; "'+gameKey+'"="'+forumLocation+'"');
		setValue(gameKey, forumLocation);
	}
}
function storeCurrentForumLocation() {
	storeForumLocation(forumlink.href);
	alert('Forum location successfully stored.');
}
//** UTILITY FUNCTIONS **//
function debuglog(msg) {
	if (debug) console.log(msg);
}
//A function to toggle a stored boolean value
function toggleGreasemonkeyValue(valueName, defaultValue, refreshOnChange) {
	if (getValue(valueName, defaultValue) == defaultValue) setValue(valueName, !defaultValue);
	else deleteValue(valueName); //Since the default is either 'true' or 'false', there's no need to store that. Efficiency!	
	if (refreshOnChange) window.location.reload();
}
//This function is needed to get the displayed game title easily
function getMetaData(propertyName) { 
	var metaTags = document.getElementsByTagName('meta');
	for (var i=0; i < metaTags.length; i++) {
		if (metaTags[i].getAttribute("name") == propertyName) {
			return metaTags[i].getAttribute("content");
		}
	}
	return ""; //If no matching meta tag was found, return nothing
}
//Source: http://stackoverflow.com/questions/280634/endswith-in-javascript
function endsWith(str, suffix) {
	return str.indexOf(suffix, str.length - suffix.length) !== -1;
}
function getPositionOfFirstNumber(str) {
	var regExp = /\d+/; //one or more digits
	var number = str.match(regExp);
	if (number != null) return str.indexOf(number);
	else return str.length;
}
function cleanUpString(str) {
	//Remove anything that isn't a number,letter or space. Replace spaces and dashes with an underscore. Prevent repeated underscores. Remove trailing underscores.
	return str.replace(/[^\d\w\s]/g, '').replace(/[ -]/g,'_').replace(/(_){2,}/g, '_').replace(/_$/g,'').toLowerCase();
}
function getGamePartOfUrl() {
	return getPartAfterLastChar(simpleForumUrl, '/');
}
function getPartAfterLastChar(str, chr) {
	var index = str.lastIndexOf(chr);
	//If the character is either not in the string or the last character in the string, return everything
	if (index == -1 || index >= str.length-1) return str;
	else return str.substring(index+1);
}
function removeParts(str, separator, amountToRemove) {
	var parts = str.split(separator);
	parts.splice(-1 * amountToRemove, amountToRemove);
	return parts.join(separator);
}
function getGameName() {
	var gameName = getMetaData('og:title');
	if (endsWith(gameName, ', The ') || endsWith(gameName, ', The')) gameName = 'The '+gameName.substring(0, gameName.lastIndexOf(','));
	return gameName;
}

//** ACTUAL SCRIPT **//
//If the provided page exists, it sets that page as the target for the forum link. Otherwise it tries the next attempt (see 'urlChecker' below)
function checkIfUrlExists(url, linktext, attempt, callback, addSeriesSuffix) {
	debuglog('Attempt '+attempt + (addSeriesSuffix ? '.2' : '.1') + ': checking url "'+url+'"');
	//No need to check the same url twice.
	if (urlsChecked.indexOf(url) > -1) {
		debuglog('Skipping url "'+url+'", already checked');
		callback(attempt+1); 
	}
	else {
		urlsChecked.push(url); //Keep track of the url's we've already checked
		var http = new XMLHttpRequest();
		http.open('HEAD', url);
		http.onreadystatechange = function() {
			if (this.readyState == 4) { //4 is the code for 'ready'. I used 'this.DONE' before and that worked, not sure what broke it
				//debuglog('HTTP Request status: '+this.status);
				if (this.status == 200) setLinkTarget(url, linktext); //If the page exists, no need to continue, set the forum link to this url
				else if (!addSeriesSuffix) { //Try again with '_series' at the end if that hasn't been done already
					url = url.substring(0, getPositionOfFirstNumber(url));
					if (url.charAt(url.length-1) != '_') url += '_'; //Add an underscore at the end, if necessary. Otherwise 'series' prefix doesn't work
					url += 'series';
					//Only check the url if it isn't just the series suffix
					if (!endsWith(url, '/_series')) checkIfUrlExists(url, linktext + seriesSuffix, attempt, callback, true);
					else {
						debuglog('Skipping series check');
						callback(attempt+1);
					}
				}
				else callback(attempt+1); //If the 'series' suffix was tried already, move on to the next attempt
			}
		};
		http.send();
	}
}
//A simple function to make setting the target of the forum link easy. Since this is used in a few places, a function seemed like the best way
function setLinkTarget(linktarget, text) {
	forumlink.href = linktarget;
	forumlink.innerHTML = text;
	forumlink.className = 'un'; //Underline the link, to emphasise it can be clicked now. This way it fits in nicely

	//Only (allow users to) save the forum url if we found one and if there isn't one already stored
	if (linktarget != defaultUrl && getValue(getGamePartOfUrl(), '') == '') {
		if (getValue('storeResults', true)) storeForumLocation(linktarget);
		//If automatic saving is disabled, allow for manual saving
		else GM_registerMenuCommand('Store Forum Location For Future Use', storeCurrentForumLocation, 'L');
	}
}

//On to the main event! First find the proper location, below the rest of the game info
var gameSpecs = document.getElementsByClassName('product-details');
if (gameSpecs.length != 1) {
	debuglog("Unexpected about of game spec elements found. Expected 1, found " + gameSpecs.length);
}
else {
	var gameSpecList = gameSpecs[0];
	var simpleForumUrl = window.location.href.replace('/game/', '/forum/'); //The simplest forum URL for a game is very similar to the gamepage's
	//If the user got to the page by clicking a link on the front page, an anchor gets added (e.g. '.../#s_0'). Remove that
	if (simpleForumUrl.lastIndexOf('#') != -1) {
		simpleForumUrl = simpleForumUrl.substring(0, simpleForumUrl.indexOf('#'));
	}
	//Remove trailing slashes
	if (endsWith(simpleForumUrl, '/')) simpleForumUrl = simpleForumUrl.substring(0, simpleForumUrl.length - 1);
	var gameName = getGameName();
	
	//URL used if the game's forum couldn't be found. Also used as the base when loading urls.
	// Based off the simple url so the start of the url matches (f.i. 'gog.com/EN/...'). This makes sure the same forum isn't tried twice
	var defaultUrl = simpleForumUrl.substring(0, simpleForumUrl.lastIndexOf('/') + 1); //+1 to include the slash. Easy to append stuff to
	
	//Create most of the link and surrounding decorations already. When forum is found, all that needs to be done is update the link's href
	var forumLabel = document.createElement('dt');
	forumLabel.className = 'product-details__category';
	forumLabel.innerHTML = forumLabelText;
	gameSpecList.appendChild(forumLabel);
	
	var forumlink = document.createElement('a');
	forumlink.innerHTML = loadingText;
	if (getValue('openInNewWindow', false)) forumlink.target = '_blank'; //Have the forum open in a new window, if the user wants
	var forumlinkContainer = document.createElement('dd');
	forumlinkContainer.className = 'product-details__data';
	forumlinkContainer.appendChild(forumlink);
	gameSpecList.appendChild(forumlinkContainer);
	
	//Check if the forum exists before linking to it
	var urlChecker = function(attempt) {
		var url = '';
		switch (attempt) { //Order determined first by ease of checking, preferably without connecting to GOG again, then by chance of working
			case 0: //Simplest case, just replacing 'gamecard' with 'forum' in url
				url = simpleForumUrl;
			break;
			case 1: //Possessive s's get messed up in titles sometimes (See "Amerzone - The Explorer's Legacy"). Since removing the apostrophe has been tried (it's often like that in the URL), replace it with an underscore and try again.
				var possessiveSpos = gameName.indexOf("'s");
				if (possessiveSpos > -1) { //don't even try if there's no possessive s
					url = defaultUrl + cleanUpString(gameName.replace(/'s/gi, "_s")); //First replace the 's with _s, otherwise it'd get eaten by the cleaning function
				}
			break;
			case 2: //As an addendum to the previous case, try removing the "'s" entirely (See "Robinson's Requiem Collection")
				var possessiveSpos = gameName.indexOf("'s");
				if (possessiveSpos > -1) { //don't even try if there's no possessive s
					url = defaultUrl + cleanUpString(gameName.replace(/'s/gi, '')); //First remove the 's, otherwise it'd get mangled by the cleaning function
				}
			break;
			case 3: //Remove the word 'the' from the name, if it's there. Some games trip over that (See 'Temple of Elemental Evil')
				if (gameName.search(/\bthe\b/gi) > -1) {
					url = defaultUrl + cleanUpString(gameName.replace(/\bthe\b/gi,''));
					url = url.replace('/_','/'); //If the name starts with 'the', it leaves an underscore at the start. Remove that.
				}
			break;
			case 4: //If the name starts with 'The', try putting it at the end (See 'Lords Of Midnight')
				if (gameName.search(/\bthe\b/gi) > -1) {
					url = defaultUrl + cleanUpString(gameName.replace(/\bthe\b/gi,'')) + '_the';
					url = url.replace('/_','/'); //If the name starts with 'the', it leaves an underscore at the start. Remove that.
				}
			break;
			case 5: //Some games are a 'Deluxe' or 'Gold' version. Remove that suffix, and try again
				for (var i=0; i < collectionSuffixes.length; i++) {
					if (endsWith(simpleForumUrl, '_'+collectionSuffixes[i])) {
						url = removeParts(simpleForumUrl,'_',1);
						break;
					} //end-if
				} //end-for
			break;
			case 6: //Same as previous case, except also remove the word in front (Fixes f.i. 'Diamond Edition' suffix)
				for (var i=0; i < collectionSuffixes.length; i++) {
					if (endsWith(simpleForumUrl, '_'+collectionSuffixes[i])) {
						url = removeParts(simpleForumUrl,'_',2);
						break;
					} //end-if
				} //end-for
			break;
			case 7: //Try the game name in the title bar (cleaned up), instead of the simplified one in the URL
				url = defaultUrl + cleanUpString(gameName);
			break;
			case 8: //Remove colons, plus signs and similar from the name, and try just the part in front of those
				var separators = [':', '+', '-'];
				for (var i=0; i < separators.length; i++) {
					var separatorPos = gameName.indexOf(separators[i]);
					if (separatorPos > -1) {
						url = defaultUrl + cleanUpString(gameName.substring(0, separatorPos));
						break;
					}
				}
			break;
			case 9: //Check only the part in front of the first number, if there is one
				url = simpleForumUrl.substring(0, getPositionOfFirstNumber(simpleForumUrl));
				while (url.charAt(url.length-1) == '_') url = url.substring(0, url.length-1);
			break;
			case 10: //Check for only the first word (Fixes the 'Creatures' series f.i.)
				var firstUnderscoreIndex = simpleForumUrl.indexOf('_');
				if (firstUnderscoreIndex > -1) {
					var firstWord = simpleForumUrl.substring(simpleForumUrl.lastIndexOf('/')+1, firstUnderscoreIndex);
					//If the first word is 'the', we're not gonna find anything. Move on to the second word
					if (firstWord == 'the') {
						firstWord = simpleForumUrl.substring(simpleForumUrl.indexOf('/the_') + '/the_'.length);
						firstWord = firstWord.substring(0, firstWord.indexOf('_'));
					}
					url = defaultUrl + firstWord;
				}
			break;
			case 11: //Check for only the last word (fixes e.g. "Return to Krondor")
				var separatorPos = simpleForumUrl.lastIndexOf('_');
				if (separatorPos > -1 && separatorPos < simpleForumUrl.length) url = defaultUrl + simpleForumUrl.substring(separatorPos+1);
			break;
			case 12: //Fixing a weird mistake (I think) by the GOG team. Some forum names have an underscore at the end (Like "Guilty Gear X2 #Reload")
				url = defaultUrl + cleanUpString(gameName.replace(/'s/g, '_s')) + '_'; //apostrophe replacement is specifically to fix "Sid Meier's Alpha Centauri". Ugly solution, I know
			break;
			default: //If the game's forum wasn't found, do nothing
				debuglog('No forum found, using default');
				setLinkTarget(defaultUrl, forumNotFoundText);
				return; //Very important, prevents infinite loop (Script got up to attempt 1275 during testing)
			break;
		} //End of switch-block
		
		if (url != '') checkIfUrlExists(url, gameName, attempt, urlChecker, false);
		else { //if no URL was set, skip this attempt
			debuglog('Skipping attempt '+attempt);
			urlChecker(attempt+1);
		}
	}
	
	//If there's a stored value, use that
	var storedForumLocation = getValue(getGamePartOfUrl(), '');
	if (storedForumLocation != '') {
		debuglog('Forum URL already stored, using "'+defaultUrl+storedForumLocation+'"');
		var linktext = getGameName();
		if (endsWith(storedForumLocation, '_series')) linktext += seriesSuffix;
		setLinkTarget(defaultUrl + storedForumLocation, linktext);
	}
	else {
		var urlsChecked = new Array();
		urlChecker(0); //Set the whole thing off
	}
}
