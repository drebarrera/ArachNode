function printMessage(msg) {
    document.getElementById('message').textContent = msg;
}

function updatePopupContent() {
    chrome.storage.local.get(["arachnode_status"]).then((response) => {
        console.log(response);
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            console.log(response.arachnode_status[tabs[0].id]);
            if (document.readyState == "complete" && response.arachnode_status[tabs[0].id]) {
                var messages = response.arachnode_status[tabs[0].id];
                var msgs = [];
                for (var i = 0; i < messages.length; i++) {
                    msgs.push(messages[i][1] + ":\n |---- " + messages[i][0]);
                }
                console.log(msgs.join("\n\n"));
                printMessage('\n' + msgs.join("\n\n"));
            } else {
                printMessage('Waiting on DOMContentLoaded...');
            }
        });
    });
    setTimeout(updatePopupContent, 100);
}

document.addEventListener('DOMContentLoaded', () => {
    updatePopupContent();
});