var arachnode_on = undefined;
var allow_toggle = true;

function printMessage(msg) {
    document.getElementById('message').textContent = msg;
}

function updatePopupContent() {
    console.log(arachnode_on);
    if (arachnode_on) {
        chrome.storage.local.get(["arachnode_status"]).then((response) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (document.readyState == "complete" && response.arachnode_status.status_buffer[tabs[0].id]) {
                    var messages = response.arachnode_status.status_buffer[tabs[0].id];
                    var msgs = [];
                    for (var i = 0; i < messages.length; i++) {
                        msgs.push(messages[i][1] + ":\n |---- " + messages[i][0]);
                    }
                    printMessage('\n' + msgs.join("\n\n"));
                } else {
                    printMessage('Waiting on DOMContentLoaded...');
                }
            });
        });
    }
    setTimeout(updatePopupContent, 100);
}

function arachnodePopupToggle() {
    if (arachnode_on) {
        document.querySelector('#arachnode_toggle_status').textContent = "Enabled";
        document.querySelector('#arachnode_toggle_icon').style.display = "inline";
    } else {
        document.querySelector('#arachnode_toggle_status').textContent = "Disabled";
        document.querySelector('#arachnode_toggle_icon').style.display = "none";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    var v = chrome.runtime.getManifest().version;
    document.querySelector('#arachnode_version').textContent = ' v.' + v;
    chrome.storage.local.get(["arachnode_toggle"]).then((response) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            arachnode_on = response.arachnode_toggle[tabs[0].id];
            document.querySelector('#arachnode_switch input').checked = response.arachnode_toggle[tabs[0].id];
            arachnodePopupToggle();
            updatePopupContent();
        });
    });
    chrome.storage.local.get(["arachnode_status"]).then((response) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (document.readyState == "complete" && response.arachnode_status.status_buffer[tabs[0].id]) {
                var messages = response.arachnode_status.status_buffer[tabs[0].id];
                for (var i = 0; i < messages.length; i++) {
                    if (messages[i][0].split(': ')[0] == 'Search intention changed to') {
                        document.querySelector('#search_box').value = messages[i][0].split(': ')[1];
                        document.querySelector('#search_box').style.border = '3px solid #2196F3';
                        break;
                    } 
                }
            }
        });
    });
    document.querySelector('#arachnode_switch').addEventListener("click", (e) => {
        if (allow_toggle) {
            allow_toggle = false;
            setTimeout(() => {
                arachnode_on = document.querySelector('#arachnode_switch input').checked;
                arachnodePopupToggle();
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { type: "arachnode_toggle", id: tabs[0].id, msg: arachnode_on });
                    chrome.runtime.sendMessage({ type: "arachnode_toggle", id: tabs[0].id, msg: arachnode_on });
                    allow_toggle = true;
                });
            }, 100);
        }
    });
    document.querySelector('#search').addEventListener("click", (e) => {
        if (document.querySelector('#search_box').value) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.runtime.sendMessage({ type: "arachnode_intention", id: tabs[0].id, msg: document.querySelector('#search_box').value });
                document.querySelector('#search_box').style.border = '3px solid #2196F3';
            });
        }
    });
    document.querySelector('#search_box').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                alert('Intention set: ' + document.querySelector('#search_box').value);
                chrome.runtime.sendMessage({ type: "arachnode_intention_quiet", id: tabs[0].id, msg: document.querySelector('#search_box').value });
                document.querySelector('#search_box').style.border = '3px solid #2196F3';
            });
        }
    });
});