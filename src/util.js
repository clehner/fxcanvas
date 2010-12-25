/*
 * util.js
 *
 * Copyright (c) 2010 Evgen Burzak <buzzilo at gmail.moc>
 * Released under the MIT/X License
 */
$Package("buz.util", function(__group__){

  // hello -> Hello
  __group__["capitalize"] = function (word) {
    return word.substr(0, 1).toUpperCase() + word.substr(1);
  };

  var that = $Import({}, "platform");

__group__.propertyChangeListener = function(el, property, func)
{
    var handler = function(evt){
        //trace("changed:" + evt.attrName, property, evt.target.tagName, evt.target.id)
        if(evt.attrName == property)
            func(evt)
    }

    if(that.platform.webkit) {
        var prevValue = el[property]
        var newValue
        setInterval(function(){
            newValue = el[property]
            if(prevValue != newValue) {
                handler({
                    target : el,
                    attrName: property, 
                    prevValue: prevValue,
                    newValue: newValue
                })
                prevValue = newValue
            }
        }, 10 + Math.round(Math.random() * 100))
    } else {
        el.addEventListener("DOMAttrModified", handler, false);
    }
}

});
