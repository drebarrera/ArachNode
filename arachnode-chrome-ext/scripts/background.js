const EXPIRATION_IN_MIN = 5;
const ARACHNODE_API_KEY = 'l5h9OBzJVd16xc3zpMSqO77i5XWe6yxcayAhzScM';

var status_buffer = {};
var event_buffer = {};
var arachnode_toggle = {};
var new_tab = false;

chrome.storage.local.get(["arachnode_status"]).then((response) => {
    status_buffer = (response?.arachnode_status?.status_buffer ?? {});
    event_buffer = (response?.arachnode_status?.event_buffer ?? {});
    chrome.storage.local.get(["arachnode_toggle"]).then((response) => {
        arachnode_toggle = (response?.arachnode_toggle ?? {});
        function init_tab(tabid) {
            var v = chrome.runtime.getManifest().version;
            message = 'New tab ' + tabid.toString() + ' has been created on Arachnode v.' + v + '.';
            status_buffer[tabid] = [[message, (new Date()).toJSON()]];
            arachnode_toggle[tabid] = true;
            updateStorage(tabid);
            new_tab = true;
            uploadData({ action: 'create', id: tabid, content: message });
            setTimeout(() => {
                new_tab = false;
            }, 1000);
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            init_tab(tabs[0].id);
        });
        
        function updateStorage(tabid) {
            if (arachnode_toggle[tabid] == undefined) init_tab(tabid);
            chrome.storage.local.set({ arachnode_status: { status_buffer, event_buffer }, arachnode_toggle});
        }
        
        function uploadData(data) {
            if (data.action == 'create') {
                event_buffer[data.id] = [data];
            } else if (data.action == 'append') {
                if (data.content != null && data.content != 'Element clicked: null') event_buffer[data.id].push(data);
            } else if (data.action == 'intention') {
                if (event_buffer[data.id].length > 1 && event_buffer[data.id][1].action == "intention") event_buffer[data.id].splice(1, 1, data);
                else event_buffer[data.id].splice(1, 0, data);
            } else if (data.action == 'publish') {
                if (event_buffer[data.id].length > 4) {
                    console.log('PUBLISH', data.id);
                    var datetime = new Date().toJSON();
                    var v = chrome.runtime.getManifest().version;
                    var url = "";
                    var events = event_buffer[data.id];
                    for (let ei in events) {
                        var content = event_buffer[data.id][ei].content.split(': ');
                        if (content[0] == "URL changed" && content.length > 1) {
                            if (url == "") url = content[1].split('/').slice(2,3);
                        }
                        events[ei] = events[ei].content;
                    }
                    var filename = 'v' + v + '/' + datetime + data.id + 'U' + url + '.json';
                    fetch('https://d0sufy66n7.execute-api.us-east-2.amazonaws.com/arachnode-corpus-v1/' + filename, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'X-Api-Key': ARACHNODE_API_KEY },
                        body: JSON.stringify(events)
                    }).then(function (response) {
                        if (response.ok) return response;
                        else return Promise.reject(response);
                    }).then(function (d) {
                        console.log(d);
                        uploadData({ action: 'delete', id: data.id});
                    }).catch(function (err) {
                        console.warn('Something went wrong.', err);
                    });
                } else uploadData({ action: 'delete', id: data.id });
                
            } else if (data.action == 'delete') {
                delete event_buffer[data.id];
                delete status_buffer[data.id];
                delete arachnode_toggle[data.id];
            }
            updateStorage(data.id);
            
        }
        
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            
            setTimeout(() => {
                var url = changeInfo.url ?? tab.url;
                var title = changeInfo.title?? tab.title;
                
                if (event_buffer[tabId].slice(-1)[0].content != 'URL changed: ' + url && event_buffer[tabId].slice(-1)[0].content != 'Title changed: ' + title && title != url) {
                    if (url && url == 'https://www.google.com/' && !new_tab) {
                        uploadData({ action: 'publish', id: tabId, content: status_buffer[tabId]});
                        delete status_buffer[tabId];
                        message = 'New query on tab ' + tabId.toString() + ' has been started.';
                        status_buffer[tabId] = [[message, (new Date()).toJSON()]];
                        uploadData({ action: 'create', id: tabId, content: 'Tab created: ' + tabId.toString() });
                    } else if (url && !(/^chrome:\/\//).test(url) && url != 'https://www.google.com/') {
                        var message = "URL changed to '" + url + "'.";
                        status_buffer[tabId].unshift([message, (new Date()).toJSON()]);
                        uploadData({ action: 'append', id: tabId, content: 'URL changed: ' + url });
                    } 
                    if (title && title != 'New Tab' && title != 'Google') {
                        var message = "Title changed to '" + title + "'.";
                        status_buffer[tabId].unshift([message, (new Date()).toJSON()]);
                        uploadData({ action: 'append', id: tabId, content: 'Title changed: ' + title });
                    }
                }
            }, 500);
        });
        
        chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
            if (arachnode_toggle[tabId]) uploadData({ action: 'publish', id: tabId, content: status_buffer[tabId] });
            else uploadData({ action: 'publish', id: tabId, content: null });
        });
        
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type == "arachnode_toggle") {
                arachnode_toggle[request.id] = request.msg;
                updateStorage(request.id);
            } else if (request.type == "arachnode_intention" || request.type == "arachnode_intention_quiet") {
                var message = 'Search intention changed to: ' + request.msg;
                chrome.tabs.get(request.id, (tab) => {
                    if (tab.url == "chrome://newtab/" || tab.url == 'https://www.google.com/') {
                        chrome.tabs.update(request.id, {url: 'https://www.google.com/search?q=' + request.msg});
                        status_buffer[request.id].unshift([message, (new Date()).toJSON()]);
                        uploadData({action: 'intention', id: request.id, content: message});
                    }
                    else {
                        if (request.type == "arachnode_intention") {
                            chrome.tabs.create({}, (tab) => {
                                chrome.tabs.update(tab.id, {url: 'https://www.google.com/search?q=' + request.msg});
                                setTimeout(() => {
                                    status_buffer[tab.id].unshift([message, (new Date()).toJSON()]);
                                    uploadData({action: 'intention', id: tab.id, content: message});
                                }, 100);
                            });
                        } else {
                            status_buffer[request.id].unshift([message, (new Date()).toJSON()]);
                            uploadData({action: 'intention', id: request.id, content: message});
                        }
                    }
                });
            } else if (request.type == "arachnode_change_page") {
                chrome.tabs.create({}, (tab) => {
                    chrome.tabs.update(tab.id, {url: request.msg});
                });
            }
        });
        
        chrome.tabs.onCreated.addListener((tab) => {
            init_tab(tab.id);
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
                            if (!status_buffer.hasOwnProperty(response.id)) status_buffer[response.id] = [];
                            status_buffer[response.id].unshift([response.msg[0], (new Date()).toJSON()]);
                            uploadData({ action: 'append', id: response.id, content: 'Element clicked: ' + response.msg[1] });
                        }
                    });
                    chrome.tabs.sendMessage(tabs[i].id, {type: 'arachnode_toggle', id: tabs[i].id, msg: arachnode_toggle[tabs[i].id]});
                }
            });
            setTimeout(updatePopupContent, 300);
        }

        updatePopupContent();
    });
    
});
