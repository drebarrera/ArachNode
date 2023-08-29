const RELEVANCE_DEPTH = 4;
const PASSABLE_TEXT_QUANTIFIER = 100;
var arachnode_status = "ArachNode Connected!\nWaiting on browser activity.";
var arachnode_hierarchy = undefined;
var arachnode_on = undefined;

document.addEventListener('DOMContentLoaded', () => {
    customElements.define('selection', class extends HTMLElement {
        connectedCallback() {
            this.innerHTML = '<p>Hello from my custom tag!</p>';
        }
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type == 'arachnode_status_req' && arachnode_status != (message.msg ?? [undefined])[0]) {
        response = { type: "arachnode_status_res", id: message.id, msg: [arachnode_status, arachnode_hierarchy] };
        sendResponse(response);
        setTimeout(() => {
            arachnode_hierarchy = undefined;
        }, 500);
    } else if (message?.type == 'arachnode_toggle') {
        arachnode_on = message.msg;
    }
});

function getElementHierarchy(elem) {
    var hierarchy = [];

    $(document).find('*').each(function () {
        let $current = $(this);
        let parent = $current.parent()[0];
        let generation = 0;

        if (parent != document) generation = parseInt($current.parent().attr('data-generation')) + 1;
        $current.attr('data-generation', generation);
    });

    $(document).find('*').each(function () {
        let $current = $(this);
        let depth = $(elem).attr('data-generation') - $current.attr('data-generation');
        let parent = $current.parent()[0];

        if ($.contains(this, elem)) {
            if (depth <= RELEVANCE_DEPTH && depth > 1) hierarchy.push(getAttributes(this,"g", depth));
            else if (depth == 1) hierarchy.push(getAttributes(this,"p", 1)); 
            else hierarchy.push(getAttributes(this, "a", undefined, true));
        } 
        else if (this == elem) hierarchy.push(getAttributes(this, "e", 0));
        else if ($current.parent()[0] == $(elem).parent()[0]) hierarchy.push(getAttributes(this, "s", undefined, true));
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

function getAttributes(elem, relationship, depth = undefined, onlyTag=false) {
    if ($(elem).hasOwnProperty('click') || (elem.onclick) || $(elem).is('[onclick]') || ($(elem).is('a') && $(elem).prop('href')) || elem.tagName == "BUTTON" || $(elem).attr('data-clickable') == "true" || $(elem.parentNode).attr('data-clickable') == "true") $(elem).attr('data-clickable', 'true');
    else $(elem).attr('data-clickable', 'false');
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
            console.log("Couldn't access cssRules for stylesheet: ", e)
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
        arachnode_status = `HTTP error! status: ${response.status}`;
    } else {
        arachnode_status = "Data sent successfully";
    }
}

var defaultResponseTriggered = false;

function clickResponse(clickedElement) {
    var element_html_shorthand = $(clickedElement).html();
    if (clickedElement == undefined) return;
    if (element_html_shorthand.length > 200) element_html_shorthand = element_html_shorthand.substring(0, 200) + '...';
    if (clickedElement.tagName == "SELECTION") arachnode_status = "User selected '" + element_html_shorthand + "'";
    else arachnode_status = "User clicked on '" + element_html_shorthand + "'";
    let hierarchy = getElementHierarchy(clickedElement);
    if (clickedElement.tagName == "SELECTION") hierarchy.unshift({"type": "SELECTION"});
    else hierarchy.unshift({"type": "CLICK"});
    arachnode_hierarchy = JSON.stringify(hierarchy);
    console.log(hierarchy);
    clickedElements = [];
    if (clickedElement.tagName != "SELECTION") {
        setTimeout(() => {
            defaultResponseTriggered = true;
            $(clickedElement).trigger('click');
            if (clickedElement.href) window.location.href = clickedElement.href;
            setTimeout(() => {
                defaultResponseTriggered = false;
            }, 100)
        }, 2000);
    } else {
        while (clickedElement.firstChild) {
            clickedElement.parentNode.insertBefore(clickedElement.firstChild, clickedElement);
        }
        clickedElement.parentNode.removeChild(clickedElement);
        console.log(clickedElement);
    }
    
}

$(document).ready(function () {
    $(document).on("click dblclick", (e) => {
        if (!defaultResponseTriggered) {
            e.stopPropagation();
            e.preventDefault();
            setTimeout(() => {
                if (window.getSelection) {
                    try {
                        var range = window.getSelection().getRangeAt(0);
                        var content = range.extractContents();
                        if (content.hasChildNodes()) {
                            var selection = document.createElement("selection");
                            selection.appendChild(content);
                            range.insertNode(selection);
                            clickResponse(selection);
                        } else {
                            clickResponse(e.target);
                        }
                    } catch (err) {
                        clickResponse(e.target);
                    }
                } else clickResponse(e.target);
            }, 100);
        }
    });
});

document.getElementsByTagName('html')[0].setAttribute('data-arachnode-stage-2', 'true');