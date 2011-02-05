/*
 * extended Canvas rendering context
 *
 * Copyright (c) 2010 Evgen Burzak <buzzilo at gmail.moc>
 * Released under the MIT/X License
 */
$Unit(__PATH__, __FILE__, function(unit, root, glob){

  unit.Import(
    "platform",
    "geom.*", 
    "buz.fxcanvas.config"
  );

  unit.Matrix2d.prototype._transform = function (args) {
    // todo it's a quite complicated part...
  };

  unit.Matrix2d.prototype._setTransform = function (args) {
    // todo it's a quite complicated part...
  };

  unit.Matrix2d.prototype._dump = function () {
    return [this[0], this[1], this[2], this[3], this[4], this[5]].join(",");
  };

  unit.Package("buz.fxcanvas", function(group) {

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
    // 

    // class extCanvasRenderingContext2D
    //
    group.extCanvasRenderingContext2D = function (canvas, backend) 
    {
      // internals
      //
      this._isFlashBackend = unit.platform.isIE
      // backend: flash or canvas
      this._backend = backend;
      // path bounds
      this._bounds = new Bounds;
      // last added segment
      this._xy0 = unit.Point();
      this._tracePathBounds = unit.config.tracePathBounds;
      this._stateStack = [];
      this._pathStack = [];
      this._useRawImageData = unit.config.useRawImageData;
      this._useCanvasPath = unit.config.useCanvasPath;

      this.canvas = canvas;

      this.transformMatrix = new unit.Matrix2d();
      this.transformMatrix.identity()

      // sadly, setters and getters are not working in IE ..
      //
      if ( !unit.platform.isIE ) {
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

      "clearRect" : function (x, y, width, height) {

        if (arguments.length == 1)
          y = x.y,
          width = x.width,
          height = x.height,
          x = x.x;

        this._backend.clearRect(x, y, width, height);
        return this;
      },
      
      "fillRect": function (x, y, width, height) {

        if (arguments.length == 1)
          y = x.y,
          width = x.width,
          height = x.height,
          x = x.x;

        this._backend.fillRect(x, y, width, height);
        return this;
      },

      "strokeRect": function (x, y, width, height) {

        if (arguments.length == 1)
          y = x.y,
          width = x.width,
          height = x.height,
          x = x.x;

        this._backend.strokeRect(x, y, width, height);
        return this;
      },

      "closePath" : function () {
        if(this._path)
          this._path.close();
        this._backend.closePath();
        return this;
      },

      "beginPath" : function () {

        if(this._useCanvasPath)
          this._path = this.createPath();

        if (this._tracePathBounds) {
          this._bounds.clear()
          this._xy0.set(0,0)
        }
        this._backend.beginPath();
        return this;
      },

      "moveTo" : function (x, y) {

        if (arguments.length == 1)
          y = x.y, 
          x = x.x;

        if(this._path)
          this._path.moveTo(x, y)

        if (this._tracePathBounds) {
          this._xy0.set(x, y)
          this._bounds.addKnot(x, y);
        }
        this._backend.moveTo(x, y);
        return this;
      },

      "lineTo" : function (x, y) {

        if (arguments.length == 1)
          y = x.y, 
          x = x.x;

        if(this._path)
          this._path.lineTo(x, y)

        if (this._tracePathBounds) {
          this._xy0.set(x, y)
          this._bounds.addKnot(x, y);
        }
        this._backend.lineTo(x, y);
        return this;
      },

      "arcTo": function(x1, y1, x2, y2, radius) {

        if(this._path)
          this._path.arcTo(x1, y1, x2, y2, radius)

        if (this._tracePathBounds) {
          this._bounds.addKnot(x1, y1);
          this._xy0.set(x1, y1)
        }
        this._backend.arcTo(x1, y1, x2, y2, radius);
      },

      "vectorTo" : function (x, y, arrowSize) {
        
        if (arguments.length == 1)
          y = x.y, 
          x = x.x;

        if(!arrowSize)
          arrowSize = 10;

        if(this._path)
          this._path.vectorTo(x, y, arrowSize)
        
        this._backend.lineTo(x, y);

        // 90° = 90 * (Math.PI/180) = 1.5707963267948966
        // 120° = 2.6179938779914944

        var v = this._xy0.vectorTo(x, y),
            rot = Math.atan2(v.y, v.x),
            dx, dy;

        dx = arrowSize*Math.cos(rot+2.61),
        dy = arrowSize*Math.sin(rot+2.61)

        this._backend.lineTo( x + dx, y + dy );

        dx = arrowSize*Math.cos(rot-2.61),
        dy = arrowSize*Math.sin(rot-2.61)

        this._backend.lineTo( x + dx, y + dy );

        this._backend.lineTo( x, y );

        return this;
      },

      /*
      "__drawTestPoint" : function (x, y, text) {
          this.fillStyle = "grey"
          var s = 5;
          this.fillRect(x - (s / 2), y - (s / 2), s, s)
          this.fillStyle = "#fff"
          if (text)
            this.fillText(text, x + 5, y + 5)
      },
      */

      "quadraticCurveTo": function(cpx, cpy, x, y) {

        if(this._path)
          this._path.quadraticCurveTo(cpx, cpy, x, y)

        if (this._tracePathBounds) {
          // 
          var v1 = this._xy0.vectorTo(x, y),
              v2 = (unit.Point(x + (v1.x / 2), y + (v1.y / 2))).vectorTo(cpx, cpy);

          this._bounds.addKnot(x + (v2.x / 2), y + (v2.y / 2));
          //this.__drawTestPoint(this._bounds.x0, this._bounds.y0, "c")
          this._bounds.addKnot(x, y);
          this._xy0.set(x, y)
        }
        this._backend.quadraticCurveTo(cpx, cpy, x, y);
        return this;
      },

      "bezierCurveTo": function(cp1x, cp1y, cp2x, cp2y, x, y) {

        if(this._path)
          this._path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)

        if (this._tracePathBounds) {
          // fixme i'm sure this could be shorter!
          //
          var Point = unit.Point,
              xy0 = this._xy0,
              xy = Point(x, y),
              v1 = xy0.vectorTo(cp1x, cp1y),
              v2 = xy.vectorTo(cp2x, cp2y),
              v3 = xy0.vectorTo(x, y),
              a = Point(xy0.x + (v1.x/2), xy0.y + (v1.y/2)),
              b = Point(x + (v2.x/2), y + (v2.y/2)),
              c = Point(x + (v1.x/2) + (v2.x/2) - (v3.x/2), y + (v1.y/2) + (v2.y/2) - (v3.y/2)),
              v4 = a.vectorTo(c),
              v5 = b.vectorTo(c),
              d = Point(a.x + (v4.x/2), a.y + (v4.y/2)),
              e = Point(b.x + (v5.x/2), b.y + (v5.y/2)),
              v6 = e.vectorTo(d.x, d.y),
              f = Point(e.x + (v6.x/2), e.y + (v6.y/2)),
              v7 = xy0.vectorTo(a),
              v8 = xy.vectorTo(b),
              g = Point(xy0.x + (v7.x/2), xy0.y + (v7.y/2)),
              h = Point(x + (v8.x/2), y + (v8.y/2)),
              v9 = g.vectorTo(d),
              v10 = h.vectorTo(e),
              i = Point(g.x + (v9.x/2), g.y + (v9.y/2)),
              j = Point(h.x + (v10.x/2), h.y + (v10.y/2));

          /** vizualise points **/
          /*
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
          this._xy0.set(x, y)
        }
        this._backend.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
        return this;
      },

      "rect" : function (x, y, width, height) {

        if (arguments.length == 1)
          y = x.y,
          width = x.width,
          height = x.height,
          x = x.x;

        if(this._path)
          this._path.rect(x, y, width, height)

        if (this._tracePathBounds) {
          this._bounds.expandBox(x, y, width, height);
          this._xy0.set(x + width, y + height)
        }
        this._backend.rect(x, y, width, height);
        return this;
      },

      "arc": function (x, y, radius, startAngle, endAngle, anticlockwise) {

        if(this._path)
          this._path.arc(x, y, radius, startAngle, endAngle, anticlockwise)

        if (this._tracePathBounds) {
          var r = radius * 2
          this._bounds.expandBox( x - radius, y - radius, r, r);
          this._xy0.set(x + r, y + r)
        }
        this._backend.arc(x, y, radius, startAngle, endAngle, anticlockwise);
        return this;
      },

      "stroke" : function () {
        if(this._path && this._path.length) {
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
        if(this._path)
          this._path.append(path);
        return this;
      },

      "clonePath" : function() {
        if(this._path)
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
          return new ImageData(arguments[0], arguments[1], null, this._useRawImageData);
          //return this._backend.createImageData(arguments[0], arguments[1])
        else
          return new ImageData(arguments[0], null, null, this._useRawImageData);
          //return this._backend.createImageData(arguments[0])
      },

      "getImageData": function(sx, sy, sw, sh) {

        // todo sx is rectangle for invoke command
        if(arguments.length == 1)
          sy = sx.y,
          sw = sx.width,
          sh = sx.height,
          sx = sx.x;

        // in IE returns nothing, must be called via invoke()
        if (this._isFlashBackend) {
          return null;
        }
        var rawData = this._backend.getImageData(sx, sy, sw, sh);
        if(this._useRawImageData)
          return new ImageData(sw, sh, rawData);
        else
          return (new ImageData(1, 1)).__fromCanvasData(rawData);
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
        if(arguments.length == 1) y = x.y, x = x.x;
        if (this._isFlashBackend) {
          return this._tracePathBounds ? this.isPointInPathBounds(x, y) : false;
        } else {
          // isPointInPath fix for Firefox 
          if (unit.platform.isFirefox) {
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
        if(arguments.length == 1) y = x.y, x = x.x;
        var bounds = this._bounds;
        var m = this.transformMatrix.matrix
        var p = {x: x, y: y}
        if(!(m[0] == 1 && m[1] == 0 && m[2] == 0 && m[3] == 1 && m[4] == 0 && m[5] == 0)) {
          p = this.transformMatrix.clone().invert().multiplyPoint(p);
        }

        return bounds.isPointWithin(p);
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
          return ["rgba(", [r, g, b, a].join(","), ")"].join(""); 
      },
      "__rgbStyle" : function (r, g, b) { 
          return ["rgb(", [r, g, b].join(","), ")"].join(""); 
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

      // back reference to constructor
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
      this.set(x, y, width, height)
      this.knots = 0
    };

    Bounds.prototype = unit.Rectangle();

    unit.object.extend(Bounds.prototype, 
    {
      "addKnot" : function (x, y) {
        var v = (unit.Point(this.x, this.y)).vectorTo(x, y)

        if(!this.knots) {
          this.x = x
          this.y = y
          this.width = 0
          this.height = 0
        }
        else {
          if (v.x < 0) { 
            this.x += v.x
            this.width -= v.x
          }
          else if (this.x + v.x > this.x + this.width) {
            this.width = v.x
          }

          if (v.y < 0) {
            this.y += v.y
            this.height -= v.y
          }
          else if (this.y + v.y > this.y + this.height) {
            this.height = v.y
          }
        }
        //trace("v", v, this.x, this.y)
        this.knots++
      },

      "clear" : function () {
        this.knots = this.x = this.y = this.width = this.height = 0
      },

      "expandBox" : function (x, y, width, height) {
        //trace("expandBox", x, y, width, height)
        this.addKnot(x, y);
        this.addKnot(x + width, y + height);
      },

      "clone" : function () {
        return new Bounds(this.x, this.y, this.width, this.height)
      }

    });

    // In IE serving huge image data won't makes you happy,
    // so I'm trying to implement this trick:
    // I will use array W x H with encoded pixel values in 32-bit integers, 
    // it must help save some time/memory in conversions routines.
    
    // todo use typed arrays where possible
    //
    // The problem is order (big or little endian?) of bytes:
    //
    // var b = new ArrayBuffer(8);
    // var v1 = new Uint32Array(b);
    // v1[0]=0xffffffab;
    // var v2 = new Uint8ClampedArray(b);
    // console.log([v1[0].toString(16), v2[0], v2[1], v2[2], v2[3]])
    //
    // will produce ["ffffffab", 171, 255, 255, 255]

    /*
     *  class ImageData
     */
    function ImageData (width, height, initData, useRawImageData) {

      // fix for IE
      this.__useCache = false
      this.__pixel = useRawImageData && unit.platform.isIE ? 1 : 4;
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

      this.data = unit.VectorArray(this.width * this.height, unit.Uint(32));
      //this.data = new Array(this.width * this.height);

      // default data filled with black transparent 
      for (var y = 0; y < this.height; y++)
        for (var x = 0; x < this.width; x++)
          this.data[((y * this.width) + x)] = 0x00000000;
    };

    group.ImageData = ImageData

    ImageData.prototype = 
    {
      // data structure is an array with pixel values encoded as integer
      //
      "data" : null,

      /*
      "putPixel8" : function (x, y, rgba) 
      {
        var ofs = ((y * this.width) + x) * this.__pixel,
            red = rgba >> 24 & 0xFF,
            green = rgba >> 16 & 0xFF,
            blue = rgba >> 8 & 0xFF,
            alpha = rgba & 0xFF;

        this.data[ofs] = red,
        this.data[ofs + 1] = green,
        this.data[ofs + 2] = blue,
        this.data[ofs + 3] = alpha;
      },

      "putPixel32" : function (x, y, rgba) 
      {
        this.data[ y*this.width+x ] = rgba;
      },

      "getPixel8" : function (x, y) 
      {
        var ofs, red, green, blue, alpha;

        ofs = ((y*this.width)+x)*4,
        red = this.data[ofs],
        green = this.data[ofs + 1] ,
        blue = this.data[ofs + 2] ,
        alpha = this.data[ofs + 3];
        return (red << 24) + (green << 16) + (blue << 8) + alpha;
      },
      
      "getPixel32" : function (x, y) 
      {
        return this.data[ y*this.width+x ]
      },
      */

      "__toCanvasData" : function (ctx) {
        if(this.__useCache && this.__cachedData) 
          return this.__cachedData

        var cvImData = unit.platform.isOpera ? // stub image data object for Opera
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
        this.data = unit.VectorArray(this.width * this.height, unit.Uint(32));
        //this.data = new Array(this.width * this.height);
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
      },

      "clone" : function(){
        var buf = new ImageData(this.width, this.height)

        //for (var i=0; i<buf.data.length; i++)
          //buf.data[i] = this.data[i]
        buf.data.set(this.data)
        return buf;
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
      this._ie = unit.platform.ie;
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
      "vectorTo" : function(x, y, arrowSize){
        var args = [x, y, arrowSize]
        if(this._ie)
          this._serial[this.length] = ["B", args.join("\x01")].join("")
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
      "rect" : function(x, y, width, height){
        var args = [x, y, width, height]
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
    if (!glob["extCanvasRenderingContext2D"])
      glob["extCanvasRenderingContext2D"] = group.extCanvasRenderingContext2D;

    if (!glob["ImageData"])
      glob["ImageData"] = group.ImageData;

    if (!glob["CanvasPath"])
      glob["CanvasPath"] = group.CanvasPath;

    function onUnload () {
      glob.detachEvent("onbeforeunload", onUnload);
      glob["extCanvasRenderingContext2D"] = null;
      glob["ImageData"] = null;
      glob["CanvasPath"] = null;
    };

    // prevent IE6 memory leaks
    if (glob.attachEvent)
      glob.attachEvent("onbeforeunload", onUnload);
  });
});
