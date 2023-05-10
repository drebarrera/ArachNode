function getElementHierarchy(elem) {
    var hierarchy = [];
    $(document).find('*').each(function () {
        if ($.contains(this, elem)) hierarchy.push(getAttributes(this, "parent"));
        if (this == elem) hierarchy.push(getAttributes(this, "self"));
        if ($.contains(elem, this)) hierarchy.push(getAttributes(this, "child"));
        if ($(this).siblings().filter($(elem)).length > 0) hierarchy.push(getAttributes(this, "sibling"));
    });
    return JSON.stringify(hierarchy);
}

function getAttributes(elem, relationship) {
    var attrs = {};
    $.each(elem.attributes, function () {
        if (this.specified) {
            attrs[this.name] = this.value;
        }
    });
    attrs['data-entity'] = relationship;
    return attrs;
}

$(document).ready(function () {
    $(document).find('*').each(function () {
        $(this).click(function (e) {
            e.stopPropagation();
            console.log(getElementHierarchy(this));
        });
    });
});

document.getElementsByTagName('html')[0].setAttribute('data-arachnode-stage-2', 'true');