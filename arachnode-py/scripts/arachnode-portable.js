const RELEVANCE_DEPTH = 4;
const PASSABLE_TEXT_QUANTIFIER = 100;
var arachnode_status = "ArachNode Connected!\nWaiting on browser activity.";
var arachnode_hierarchy = undefined;
var arachnode_on = undefined;

function getElementHierarchy(elem, ind) {
	var hierarchy = [];

	$(document).find('*').each(function () {
		let $current = $(this);
		let depth = $(elem).attr('data-generation') - $current.attr('data-generation');
		let parent = $current.parent()[0];

		if ($.contains(this, elem)) {
			if (depth <= RELEVANCE_DEPTH && depth > 1) hierarchy.push(getAttributes(this,"g", depth, ind));
			else if (depth == 1) hierarchy.push(getAttributes(this,"p", 1, ind)); 
			else hierarchy.push(getAttributes(this, "a", undefined, true, ind));
		} 
		else if (this == elem) hierarchy.push(getAttributes(this, "e", 0, ind));
		else if ($current.parent()[0] == $(elem).parent()[0]) hierarchy.push(getAttributes(this, "s", undefined, true, ind));
	});
	return hierarchy;
}

function getText(element, text, depth, last_tag) {
	for (var i = 0; i < element.childNodes.length; i++) {
		var childNode = element.childNodes[i];
		if (childNode.nodeType === Node.TEXT_NODE) {
			var t = childNode.textContent.replace(/(?:\r\n|\r|\n)/g, '\\n');
			if (!(/^[\\n\s]*$/).test(t) && last_tag != "STYLE") text.push([t, depth, last_tag]);
		}
		else if (childNode.nodeType === Node.ELEMENT_NODE && $(childNode).css('display') != 'none' && $(childNode).css('visibility') != 'hidden' && $(childNode).text() != '') getText(childNode, text, depth - 1, $(childNode).prop('tagName'));
	}
	return text;
}

function getAttributes(elem, relationship, depth=undefined, onlyTag=false, ind=0) {
	if (ind == 0) {
		if ($(elem).hasOwnProperty('click') || (elem.onclick) || $(elem).is('[onclick]') || ($(elem).is('a') && $(elem).prop('href')) || elem.tagName == "BUTTON" || $(elem).attr('data-clickable') == "true" || $(elem.parentNode).attr('data-clickable') == "true") $(elem).attr('data-clickable', 'true');
		else $(elem).attr('data-clickable', 'false');
	}
	var attrs = {'tag': $(elem).prop('tagName'), 'entity': relationship};
	if (onlyTag) return attrs;
	var styles = window.getComputedStyle(elem);
	var default_element = document.createElement(attrs['tag']);
	default_element.id = "arachnode";
	document.body.appendChild(default_element);
	for (var i = 0; i < styles.length; i++) {
		var property = styles[i];
		var computedValue = $(elem).css(property);
		if (computedValue != $('#arachnode').css(property) && !property.startsWith("-webkit")) attrs[property] = computedValue;
	}
	const sheets = document.styleSheets;
	Array.from(sheets).forEach(sheet => {
		try {
			Array.from(sheet.cssRules || []).forEach(rule => {
				if (rule.selectorText && rule.selectorText.includes(":")) {
					if (elem.matches(rule.selectorText)) {
						//hoverStyles = rule.style;
						for (let i = 0; i < rule.style.length; i++) {
							const propName = rule.style[i];
							const propValue = rule.style.getPropertyValue(propName);
							if (propValue != "") {
								attrs[propName + ":" + rule.selectorText.split(":")[1]] = propValue;
							}
						}
					}
				}
			});
		} catch (e) {
			
		}
	});
	$('#arachnode').remove();
	$.each(elem.attributes, function () {
		if (this.specified) {
			attrs[this.name] = this.value;
		}
	});
	if (depth != undefined) {
		let text = getText(elem, [], depth, attrs['tag']);
		if (JSON.stringify(text).replaceAll('[','').replaceAll(']','').split(',').length < PASSABLE_TEXT_QUANTIFIER) attrs['text'] = text;
		attrs['depth'] = depth;
	}
	return attrs;
}

async function sendJSON(data, url) {
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});

	if (!response.ok) {
		arachnode_status = "HTTP error! status: " + response.status;
	} else {
		arachnode_status = "Data sent successfully";
	}
}

var defaultResponseTriggered = false;

function levenshtein(a, b) {
	const matrix = Array.from(Array(a.length + 1), () => Array(b.length + 1).fill(0));
	for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
	for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
		}
	}
	return matrix[a.length][b.length];
}

function verify_element(element, generation) {
  	let element_matrix = [];
	
	$(document).find('*').each(function () {
		let $current = $(this);
		let parent = $current.parent()[0];
		let generation = 0;

		if (parent != document) generation = parseInt($current.parent().attr('data-generation')) + 1;
		$current.attr('data-generation', generation);
	});
	let ind = 0;
  	$(document).find('*').each(function () {
		if (Math.abs(parseInt($(this).attr('data-generation')) - parseInt(generation)) <= 5) {
			let hierarchy = JSON.stringify(getElementHierarchy(this, ind));
	  		element_matrix.push([1 - (levenshtein(element, hierarchy) / Math.max(element.length, hierarchy.length)), this]);
			ind += 1;
		}
  	});
	const minValuedSublist = element_matrix.reduce((min, sublist) => {
  		return (sublist[0] < min[0]) ? sublist : min;
	}, element_matrix[0]);
	const best_fit = element_matrix.reduce((max, curr) => (curr[0] > max[0] ? curr : max), [-Infinity]);//Math.max(...element_matrix.map(subList => subList[0]));
	console.log("best fit", minValuedSublist, best_fit);
	console.log(element_matrix);
	console.log(generation);
	return getElementHierarchy(best_fit[1]);
}