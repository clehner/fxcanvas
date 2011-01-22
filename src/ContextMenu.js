/*
 * context menu for Canvas element in Internet Explorer
 * todo others
 *
 * Copyright (c) 2010 Evgen Burzak <buzzilo at gmail.moc>
 * Released under the MIT/X License
 */
$Unit(__PATH__, __FILE__, function(unit, doc)
{
  unit.Import("platform");

  unit.Package("buz.fxcanvas", function(group) {
    
    if(!unit.platform.isIE) return;

    var lang = navigator.browserLanguage,
        defLang = "en",
        // stupid fix for IE6 (or fix for stupid IE6)
        IE6fix = (unit.platform.ie <= 6) || (doc.documentMode < 7) || "";

    var defStyle = {
      background: "Menu",
      menuText: "MenuText",
      greyText: "GreyText",
      border: "ButtonShadow",
      highlight: "Highlight",
      highlightText: "HighlightText",
      font: "normal 8pt Tahoma, Arial" // is there shortcut for current system font?
    };

    var menuEntryPadLeft = 24, menuEntryPadRight = 5;
    var css = [
      "CanvasContextMenu{",
        // note: actually there is no padding, there should be 3d border if theme is classic
        // (but in new windows themes menus are flatten, so then who cares?)
        "margin:0px;", "padding:2px;", 
        "background-color:", defStyle.background, ";",
        "border:1px solid ", defStyle.border, ";",
        "position:absolute;",
        "top:0px;",
        "left:0px;",
        "zIndex:999;",
        "float:none;",
        "overflow:visible;",
        "display:block;",
        "clear:both;",
        "color:", defStyle.menuText, ";",
        "font:", defStyle.font, ";",
        "height:1px;", // will calculated in constructor
        IE6fix && "width:0;",
      "}",
      "CanvasContextMenuEntry{",
        "text-align:left;", "margin:0px;", 
        "padding:2px ",menuEntryPadRight,"px 0px ",menuEntryPadLeft,"px;",
        "color:", defStyle.menuText, ";",
        "white-space:nowrap;",
        "cursor:default;",
        "float:none;",
        "display:block;",
        "overflow:visible;",
        "border:0;",
        "background-color:", defStyle.background, ";",
        "height:",IE6fix ? 19 : 16,"px;",
        "font:", defStyle.font, ";",
        IE6fix && ["float:left", "clear:left", "width:0"].join(";"),
      "}",
      IE6fix && "CanvasContextMenu hr{",
        [
          "float:left", 
          "clear:left", 
          "padding:0",
          "margin:3px 0px 0px 0px",
          "height:0px"
        ].join(";"),
      "}"
    ].join("");

    //console.log(css)
    doc.createStyleSheet().cssText = css;

    function ContextMenu (config, handlers) {
      var menu = this.menuEl = doc.createElement("CanvasContextMenu");
      this.config = config;
      this.handlers = handlers;
      var menuHeight = 0;
      this.selectedElement = null;
      this.elements = [];

      var entry, entryEl;
      for(var i=0; i<config.length; i++) {
        var entry = config[i];
        if (typeof entry == "string" && entry.match(/[\-]+/)) { // separator
          entryEl = doc.createElement("hr");
          menuHeight += 13;
        } else {  // menu entry
          var id = entry.id,
              entryHandler = handlers[id],
              label = entry.label[lang] || entry.label[defLang] || "<entry>";
          entryEl = doc.createElement("CanvasContextMenuEntry");
          entryEl.onmouseenter = function () {
            this.contextMenu.selectedElement = this;
            this.style.background = defStyle.highlight;
            this.style.color = defStyle.highlightText;
          };
          entryEl.onmouseleave = function () {
            this.contextMenu.selectedElement = null;
            this.style.background = defStyle.background;
            this.style.color = defStyle.menuText;
          };
          entryEl.style.background = defStyle.background;
          entryEl.innerHTML = entryEl.label = label;
          entryEl.contextMenu = this;
          entryEl.entryHandler = entryHandler;
          menuHeight += IE6fix ? 20 : 18;
        }
        menu.appendChild(entryEl);
        this.elements.push(entryEl);
      }
      menu.style.height = menuHeight + "px";
    };

    ContextMenu.prototype = {
      "hide" : function () {},
      "show" : function (x, y) {
        var that = this;
        if (that.selectedElement) return;
        var onDocMouseDown = function() { 
          doc.detachEvent("onmousedown", onDocMouseDown);
          var selElement = that.selectedElement;
          if (selElement) {
            if (selElement.entryHandler)
              selElement.entryHandler();
            selElement.style.background = defStyle.background;
            selElement.style.color = defStyle.menuText;
            that.selectedElement = null;
          }
          try {
            doc.body.removeChild(that.menuEl);
          } catch(e){}
        };
        this.menuEl.style.top = y + "px";
        this.menuEl.style.left = x + "px";
        doc.body.appendChild(this.menuEl);
        if (IE6fix) {
          var widths = [];
          for(var i=0; i<this.elements.length; i++) {
            widths.push(this.elements[i].offsetWidth);
          }
          widths.sort();
          maxWidth = widths.pop();
          var el;
          for(var i=0; i<this.elements.length; i++) {
            el = this.elements[i];
            el.style.minWidth = 
            el.style.width = (maxWidth - (el.tagName === "HR" ?
                0 : menuEntryPadRight + menuEntryPadLeft)) + "px";
          }
          this.menuEl.style.width = maxWidth + "px";
        }
        doc.attachEvent("onmousedown", onDocMouseDown);
      }
    };

    group.ContextMenu = ContextMenu;
  });
});
