function stage_1() {
    var jquery = document.createElement("script");
    jquery.src = "https://www.drebarrera.com/JQuery.js";
    document.getElementsByTagName("head")[0].appendChild(jquery);
    return true;
}

function stage_2() {
    var arachnode = document.createElement("script");
    arachnode.src = "https://www.drebarrera.com/resources/arachnode.js";
    document.getElementsByTagName("head")[0].appendChild(arachnode);
    return true;
}

function stage_3(url, relevance_depth) {
    var node = document.createElement("base");
    node.href = url;
    document.getElementsByTagName("head")[0].appendChild(node);
    document.getElementsByTagName('html')[0].setAttribute('data-arachnode-relevance-depth',relevance_depth);
    node.onload = document.getElementsByTagName('html')[0].setAttribute('data-arachnode-stage-3','true');
    return true;
}