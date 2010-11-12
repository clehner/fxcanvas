/*
 * extended Canvas rendering context
 *
 * Copyright (c) 2010 Evgen Burzak <buzzilo at gmail.moc>
 * Released under the MIT/X License
 */
$Unit(__PATH__, __FILE__, function(unit){

  $Import(unit,
    "browser",
    "geom.*", 
    "buz.fxcanvas.config"
  );

  $Package("buz.fxcanvas", function(group) {

    var slice = Array.prototype.slice;

    // There are a few extends:
    //
    //   chaining operations, set<context property>(), eg.: 
    //       ctx.setFillStyle("#fff")
    //          .setStrokeStyle("#000")
    //          .strokeRect(10, 10, 100, 100)
    //          .fillRect(10, 10, 100, 100)
    //          .invoke("getImageData", 0, 0, 100, 100, function (imageData) {
    //            // ...
    //          });
    //
    //   public property transformMatrix
    //   public drawing method vectorTo()
    //   public method isPointInPathBounds()
    //   public method getPathBounds()
    //   public method ifPointInPath()
    //   public method createPath()
    //   public method appendPath()
    //   public method clonePath()
    //   public method clear()
    // 

    // class extCanvasRenderingContext2D
    //
    group.extCanvasRenderingContext2D = function (canvas, backend) 
    {
      // internals
      //
      this._isFlashBackend = unit.browser.isIE
      // backend: flash or canvas
      this._backend = backend;
      // path bounds
      this._bounds = new Bounds;
      this._tracePathBounds = unit.config.tracePathBounds;
      this._stateStack = [];
      this._pathStack = [];
      this._useRawImageData = false;

      this.canvas = canvas;

      unit.Matrix.prototype._transform = function (args) {
        // todo it's a quite complicated part...
      };
      unit.Matrix.prototype._setTransform = function (args) {
        // todo it's a quite complicated part...
        this.a = args[0];
        this.c = args[1];
        this.b = args[2];
        this.d = args[3];
        this.tx = args[4];
        this.ty = args[5];
      };
      unit.Matrix.prototype._dump = function () {
        return [this.a, this.b, this.c, this.d, this.tx, this.ty].join(",");
      };
      this.transformMatrix = new unit.Matrix;

      // sadly, setters and getters are not working in IE ..
      //
      if (!this._isFlashBackend) {
        for( var property in group.defProp) {

          // set property
          this.__defineSetter__(property, (function(prop) {
            return function (val) {
              this._backend[prop] = val;
            };
          })(property));

          // get property
          this.__defineGetter__(property, (function(prop) {
            return function () {
              return this._backend[prop];
            };
          })(property));
        }
      }
    };

    //
    group.extCanvasRenderingContext2D.prototype = {

      // CanvasRenderingContext2D interface + extends

      "canvas" : null,

      // path

      "clearRect" : function (rect, y, width, height) {
        var x;
        if (arguments.length == 1) {
          x = rect.x
          y = rect.y
          width = rect.width
          height = rect.height
        }
        else
          x = rect
        this._backend.clearRect(x, y, width, height);
        return this;
      },
      
      "fillRect": function (rect, y, width, height) {
        var x;
        if (arguments.length == 1)
          x = rect.x,
          y = rect.y,
          width = rect.width,
          height = rect.height;
        else
          x = rect;
        this._backend.fillRect(x, y, width, height);
        return this;
      },

      "strokeRect": function (rect, y, width, height) {
        var x;
        if (arguments.length == 1) {
          x = rect.x
          y = rect.y
          width = rect.width
          height = rect.height
        }
        else
          x = rect
        this._backend.strokeRect(x, y, width, height);
        return this;
      },

      "closePath" : function () {
        this._backend.closePath();
        return this;
      },

      "beginPath" : function () {
        this._path = this.createPath();
        if (this._tracePathBounds)
          this._bounds.clear()
        this._backend.beginPath();
        return this;
      },

      "moveTo" : function (x, y) {
        //this._path.moveTo(x, y)
        if (this._tracePathBounds)
          this._bounds.addKnot(x, y)
        this._backend.moveTo(x, y);
        return this;
      },

      "lineTo" : function (x, y) {
        //this._path.lineTo(x, y)
        if (this._tracePathBounds)
          this._bounds.addKnot(x, y);
        this._backend.lineTo(x, y);
        return this;
      },

      "arcTo": function(x1, y1, x2, y2, radius) {
        //this._path.arcTo(x1, y1, x2, y2, radius)
        if (this._tracePathBounds)
          this._bounds.addKnot(x1, y1);
        this._backend.arcTo(x1, y1, x2, y2, radius);
      },

      "vectorTo" : function (x, y, arrowSize) {
        // todo x, y - vector coordinates:
        // ... lineTo(this.lastX + x, this.lastY + y)
        //this._path.vectorTo(x, y, arrowSize)
        this._backend.lineTo(x, y);
        return this;
      },

      "__drawTestPoint" : function (x, y, text) {
          this.fillStyle = "#f00"
          var s = 5;
          this.fillRect(x - (s / 2), y - (s / 2), s, s)
          this.fillStyle = "#fff"
          if (text)
            this.fillText(text, x + 5, y + 5)
      },

      "quadraticCurveTo": function(cpx, cpy, x, y) {
        //this._path.quadraticCurveTo(cpx, cpy, x, y)
        if (this._tracePathBounds) {
          // 
          var v1 = (new unit.Point(this._bounds.x0, this._bounds.y0)).vectorTo(x, y),
              v2 = (new unit.Point(x + (v1.x / 2), y + (v1.y / 2))).vectorTo(cpx, cpy);

          this._bounds.addKnot(x + (v2.x / 2), y + (v2.y / 2));
          //this.__drawTestPoint(this._bounds.x0, this._bounds.y0, "c")
          this._bounds.addKnot(x, y);
        }
        this._backend.quadraticCurveTo(cpx, cpy, x, y);
        return this;
      },

      "bezierCurveTo": function(cp1x, cp1y, cp2x, cp2y, x, y) {
        //this._path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
        if (this._tracePathBounds) {
          // fixme i'm sure this could be shorter!
          //
          var v1 = new unit.Point(this._bounds.x0, this._bounds.y0).vectorTo(cp1x, cp1y),
              v2 = new unit.Point(x, y).vectorTo(cp2x, cp2y),
              v3 = new unit.Point(this._bounds.x0, this._bounds.y0).vectorTo(x, y),
              a = new unit.Point(this._bounds.x0 + (v1.x / 2), this._bounds.y0 + (v1.y / 2)),
              b = new unit.Point(x + (v2.x / 2), y + (v2.y / 2)),
              c = new unit.Point(x + (v1.x / 2) + (v2.x / 2) - (v3.x / 2), 
                                  y + (v1.y / 2) + (v2.y / 2) - (v3.y / 2)),
              v4 = (new unit.Point(a.x, a.y)).vectorTo(c.x, c.y),
              v5 = (new unit.Point(b.x, b.y)).vectorTo(c.x, c.y),
              d = new unit.Point(a.x + (v4.x / 2), a.y + (v4.y / 2)),
              e = new unit.Point(b.x + (v5.x / 2), b.y + (v5.y / 2)),
              v6 = (new unit.Point(e.x, e.y)).vectorTo(d.x, d.y),
              f = new unit.Point(e.x + (v6.x / 2), e.y + (v6.y / 2)),
              v7 = new unit.Point(this._bounds.x0, this._bounds.y0).vectorTo(a.x, a.y),
              v8 = new unit.Point(x, y).vectorTo(b.x, b.y),
              g = new unit.Point(this._bounds.x0 + (v7.x / 2), 
                                  this._bounds.y0 + (v7.y / 2)),
              h = new unit.Point(x + (v8.x / 2), y + (v8.y / 2)),
              v9 = new unit.Point(g.x, g.y).vectorTo(d.x, d.y),
              v10 = new unit.Point(h.x, h.y).vectorTo(e.x, e.y),
              i = new unit.Point(g.x + (v9.x / 2), g.y + (v9.y / 2)),
              j = new unit.Point(h.x + (v10.x / 2), h.y + (v10.y / 2));

          /** vizualise points
          this.__drawTestPoint(a.x, a.y, "a");
          this.__drawTestPoint(b.x, b.y, "b");
          this.__drawTestPoint(c.x, c.y, "c");
          this.__drawTestPoint(d.x, d.y, "d");
          this.__drawTestPoint(e.x, e.y, "e");
          this.__drawTestPoint(f.x, f.y, "f");
          this.__drawTestPoint(g.x, g.y, "g");
          this.__drawTestPoint(h.x, h.y, "h");
          this.__drawTestPoint(i.x, i.y, "i");
          this.__drawTestPoint(j.x, j.y, "j");
          */

          this._bounds.addKnot(f.x, f.y);
          this._bounds.addKnot(i.x, i.y);
          this._bounds.addKnot(j.x, j.y);
          this._bounds.addKnot(x, y);
        }
        this._backend.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
        return this;
      },

      "rect" : function (rect, y, width, height) {
        //this._path.rect(rect, y, width, height)
        var x;
        if (arguments.length == 1) {
          x = rect.x
          y = rect.y
          width = rect.width
          height = rect.height
        }
        else
          x = rect

        if (this._tracePathBounds) {
          this._bounds.expandBox(x, y, width, height);
        }
        this._backend.rect(x, y, width, height);
        return this;
      },

      "arc": function (x, y, radius, startAngle, endAngle, anticlockwise) {
        //this._path.arc(x, y, radius, startAngle, endAngle, anticlockwise)
        if (this._tracePathBounds) {
          this._bounds.expandBox( x - radius, y - radius, radius * 2, radius * 2);
        }
        this._backend.arc(x, y, radius, startAngle, endAngle, anticlockwise);
        return this;
      },

      "stroke" : function () {
        if(this._path.length) {
          // append path stack
          this._backend.appendPath(this._path)
        }
        this._backend.stroke();
        return this;
      },

      "fill" : function () {
        this._backend.fill();
        return this;
      },

      "clip": function() {
        this._backend.clip();
        return this;
      },

      // extended path API
      
      "createPath" : function(d /* SVG d attribute string */) {
        return new group.CanvasPath(d);
      },

      // adding `path` to current path stack
      "appendPath" : function(path) {
        this._path.append(path);
        return this;
      },

      "clonePath" : function() {
        return this._path.clone();
      },

      // state stack

      "save" : function () { 
        if(this._path)
          this._pathStack.push(this._path.clone())
        this._stateStack.push(this.transformMatrix.clone());
        this._backend.save() 
        return this;
      },

      "restore" : function () { 
        this._backend.restore() 
        this.globalAlpha = this._backend.globalAlpha;
        this.globalCompositeOperation = this._backend.globalCompositeOperation;
        this.strokeStyle = this._backend.strokeStyle;
        this.fillStyle = this._backend.fillStyle;
        this.lineWidth = this._backend.lineWidth;
        this.lineCap = this._backend.lineCap;
        this.lineJoin = this._backend.lineJoin;
        this.miterLimit = this._backend.miterLimit;
        this.shadowOffsetX = this._backend.shadowOffsetX;
        this.shadowOffsetY = this._backend.shadowOffsetY;
        this.shadowBlur = this._backend.shadowBlur;
        this.shadowColor = this._backend.shadowColor;
        this.font = this._backend.font;
        this.textAlign = this._backend.textAlign;
        this.textBaseline = this._backend.textBaseline;
        if (this._stateStack.length > 0) {
          this.transformMatrix = this._stateStack.pop();
        }
        if (this._pathStack.length > 0) {
          this._path = this._pathStack.pop()
        }
        return this;
      },
      
      // transforms

      "translate" : function (tx, ty) { 
        if (this._tracePathBounds)
          this.transformMatrix.translate(tx, ty)
        this._backend.translate(tx, ty) 
        return this;
      },

      "rotate" : function (angle) { 
        if (this._tracePathBounds)
          this.transformMatrix.rotate(angle)
        this._backend.rotate(angle) 
        return this;
      },

      "scale" : function (x, y) { 
        if (this._tracePathBounds)
          this.transformMatrix.scale(x, y)
        this._backend.scale(x, y) 
        return this;
      },

      "transform" : function (m11, m12, m21, m22, dx, dy) { 
        if (this._tracePathBounds)
          this.transformMatrix._transform(arguments);
        this._backend.transform(m11, m12, m21, m22, dx, dy);
        return this;
      },

      "setTransform" : function (m11, m12, m21, m22, dx, dy) { 
        if (this._tracePathBounds)
          this.transformMatrix._setTransform(arguments);
        this._backend.setTransform(m11, m12, m21, m22, dx, dy) ;
        return this;
      },
      
      // drawing images

      "drawImage" : function (image, sx, sy, sw, sh, dx, dy, dw, dh) {
        if (arguments.length === 3) {
          this._backend.drawImage(image, sx, sy);

        } else if (arguments.length === 5) {
          this._backend.drawImage(image, sx, sy, sw, sh);

        } else if (arguments.length === 9) {
          this._backend.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
        }
        return this;
      },

      // pixel manipulation

      "createImageData": function() {
        if (arguments[0] && arguments[1])
          return new group.ImageData(arguments[0], arguments[1], null, this._useRawImageData);
          //return this._backend.createImageData(arguments[0], arguments[1])
        else
          return new group.ImageData(arguments[0], null, null, this._useRawImageData);
          //return this._backend.createImageData(arguments[0])
      },

      "getImageData": function(rect, sy, sw, sh) {
        // todo for invoke command
        if(arguments.length == 1)
          sy = rect.y,
          sw = rect.width,
          sh = rect.height,
          rect = rect.x;

        // in IE returns nothing, must be called via invoke()
        if (this._isFlashBackend) {
          return null;
        }
        var rawData = this._backend.getImageData(rect, sy, sw, sh);
        if(this._useRawImageData)
          return new group.ImageData(sw, sh, rawData);
        else
          return (new group.ImageData(1, 1)).__fromCanvasData(rawData);
      },

      "putImageData": function(imageData, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight) {
        group.assertImageDataIsValid(imageData);
        var data;
        if (this._isFlashBackend) {
          data = imageData;
        } else {
          if(this._useRawImageData)
            data = imageData
          else
            data = imageData.__toCanvasData(this._backend);
        }
        if (arguments.length == 3)
          this._backend.putImageData(data, dx, dy);
        else if (arguments.length == 7)
          this._backend.putImageData(data, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight);
      },

      // gradients

      "createLinearGradient": function (x0, y0, x1, y1) {
        return this._backend.createLinearGradient(x0, y0, x1, y1)
      },

      "createRadialGradient": function (x0, y0, r0, x1, y1, r1) {
        return this._backend.createRadialGradient(x0, y0, r0, x1, y1, r1)
      },

      // patterns

      "createPattern": function (image, repetition) {
        if(!repetition) repetition = null
        return this._backend.createPattern(image, repetition)
      },

      // text

      "fillText" : function (text, x, y, maxWidth) {
        this._backend.fillText(text, x, y, maxWidth || null);
        return this;
      },

      "strokeText" : function (text, x, y, maxWidth) {
        this._backend.strokeText(text, x, y, maxWidth || null);
        return this;
      },

      "measureText": function(text) {
        return this._backend.measureText(text)
      },

      // In IE isPointInPath uses simplified method by checking if point in path bounds.
      // To determine point-in-shape we need advanced math calculation and it will
      // kill app slowly (IE's JS engine is not a rocket).
      // If is needed precise result, use wrapper invoke(), e.g.:
      //   ctx.invoke("isPointInPath", x, y, function (hit) {
      //     if (hit) {
      //       // ...
      //     }
      //   });
      //
      // When this is not using, related calculations can be disabled for 
      // little speed up:
      //   <canvas ... tracePathBounds="false"></canvas>
      //

      "isPointInPath" : function (x, y) {
        if (this._isFlashBackend) {
          return this._tracePathBounds ? this.isPointInPathBounds(x, y) : false;
        } else {
          // isPointInPath fix for Firefox 
          if (unit.browser.isFirefox) {
            this._backend.save();
            this._backend.setTransform(1, 0, 0, 1, 0, 0);
            var test = this._backend.isPointInPath(x, y)
            this._backend.restore();
            return test;
          }
          return this._backend.isPointInPath(x, y)
        }
      },

      // reserved for the future
      "isPointInPathBounds" : function (x, y) {
        var bounds = this.getPathBounds();
        var p = new unit.Point(x, y);
        this.transformMatrix.multiplyPoint(p);

        if (p.x > bounds.x && p.y > bounds.y &&
            p.x < bounds.x + bounds.width && p.y < bounds.y + bounds.height)
              return true;
        return false;
      },

      // isPointInPath for chains
      "ifPointInPath" : function (x, y, fn) {
        fn(this.isPointInPath(x, y))
        return this
      },

      // reserved for the future
      "getPathBounds" : function () {
        return this._bounds.clone();
      }, 

      // chaining setter
      "set" : function (prop, value) {
        this[prop] = value;
        return this;
      },

      // canvas properties

      "globalAlpha" : group.defProp.globalAlpha,
      "globalCompositeOperation" : group.defProp.globalCompositeOperation,
      "strokeStyle" : group.defProp.strokeStyle,
      "fillStyle" : group.defProp.fillStyle,
      "shadowOffsetX" : group.defProp.shadowOffsetX,
      "shadowOffsetY" : group.defProp.shadowOffsetY,
      "shadowBlur" : group.defProp.shadowBlur,
      "shadowColor" : group.defProp.shadowColor,
      "lineWidth" : group.defProp.lineWidth,
      "lineCap" : group.defProp.lineCap,
      "lineJoin" : group.defProp.lineJoin,
      "miterLimit" : group.defProp.miterLimit,
      "font" : group.defProp.font,
      "textAlign" : group.defProp.textAlign,
      "textBaseline" : group.defProp.textBaseline,

      // chainable property setters

      "setGlobalAlpha" : function (x) { this.globalAlpha=x; return this },
      "setGlobalCompositeOperation" : function (x) { this.globalCompositeOperation=x; return this },
      "setStrokeStyle" : function (x) { this.strokeStyle=x; return this },
      "setFillStyle" : function (x) { this.fillStyle=x; return this },
      "setShadowOffsetX" : function (x) { this.shadowOffsetX=x; return this },
      "setShadowOffsetY" : function (x) { this.shadowOffsetY=x; return this },
      "setShadowBlur" : function (x) { this.shadowBlur=x; return this },
      "setShadowColor" : function (x) { this.shadowColor=x; return this },
      "setLineWidth" : function (x) { this.lineWidth=x; return this },
      "setLineCap" : function (x) { this.lineCap=x; return this },
      "setLineJoin" : function (x) { this.lineJoin=x; return this },
      "setMiterLimit" : function (x) { this.miterLimit=x; return this },
      "setFont" : function (x) { this.font=x; return this },
      "setTextAlign" : function (x) { this.textAlign=x; return this },
      "setTextBaseline" : function (x) { this.textBaseline=x; return this },

      "invoke" : function () { 
        this._backend._invoke(arguments);
      },

      // actually, dummy() must be invoked
      "dummy" : function () {
        this._backend.dummy();
      },

      // some style helpers

      "__rgbaStyle" : function (r, g, b, a) { 
          return ["rgba(", slice.call(arguments, 0).join(","), ")"].join(""); 
      },
      "__rgbStyle" : function (r, g, b) { 
          return ["rgb(", slice.call(arguments, 0).join(","), ")"].join(""); 
      },
      "setFillStyleRGBA" : function (r, g, b, a) { 
          this.fillStyle = this.__rgbaStyle(r,g,b,a); 
          return this
      },
      "setStrokeStyleRGBA" : function (r, g, b, a) { 
          this.strokeStyle = this.__rgbaStyle(r,g,b,a); 
          return this
      },
      "setFillStyleRGB" : function (r, g, b) { 
          this.fillStyle = this.__rgbStyle(r,g,b); 
          return this
      },
      "setStrokeStyleRGB" : function (r, g, b) { 
          this.strokeStyle = this.__rgbStyle(r,g,b); 
          return this
      },
      // complete clear the canvas
      "clear" : function () { 
          this.clearRect(0, 0, this.canvas.width, this.canvas.height)
          return this
      },

      // back reference to prototype
      "constructor" : group.extCanvasRenderingContext2D
    };

    /* code generators
    for (var prop in group.defProp) {
      console.log("\""+prop+"\" : group.defProp."+prop+",");
    }

    for (var prop in group.defProp) {
      var setter = "set" + group.capitalize(prop)
      console.log("\""+setter+"\" : function (x) { this."+prop+"=x; return this },");
    }
    */

    /*
     * class Bounds
     */
    function Bounds (x, y, width, height) {
      unit.Rectangle.call(this, x || 0, y || 0, width || 0, height || 0);
      // last added knot
      this.x0 = 0
      this.y0 = 0
    };

    Bounds.prototype = {
      "__set" : unit.Rectangle.prototype.__set,
      "isPointWithin" : unit.Rectangle.prototype.isPointWithin,
      "addKnot" : function (x, y) {
        var v = (new unit.Point(this.x, this.y)).vectorTo(x, y)

        if (this.x == 0)
          this.x = x
        else if (v.x < 0 || this.x == 0) { 
          this.x += v.x
          this.width -= v.x
        }
        else if (this.x + v.x > this.x + this.width) 
          this.width = v.x

        if (this.y == 0)
          this.y = y
        else if (v.y < 0) {
          this.y += v.y
          this.height -= v.y
        }
        else if (this.y + v.y > this.y + this.height) 
          this.height = v.y

        this.x0 = x
        this.y0 = y
      },

      "clear" : function () {
        this.x0 = this.y0 = this.x = this.y = this.width = this.height = 0
      },

      "expandBox" : function (x, y, width, height) {
        this.addKnot(x, y);
        this.addKnot(x + width, y + height);
      },

      "clone" : function () {
        return new Bounds(this.x, this.y, this.width, this.height)
      }
    };

    // In IE serving huge image data won't makes you happy,
    // so I'm trying to implement this trick:
    // I will use array W x H with encoded pixel values in 32-bit integers, 
    // it must help save some time/memory in conversions routines.
    
    // ... it seems to be most compact and efficient data structure
    //

    /*
     *  class ImageData
     */
    group.ImageData = function(width, height, initData, useRawImageData) {
      // fix for IE
      this.__useCache = false
      this.__pixel = useRawImageData && !unit.browser.ie ? 4 : 1;
      this.__cachedData = null

      if (width && height) {
        this.width = width;
        this.height = height;
        // internal extendings
        if (initData) {
          this.data = initData;
          return this;
        }
      } else {
        if (!arguments[0])
          group.throwException('NOT_SUPPORTED_ERR');
        group.assertImageDataIsValid(arguments[0]);
        this.width = arguments[0].width;
        this.height = arguments[0].height;
      }

      this.data = new Array(this.width * this.height);

      // default data filled with black transparent 
      for (var y = 0; y < this.height; y++)
        for (var x = 0; x < this.width; x++)
          this.data[((y * this.width) + x)] = 0x00000000;
    };

    group.ImageData.prototype = 
    {
      // data structure is an array with pixel values encoded as integer
      //
      "data" : null,

      "__setPixel" : function (x, y, rgba) 
      {
      },

      "__getPixel" : function (x, y, rgba) 
      {
      },

      /*
      "__setPixel" : function (x, y, rgba) 
      {
        var ofs = ((y * this.width) + x) * this.__pixel,
            red = rgba >> 24 & 0xFF,
            green = rgba >> 16 & 0xFF,
            blue = rgba >> 8 & 0xFF,
            alpha = rgba & 0xFF;

        if(this.__pixel == 4)
          this.data[ofs] = red,
          this.data[ofs + 1] = green,
          this.data[ofs + 2] = blue,
          this.data[ofs + 3] = alpha;
        else
          this.data[ofs] = String.fromCharCode( red, green, blue, alpha );
      },

      "__getPixel" : function (x, y) 
      {
        var ofs, pixelValue, red, green, blue, alpha;

        if(this.__pixel == 4) 
          ofs = ((y * this.width) + x) * this.__pixel,
          red = this.data[ofs],
          green = this.data[ofs + 1] ,
          blue = this.data[ofs + 2] ,
          alpha = this.data[ofs + 3];
        else
          ofs = y * this.width + x,
          pixelValue = this.data[ofs],
          red = pixelValue.charCodeAt(0),
          green = pixelValue.charCodeAt(1),
          blue = pixelValue.charCodeAt(2),
          alpha = pixelValue.charCodeAt(3);

        return (red << 24) + (green << 16) + (blue << 8) + alpha;
      },

      "__getPixelOffset" : function (ofs) 
      {
        var pixelValue, red, green, blue, alpha;

        if(this.__pixel == 4) 
          red = this.data[ofs],
          green = this.data[ofs + 1] ,
          blue = this.data[ofs + 2] ,
          alpha = this.data[ofs + 3];
        else
          pixelValue = this.data[ofs],
          red = pixelValue.charCodeAt(0),
          green = pixelValue.charCodeAt(1),
          blue = pixelValue.charCodeAt(2),
          alpha = pixelValue.charCodeAt(3);

        return (red << 24) + (green << 16) + (blue << 8) + alpha;
      },
      */

      "__toCanvasData" : function (ctx) {
        if(this.__useCache && this.__cachedData) 
          return this.__cachedData

        var cvImData = unit.browser.isOpera ? // stub image data object for Opera
                        {
                          'width' : this.width, 
                          'height' : this.height, 
                          'data' : new Array(this.width*this.height*4)
                        } :
                        ctx.createImageData(this.width, this.height),
            pixelValue, ofs;

        for (var y = 0; y < this.height; y++) 
        {
          for (var x = 0; x < this.width; x++) 
          {
            ofs = (y * 4) * this.width + x * 4;
            pixelValue = this.data[y * this.width + x];
            cvImData.data[ofs] = pixelValue >> 24 & 0xFF;
            cvImData.data[ofs + 1] = pixelValue >> 16 & 0xFF;
            cvImData.data[ofs + 2] = pixelValue >> 8 & 0xFF;
            cvImData.data[ofs + 3] = pixelValue & 0xFF;
          }
        }

        if(this.__useCache) this.__cachedData = cvImData;

        return cvImData;
      },

      "__fromCanvasData" : function (rawData) {
        this.width = rawData.width;
        this.height = rawData.height;
        this.data = new Array(this.width * this.height);
        var ofs, red, green, blue, alpha;
        for (var y = 0; y < this.height; y++) 
        {
          for (var x = 0; x < this.width; x++) 
          {
            ofs = (y * 4) * this.width + x * 4;
            red = rawData.data[ofs]
            green = rawData.data[ofs + 1]
            blue = rawData.data[ofs + 2]
            alpha = rawData.data[ofs + 3]
            this.data[(y * this.width) + x] = (red << 24) + (green << 16) + (blue << 8) + alpha;
          }
        }
        return this;
      },

      "__destroy" : function () 
      {
          this.width = this.height = this.data = null;
      },

      "toString" : function () 
      {
        return "ImageData["+this.data.length+"]";
      }
    };

    group.assertImageDataIsValid = function(obj, x) {
      if (!(obj.width && isFinite(obj.width) &&
            obj.height && isFinite(obj.height) &&
            obj.data && obj.data.length /*&&
            obj.height * obj.height * x == obj.data.length*/))
        group.throwException("TYPE_MISMATCH_ERR")
    }

    // Draft variant of CanvasPath interface

    /*
     *  CanvasPath
     */
    group.CanvasPath = function(path /* todo SVG d attribute string or CanvasPath instance?*/) {
      this.length = 0
      this._stack = [];
      this._serial = [];
      this._ie = unit.browser.ie;
    };

    /*
        moveTo         : "B",
        lineTo         : "C",
      quadraticCurveTo : "D",
        bezierCurveTo  : "E",
        arc            : "F",
        arcTo          : "G",
        rect           : "H",
        closePath      : "K",
      */
    group.CanvasPath.prototype = {
      // fixme optimize me
      "__copy" : function(from, dest){
        var cmd, argsLen, fromArgs, destArgs;
        for(var i=0; i<from._stack.length; i++) {
          cmd = from._stack[i][0]
          fromArgs = from._stack[i][1]
          argsLen = fromArgs.length
          destArgs = []
          for(var k=0; k<argsLen; k++) {
            destArgs[k] = fromArgs[k]
          }
          dest._stack[i] = [cmd, destArgs]
          if(this._ie) 
            dest._serial[i] = from._serial[i]
        }
      },
      "pop" : function(){
        if(this._ie)
          this._serial.pop()
        return this._stack.pop()
      },
      "push" : function(segment){
        this[segment[0]].apply(this, segment[1])
      },
      "clone" : function(){
        var newPath = new group.CanvasPath()
        this.__copy(this, newPath)
        newPath.length = this.length
        return newPath;
      },
      "append" : function(path){
        this.__copy(path, this)
        this.length += path.length
      },
      "moveTo" : function(x, y){
        var args = [x, y]
        if(this._ie)
          this._serial[this.length] = ["B", x, "\x01", y].join("")
        this._stack[this.length] = ["moveTo", args]
        this.length++
      },
      "lineTo" : function(x, y){
        var args = [x, y]
        if(this._ie)
          this._serial[this.length] = ["C", x, "\x01", y].join("")
        this._stack[this.length] = ["lineTo", args]
        this.length++
      },
      "arcTo" : function(x1, y1, x2, y2, radius){
        var args = [x1, y1, x2, y2, radius]
        if(this._ie)
          this._serial[this.length] = ["G", args.join("\x01")].join("")
        this._stack[this.length] = ["arcTo", args]
        this.length++
      },
      "vectorTo" : function(x, y){
        var args = [x, y]
        if(this._ie)
          this._serial[this.length] = ["B", x, "\x01", y].join("")
        this._stack[this.length] = ["vectorTo", args]
        this.length++
      },
      "bezierCurveTo" : function(cp1x, cp1y, cp2x, cp2y, x, y){
        var args = [cp1x, cp1y, cp2x, cp2y, x, y]
        if(this._ie)
          this._serial[this.length] = ["E", args.join("\x01")].join("")
        this._stack[this.length] = ["bezierCurveTo", args]
        this.length++
      },
      "quadraticCurveTo" : function(cpx, cpy, x, y){
        var args = [cpx, cpy, x, y]
        if(this._ie)
          this._serial[this.length] = ["D", args.join("\x01")].join("")
        this._stack[this.length] = ["quadraticCurveTo", args]
        this.length++
      },
      "arc" : function(x, y, radius, startAngle, endAngle, anticlockwise){
        var args = [x, y, radius, startAngle, endAngle, anticlockwise]
        if(this._ie)
          this._serial[this.length] = ["F", args.join("\x01")].join("")
        this._stack[this.length] = ["arc", args]
        this.length++
      },
      "rect" : function(rect, y, width, height){
        var args = [rect, y, width, height]
        if(this._ie)
          this._serial[this.length] = ["H", args.join("\x01")].join("")
        this._stack[this.length] = ["rect", args]
        this.length++
      },
      "close" : function(){
        if(this._ie)
          this._serial[this.length] = "K"
        this._stack[this.length] = ["close"]
        this.length++
      },
      "toSVGString" : function(){},
      // serialization heavily used in flash backend
      "toString" : function(comma){
        if(this._ie) {
          if(comma == undefined) comma = "\x01"
          return [this._serial.join(comma), comma].join("")
        }
        return "CanvasPath[]"
      }
    };

    /*
     *  CanvasEvent
     */
    group.CanvasEvent = {
      FRAME : "1" ,
      RESIZE : "2"  
    };

    // useful thing: in Firefox native rendering context is not extendable
    if (!window["extCanvasRenderingContext2D"])
      window["extCanvasRenderingContext2D"] = group.extCanvasRenderingContext2D;

    if (!window["ImageData"])
      window["ImageData"] = group.ImageData;

    if (!window["CanvasPath"])
      window["CanvasPath"] = group.CanvasPath;

    function onUnload () {
      window.detachEvent("onbeforeunload", onUnload);
      window["extCanvasRenderingContext2D"] = null;
      window["ImageData"] = null;
      window["CanvasPath"] = null;
    };

    // prevent IE6 memory leaks
    if (window.attachEvent)
      window.attachEvent("onbeforeunload", onUnload);
  });
});
