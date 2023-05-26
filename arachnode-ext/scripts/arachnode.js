var arachnode_status = "ArachNode Connected!\nWaiting on browser activity.";

/*window.addEventListener('message', function(event) {
    console.log(event.data);
    if (event.data?.type == 'arachnode_status_req' && arachnode_status != event.data.msg) {
        event.source.postMessage({type: 'arachnode_status_res', msg: arachnode_status});
    }
});*/

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type == 'arachnode_status_req' && arachnode_status != (message.msg ?? [undefined])[0]) {
        response = { type: "arachnode_status_res", id: message.id, msg: arachnode_status };
        console.log(response);
        sendResponse(response);
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
        if (this == elem) {
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
        if ($.contains(elem, this)) hierarchy.push(getAttributes(this, "descendant", -1));
        if ($(this).siblings().filter($(elem)).length > 0) hierarchy.push(getAttributes(this, "sibling", 0));
    });
    return JSON.stringify(hierarchy);
}

function extractSource() {
    var hierarchy = iterateElements(document.documentElement, 0, []);
    console.log(hierarchy);
}

function iterateElements(element, depth, hierarchy) {
    var children = element.children;
    hierarchy.push(getAttributes(element));
    for (var i = 0; i < children.length; i++) {
        iterateElements(children[i], depth + 1, hierarchy);
    }
    return hierarchy;
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
        console.log(clickedElements[0]);
        arachnode_status = "User clicked on '" + $(clickedElements[0]).html() + "'";
        console.log(getElementHierarchy(clickedElements[0]));
        clickedElements = [];
        setTimeout(() => {
            defaultResponseTriggered = true;
            $(e.target).trigger('click');
            clickResponseTriggered = false;
            setTimeout(() => {
                defaultResponseTriggered = false;
            }, 100)
        }, 1000);
    }
}

$(document).ready(function () {
    $(document).find('*').each(function () {
        if ($(this).hasOwnProperty('click') || $(this).is('[onclick]') || ($(this).is('a') && $(this).prop('href'))) $(this).attr('data-clickable', 'true');
        else $(this).attr('data-clickable', 'false');
        $(this).click((e) => {
            if (!defaultResponseTriggered) {
                e.stopPropagation();
                e.preventDefault();
                clickedElements.push(this);
                setTimeout(() => {
                    clickResponse(e);
                }, 100);
            }
        });
    });
});

document.getElementsByTagName('html')[0].setAttribute('data-arachnode-stage-2', 'true');