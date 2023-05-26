const EXPIRATION_IN_MIN = 5;

var status_buffer = {};

function uploadData(data) {
    console.log(data);
}

chrome.storage.local.get(["arachnode_status"]).then((response) => {
    console.log(response);
    status_buffer = (response?.arachnode_status?.status_buffer ?? {});
    updatePopupContent();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && changeInfo.url == 'https://www.google.com') {
        uploadData({ action: 'publish', id: tabID, content: status_buffer[tabID]});
        delete status_buffer[tabID];
        message = 'New query on tab ' + tab.id.toString() + ' has been started.';
        status_buffer[tab.id] = [[message, (new Date()).toJSON()]];
        uploadData({ action: 'create', id: tabId, content: 'Tab created: ' + tab.id.toString() });
    } else if (changeInfo.url && !(/^chrome:\/\//).test(changeInfo.url)) {
        var message = "URL changed to '" + changeInfo.url + "'.";
        status_buffer[tabId].unshift([message, (new Date()).toJSON()]);
        uploadData({ action: 'append', id: tabId, content: 'URL changed: ' + changeInfo.url });
    } else if (changeInfo.title && changeInfo.title != 'New Tab') {
        var message = "Title changed to '" + changeInfo.title + "'.";
        status_buffer[tabId].unshift([message, (new Date()).toJSON()]);
        uploadData({ action: 'append', id: tabId, content: 'Title changed: ' + changeInfo.title });
    }
});

chrome.tabs.onRemoved.addListener((tabID, removeInfo) => {
    uploadData({ action: 'publish', id: tabId, content: status_buffer[tabID] });
    delete status_buffer[tabID];
});

chrome.tabs.onCreated.addListener((tab) => {
    message = 'New tab ' + tab.id.toString() + ' has been created.';
    status_buffer[tab.id] = [[message, (new Date()).toJSON()]];
    chrome.tabs.update(tab.id, { url: 'https://www.google.com/' });
});

function updatePopupContent() {
    for (var tab_id in status_buffer) {
        var msgs = status_buffer[tab_id];
        var i = 0;
        var l = msgs.length;
        while (i < l) {
            if ((new Date()).getTime() - (new Date(msgs[i][1])).getTime() >= EXPIRATION_IN_MIN * 60000) {
                msgs.splice(i, 1);
                l--;
            }
            i++;
        }
        status_buffer[tab_id] = msgs;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        for (var i = 0; i < tabs.length; i++) {
            var request = { type: "arachnode_status_req", id: tabs[i].id, msg: ((status_buffer[tabs[i].id] ?? [[]])[0]) };
            chrome.tabs.sendMessage(tabs[i].id, request).then((response) => {
                if (response?.type == 'arachnode_status_res') {
                    console.log(status_buffer);
                    if (!status_buffer.hasOwnProperty(response.id)) status_buffer[response.id] = [];
                    status_buffer[response.id].unshift([response.msg, (new Date()).toJSON()]);
                    chrome.storage.local.set({ arachnode_status: status_buffer });
                }
            });
        }
    });
    setTimeout(updatePopupContent, 500);
}