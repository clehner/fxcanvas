/*
 * Canvas-powered rendering backend
 *
 * Copyright (c) 2010 Evgen Burzak <buzzilo at gmail.moc>
 * Released under the MIT/X License
 */
$Unit(__PATH__, __FILE__, function(unit, root, glob){

  $Import(unit,
    "buz.util.*",
    "buz.fxcanvas.*"
  );

  $Package("buz.fxcanvas.backend", function(group) {

    var slice = Array.prototype.slice;

    // index in __canvasElement array
    unit.lastCanvasID = 0;

    // in Firefox it is impossible to extend rendering context, so I'll do that
    // inside getContext() 
    group.CanvasRenderingBackend2D = 
    {
      "_invoke" : function (_args) {
        var cmd = _args[0],
            dataHandler = _args[_args.length-1], 
            args = slice.call(_args, 1, _args.length-1);

        var _data, ext = this._ext;

        if (cmd == "putImageData" && !ext._useRawImageData) {
          args[0] = args[0].__toCanvasData(this);
        }

        if (cmd == "getImageData")  {
          if(args.length == 1) // arg[0] is rectangle
            args = [args[0].x, args[0].y, args[0].width, args[0].height]
          _data = this[cmd].apply(this, args)
          if(ext._useRawImageData)
            _data = new unit.ImageData(_data.width, _data.height, _data.data, ext._useRawImageData)
          else
            _data = (new unit.ImageData(1, 1)).__fromCanvasData(_data);
        }
        else 
          _data = this[cmd].apply(this, args);

        setTimeout(dataHandler, this.canvas.__frameDuration, _data);
      },

      "dummy" : function () {
        // dummy
      },

      "appendPath" : function(_path) {
        for(var i=0; i<_path._stack.length; i++) {
          var args = _path._stack[i][1],
              cmd = _path._stack[i][0];
          this[cmd].apply(this, args)
        }
      }
    };

    group.extendContext = function(canvas) {
      // save native context
      canvas.__native_getContext = canvas.getContext;

      // and replace with extended
      canvas.__fx_context_2d = null;
      canvas.getContext = function (contextId) {
        if (contextId != "2d") return this.__native_getContext(contextId);
        // tests shows that native getContext() always returns the same object
        if (!this.__fx_context_2d) {
          var ctx = this.__native_getContext(contextId);
          this.__fx_context_2d = new unit.extCanvasRenderingContext2D(this, ctx);
          ctx._ext = this.__fx_context_2d;
          unit.updateObject(ctx, group.CanvasRenderingBackend2D);
        }
        return this.__fx_context_2d;
      };

      // stubs for modest browser
      //
      canvas.__native_toDataURL = canvas.toDataURL;
      canvas.toDataURL = function () {
        var a = arguments, 
            type = a[0],
            args = slice.call(a, 0, a.length-1),
            dataHandler = a[a.length-1],
            data = this.__native_toDataURL.apply(this, args),
            canvas = this;

        setTimeout(dataHandler, this.__frameDuration, data);

        return null;
      };

      canvas.loadImage = function () {
        if (!arguments.length) return;
        var args = slice.call(arguments, 0), 
            canvas = this;

        var arg = args.pop(), 
            src = typeof arg == "object" ? arg.src : arg;

        if(arg.tagName == "CANVAS") {
          if (typeof canvas.onload == 'function') {
            canvas.onload(arg);
          }
          if (args.length)
            canvas.loadImage.apply(canvas, args);
        }
        else {
          var img = new Image();
          img.onload = function () {
            if (typeof canvas.onload == 'function') {
              canvas.onload(img);
            }
            if (args.length)
              canvas.loadImage.apply(canvas, args);
          }
          img.src = src;
        }
      };

      canvas.__defineSetter__("frameDuration", function(dur) {
        this.__frameDuration = Math.abs(parseInt(dur));
        // restart frame loop
        this.oncanvasframe = this.__onFrame;
      });
      canvas.__defineGetter__("frameDuration", function() {
        return this.__frameDuration;
      });
      canvas.__defineSetter__("tracePathBounds", function(val) {
        this.__tracePathBounds = val;
      });
      canvas.__defineGetter__("tracePathBounds", function() {
        return this.__tracePathBounds;
      });

      // frame loop controls
      //
      canvas.__onFrame = canvas.__frameIntId = null;
      canvas.__defineSetter__("oncanvasframe", function(oncanvasframe) {
        clearInterval(this.__frameIntId);
        if (!oncanvasframe) {
          this.__onFrame = null;
        } else {
          this.__onFrame = oncanvasframe;
          this.__frameIntId = setInterval(this.__onFrame, this.__frameDuration, 0);
        }
      });
      canvas.__defineGetter__("oncanvasframe", function() {
        return this.__onFrame;
      });

      // default event handlers
      canvas.onload = null;
      canvas.oncanvasframe = null;

      canvas.getBackend = function(backendId){
        return this.__native_getContext(backendId);
      };

    };

    //
    group.initialize = function() {
      group.extendContext(HTMLCanvasElement.prototype);

      // the same trick for modest browser 
      document.__native_createElement = document.createElement;
      document.createElement = function(el) {
        var domEl = document.__native_createElement(el);
        if(domEl.nodeName === "CANVAS")
          group.initElement(domEl);
        return domEl;
      }

      var els = document.getElementsByTagName("canvas"), canvas;

      for (var i=0; i<els.length; i++) {
        canvas = els[i];
        group.initElement(canvas);
      }
    };

    group.initElement = function(canvas){
      if (!canvas.id) canvas.id = unit.getCanvasUUID();

      if(!("__fx_context_2d" in canvas)) 
        group.extendContext(canvas)

      var onresize = function(canvas){
        if(canvas.oncanvasresize) 
          canvas.oncanvasresize()
      };

      var intId;
      var _onresize = function(evt){
        if(evt.attrName == 'width' || evt.attrName == 'height') {
          clearTimeout(intId)
          intId = setTimeout(onresize, 10 + Math.round(Math.random() * 100), canvas);
        }
      };

      unit.propertyChangeListener(canvas, "width", _onresize);
      unit.propertyChangeListener(canvas, "height", _onresize);

      // set canvas parameters from tag attributes
      //
      var params = unit.getCanvasParams(canvas);
      if(params.frameDuration) 
        canvas.frameDuration = params.frameDuration;
      if(typeof params.tracePathBounds === "boolean") 
        canvas.tracePathBounds = params.tracePathBounds;
      if(params.onload) 
        canvas.onload = params.onload;
      if(params.oncanvasframe) 
        canvas.oncanvasframe = params.oncanvasframe;

      window.__canvasElement[unit.lastCanvasID++] = canvas;
    };

    window.__canvasElement = [];
  });
});
