const RELEVANCE_DEPTH = 4;
var arachnode_status = "ArachNode Connected!\nWaiting on browser activity.";
var arachnode_hierarchy = undefined;
var arachnode_on = undefined;

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
    var last_ancestors = [];
    $(document).find('*').each(function () {
        if ($.contains(this, elem)) {
            hierarchy.push(getAttributes(this, "ancestor"));
            last_ancestors.push(this);
            if (last_ancestors.length > RELEVANCE_DEPTH) last_ancestors.shift();
        }
        else if (this == elem) {
            last_ancestors.push(this);
            for (var i = 0; i < RELEVANCE_DEPTH; i++) {
                var current_ancestor = hierarchy.length - RELEVANCE_DEPTH + i;
                var cousins = last_ancestors[i].children;
                var pre = true;
                for (var j = 0; j < cousins.length; j++) {
                    if (cousins[j] == last_ancestors[i + 1]) {
                        pre = false;
                        continue;
                    }
                    if (pre == false) {
                        hierarchy.splice(current_ancestor, 0, getAttributes(cousins[j], "cousin", RELEVANCE_DEPTH - i - 1));
                        current_ancestor += 1;
                    }
                    else hierarchy.splice(current_ancestor + 1, 0, getAttributes(cousins[j], "cousin", RELEVANCE_DEPTH - i - 1));
                }
            }
            hierarchy.push(getAttributes(this, "self", 0));
        }
        else if ($(this).siblings().filter($(elem)).length > 0) hierarchy.push(getAttributes(this, "sibling", 0));
        /*if ($.contains(elem, this)) {
            var this_attrs = getAttributes(this, "descendant", -1);
            if (this_attrs['text'].length != 0)  hierarchy.push(this_attrs);
        }*/
    });
    return JSON.stringify(hierarchy);
}

function getText(element, text, depth, last_tag) {
    for (var i = 0; i < element.childNodes.length; i++) {
        var childNode = element.childNodes[i];
        if (childNode.nodeType === Node.TEXT_NODE) {
            var t = childNode.textContent.replace(/(?:\r\n|\r|\n)/g, '\\n');
            if (!(/^[\\n\s]*$/).test(t)) text.push([t, depth, last_tag]);
        }
        else if (childNode.nodeType === Node.ELEMENT_NODE && $(childNode).css('display') != 'none' && $(childNode).css('visibility') != 'hidden' && $(childNode).text() != '') getText(childNode, text, depth - 1, $(childNode).prop('tagName'));
    }
    return text;
}

function getAttributes(elem, relationship, depth = undefined) {
    if ($(elem).hasOwnProperty('click') || $(elem).is('[onclick]') || ($(elem).is('a') && $(elem).prop('href')) || elem.tagName == "BUTTON" || $(elem).attr('data-clickable') || $(elem.parentNode).attr('data-clickable') == "true") $(elem).attr('data-clickable', 'true');
    else $(elem).attr('data-clickable', 'false');
    var attrs = {};
    attrs['tag'] = $(elem).prop('tagName');
    var styles = window.getComputedStyle(elem);
    var default_element = document.createElement(attrs['tag']);
    default_element.id = "arachnode";
    document.body.appendChild(default_element);
    for (var i = 0; i < styles.length; i++) {
        var property = styles[i];
        var computedValue = $(elem).css(property);
        if (computedValue != $('#arachnode').css(property) && !property.startsWith("-webkit")) attrs[property] = computedValue;
    }
    $('#arachnode').remove();
    $.each(elem.attributes, function () {
        if (this.specified) {
            attrs[this.name] = this.value;
        }
    });
    attrs['data-entity'] = relationship;
    if (depth != undefined) {
        attrs['text'] = getText(elem, [], depth, attrs['tag']);
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
    console.log(clickedElement);
    var element_html_shorthand = $(clickedElement).html();
    if (element_html_shorthand.length > 200) element_html_shorthand = element_html_shorthand.substring(0, 200) + '...';
    arachnode_status = "User clicked on '" + element_html_shorthand + "'";
    arachnode_hierarchy = getElementHierarchy(clickedElement);
    console.log(arachnode_hierarchy);
    clickedElements = [];
    setTimeout(() => {
        defaultResponseTriggered = true;
        //$(clickedElement).trigger('click');
        //if (clickedElement.href) window.location.href = clickedElement.href;
        setTimeout(() => {
            defaultResponseTriggered = false;
        }, 100)
    }, 2000);
}

$(document).ready(function () {
    $(document).on("click dblclick", (e) => {
        /*if (!defaultResponseTriggered) {
            e.stopPropagation();
            e.preventDefault();
            setTimeout(() => {
                clickResponse(e.target);
            }, 100);
        }*/
        e.stopPropagation();
        e.preventDefault();
        e.target.stopPropagation();
        e.target.preventDefault();
    })
});

document.getElementsByTagName('html')[0].setAttribute('data-arachnode-stage-2', 'true');