// ==UserScript==
// @name           Kickstarter Add Percentage Funded
// @author         Didero
// @namespace      http://userscripts.org/users/didero
// @description    On a Kickstarter project page, displays the percentage of the goal reached, and the difference between the pledged and asked amount
// @include        http://www.kickstarter.com/projects/*/*
// @include        https://www.kickstarter.com/projects/*/*
// @version        3.2.5
// @downloadURL    https://github.com/Didero/Greasemonkey-Userscripts/raw/master/userscripts/Kickstarter_Add_Percentage.user.js
// @updateURL      https://github.com/Didero/Greasemonkey-Userscripts/raw/master/userscripts/Kickstarter_Add_Percentage.user.js
// @grant          none
// ==/UserScript==

function addThousandsSeparator(number) {
	if (number < 1000) return number.toString();
	//								 reverse the String			find groups of 3 numbers  add commas    reverse the string again
	else return number.toString().split('').reverse().join('').match(/\d{1,3}/g).join(',').split('').reverse().join('');
}

var pledgeAmountDiv = document.getElementById('pledged');
if (pledgeAmountDiv) {
	var percentageRaised = pledgeAmountDiv.getAttribute('data-percent-raised');
	if (percentageRaised != null) {
		percentageRaised = addThousandsSeparator(Math.round(parseFloat(percentageRaised) * 100));
		
		//Make sure we display the same currency symbol as on the rest of the page
		var currencySymbol = '$';
		if (pledgeAmountDiv.innerHTML.indexOf('£') > -1) currencySymbol = '£';
		
		var pledgeDifference = Math.round(parseFloat(pledgeAmountDiv.getAttribute('data-goal')) - parseFloat(pledgeAmountDiv.getAttribute('data-pledged')));
		var leftOrOverTarget = 'to';
		//If the target has already been reached, display how much more money has been promised
		if (pledgeDifference < 0) {
			leftOrOverTarget = 'over';
			pledgeDifference = Math.abs(pledgeDifference);
		}		
		pledgeDifference = addThousandsSeparator(pledgeDifference);
		
		//Display the percentage
		var percentageDisplay = document.createElement('span');
		percentageDisplay.className = 'h5';
		percentageDisplay.innerHTML = ' (' + percentageRaised + '%)';
		pledgeAmountDiv.parentNode.appendChild(percentageDisplay);
		
		//Display the stats in a separate line, for more room. Nest it just like the other numbers, so it gets formatted properly
		var moneyDisplay = document.createElement('div');
		moneyDisplay.className = 'h5';
		moneyDisplay.innerHTML = currencySymbol + pledgeDifference + ' ' + leftOrOverTarget + ' target';
		pledgeAmountDiv.parentNode.appendChild(moneyDisplay);
	}
}
