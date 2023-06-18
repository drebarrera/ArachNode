var arachnode_status = "ArachNode Connected!\nWaiting on browser activity.";
var arachnode_hierarchy = undefined;
var arachnode_on = undefined;

HTMLAnchorElement.prototype.originalAddEventListener = HTMLAnchorElement.prototype.addEventListener;

HTMLAnchorElement.prototype.addEventListener = (type, event, c) => {
    if (type == 'click') $(this).attr('data-clickable', 'true');
};

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
    var relevance_depth = parseInt(document.getElementsByTagName('html')[0].getAttribute('data-arachnode-relevance-depth'));
    $(document).find('*').each(function () {
        if ($.contains(this, elem)) {
            hierarchy.push(getAttributes(this, "ancestor"));
            last_ancestors.push(this);
            if (last_ancestors.length > relevance_depth) last_ancestors.shift();
        }
        else if (this == elem) {
            last_ancestors.push(this);
            for (var i = 0; i < relevance_depth; i++) {
                var current_ancestor = hierarchy.length - relevance_depth + i;
                var cousins = last_ancestors[i].children;
                var pre = true;
                for (var j = 0; j < cousins.length; j++) {
                    if (cousins[j] == last_ancestors[i + 1]) {
                        pre = false;
                        continue;
                    }
                    if (pre == false) {
                        hierarchy.splice(current_ancestor, 0, getAttributes(cousins[j], "cousin", relevance_depth - i - 1));
                        current_ancestor += 1;
                    }
                    else hierarchy.splice(current_ancestor + 1, 0, getAttributes(cousins[j], "cousin", relevance_depth - i - 1));
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

var clickedElements = [];
var clickResponseTriggered = false;
var defaultResponseTriggered = false;

function clickResponse(e) {
    if (!clickResponseTriggered) {
        clickResponseTriggered = true;
        var clickedElement = clickedElements[0];
        for (var i = 0; i < clickedElements.length; i++) {
            var subject = clickedElements[i];
            var hasChild = false;
            for (var j = i + 1; j < clickedElements.length; j++) {
                if ($.contains(subject, clickedElements[j])) {
                    hasChild = true;
                    break;
                }
            }
            if (!hasChild) {
                clickedElement = subject;
                break;
            }
        }
        console.log(clickedElement);
        element_html_shorthand = $(clickedElement).html();
        if (element_html_shorthand.length > 200) element_html_shorthand = element_html_shorthand.substring(0, 200) + '...';
        arachnode_status = "User clicked on '" + element_html_shorthand + "'";
        arachnode_hierarchy = getElementHierarchy(clickedElement);
        console.log(arachnode_hierarchy);
        clickedElements = [];
        setTimeout(() => {
            defaultResponseTriggered = true;
            $(e.target).trigger('click');
            if (e.target.href) window.location.href = e.target.href;
            clickResponseTriggered = false;
            setTimeout(() => {
                defaultResponseTriggered = false;
            }, 100)
        }, 2000);
    }
}

$(document).ready(function () {
    $(document).find('*').each(function () {
        if ($(this).hasOwnProperty('click') || $(this).is('[onclick]') || ($(this).is('a') && $(this).prop('href') || $(this).attr('data-clickable'))) $(this).attr('data-clickable', 'true');
        else $(this).attr('data-clickable', 'false');
        $(this).on("click dblclick", (e) => {
            if (arachnode_on) {
                clickedElements.push(this);
                if (!defaultResponseTriggered) {
                    e.preventDefault();
                    setTimeout(() => {
                        clickResponse(e);
                    }, 100);
                }
            }
        });
    });
});

document.getElementsByTagName('html')[0].setAttribute('data-arachnode-stage-2', 'true');