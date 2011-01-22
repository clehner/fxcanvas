/*
 * fxCanvas $(Version)
 *
 * Based on HTML5 Canvas spec
 *
 * Copyright (c) 2009 Evgen Burzak <buzzilo at gmail.moc>
 * Released under the MIT/X License
 */

// Reference:
//   http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html
//   http://dev.w3.org/html5/spec/the-canvas-element.html

$Unit(__PATH__, __FILE__, function(unit, root, glob){

  unit.Import("buz.fxcanvas.config", "platform", "w3c.DOMException");

  // common stuff
  unit.Package("buz.fxcanvas", function (group) {

    group.throwException = function(s) {
      //trace(s.toString())
      throw new unit.DOMException(s);
    };

    group.throwError = function(s) {
      //trace(s.toString())
      throw new Error(s);
    };

    // default context properties
    //
    group.defProp = {
      globalAlpha: 1.0,
      globalCompositeOperation: "source-over",
      strokeStyle: "rgb(0,0,0)",
      fillStyle: "rgb(0,0,0)",
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowBlur: 0,
      shadowColor: "rgba(0,0,0,.5)",
      lineWidth: 1,
      lineCap: "butt",
      lineJoin: "miter",
      miterLimit: 10,
      font: "10px sans-serif",
      textAlign: "start",
      textBaseline: "alphabetic"
    };

    // Safari requires each canvas to have a unique id.
    var lastCanvasUUID = 0;
    group.getCanvasUUID = function() {
      return "canvas-uuid-" + (lastCanvasUUID++);
    };

    group.getCanvasParams = function(canvas) {
      var _width = canvas.getAttribute("width"),
          _height = canvas.getAttribute("height"),
          _oncanvasframe = canvas.getAttribute("oncanvasframe"),
          _oncanvasresize = canvas.getAttribute("oncanvasresize"),
          _onload = canvas.getAttribute("onload"),
          _tracePathBounds = canvas.getAttribute("tracePathBounds"),
          _frameDuration = canvas.getAttribute("frameDuration");

      if (_tracePathBounds) {
        _tracePathBounds = _tracePathBounds.replace(/\s+/,''); // trim whitespaces
        switch(_tracePathBounds) {
          case 'true':
          case 'yes':
          case '1':
            _tracePathBounds = true; break;
          case 'false':
          case 'no':
          case '0':
            _tracePathBounds = false; break;
          default:
            _tracePathBounds = null; break;
        }
      }

      return {
        width : _width && Number(_width),
        height : _height && Number(_height),
        id : canvas.getAttribute("id"),
        frameDuration : _frameDuration && parseInt(_frameDuration),
        tracePathBounds : _tracePathBounds,
        oncanvasframe : _oncanvasframe && Function(_oncanvasframe),
        oncanvasresize : _oncanvasresize && Function(_oncanvasresize),
        onload : _onload && Function(_onload),
        offsetLeft : canvas.offsetLeft,
        offsetTop : canvas.offsetTop
      };
    };

    // initialize canvas elements prior to onload event
    //
    unit.Event.once("initialize", function() {

      // IE fix 
      //group._DOMException = DOMException;

      if (unit.config.enable) {
        group.backend.initialize();
      }
    });

    group.initialize = function() {
      group.backend.initialize()
    };

    group.initElement = function(el) {
      group.backend.initElement(el)
    };

    // this way generated lots of problems... I leave it here for history.
    /*
    var lastScriptID = 0;
    function loadScript(src) {
      var head = document.getElementsByTagName("head")[0];
      var script = document.createElement('script');
      script.id = 'script-uuid-' + (lastScriptID++);
      script.type = 'text/javascript';
      script.src = src;
      head.appendChild(script);
    }

    if (!window.$__debug) {
      if(self.browser.isIE) 
        loadScript(self.script_path + self.config.flashBackendJS)
      else
        loadScript(self.script_path + self.config.canvasBackendJS)
      }
      */

  }); 
})
