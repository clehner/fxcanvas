/*
 * fxCanvas $(Version)
 *
 * Flash drawing backend
 *
 * Copyright (c) 2009 Evgen Burzak
 * Licensed under the MIT License.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

package {
    import flash.system.System;
    import flash.display.StageAlign;
    import flash.display.StageScaleMode;
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.display.Shape;
    import flash.system.fscommand;
    import flash.events.*;
    import flash.text.TextField;
    import flash.text.TextFieldAutoSize;
    import flash.net.navigateToURL;
    import flash.net.URLRequest;
    import flash.net.URLVariables;
    import flash.net.URLRequestMethod;
    import flash.net.URLStream;
    import flash.display.Loader;
    import flash.display.LoaderInfo;
    import flash.ui.ContextMenu;
    import flash.ui.ContextMenuItem;
    import flash.events.ContextMenuEvent;
    import flash.ui.ContextMenuBuiltInItems;
    import flash.geom.Matrix;
    import flash.geom.Point;
    import flash.display.BitmapData;
    import flash.display.Bitmap;
    import flash.utils.getTimer;
    import flash.utils.setInterval;
    import flash.utils.clearInterval;
    import flash.utils.ByteArray;
    import flash.geom.Rectangle;
    import flash.events.MouseEvent;

    import com.hurlant.util.Base64;
    import com.adobe.images.PNGEncoder;
    import com.googlecode.flashcanvas.TextMetrics;
    import com.googlecode.flashcanvas.Canvas;
    import com.googlecode.flashcanvas.CanvasRenderingContext2D;

    import flash.events.StatusEvent;
    import flash.net.LocalConnection;

    import flash.events.*;

    /*
     * ... sorry, I cannot write the code and lyrics at the same time ...
     */
    public class fxCanvas extends Sprite {
        
        private var ver:String = "$(Version)";

        public var canvas:Canvas;
        public var ctx:CanvasRenderingContext2D;

        // URLs of image data decoders
        private var saveAsUrl:String, viewImageUrl:String;

        // debug console
        public var console:TextField;

        // index of current cursor position
        private var bufCursor:uint;

        // buffer length
        private var bufLen:uint;
        // 
        private var argEnd:String = "\x01";

        // returned value of invoked command
        private var _retData:String = null;

        // 
        private var cmdName:Object = {}, _cmd:String;

        // serialized commands
        private var com:Object = {
            beginPath    : "A",
            moveTo       : "B",
            lineTo       : "C",
         quadraticCurveTo: "D",
            bezierCurveTo: "E",
            arc          : "F",
            arcTo        : "G",
            rect         : "H",
            stroke       : "I",
            fill         : "J",
            closePath    : "K",
            save         : "L",
            restore      : "M",
            fillStyle    : "N",
            strokeStyle  : "O",
            clearRect    : "P",
            fillRect     : "Q",
            strokeRect   : "R",
            drawImage    : "S",
            scale        : "T",
            rotate       : "U",
            translate    : "V",
            transform    : "W",
            setTransform : "X",
            shadOffX     : "Y",
            shadOffY     : "Z",
            shadBlur     : "a",
            shadColor    : "b",
            lineWidth    : "c",
            lineCap      : "d",
            lineJoin     : "e",
            miterLimit   : "f",
            crLinGrad    : "h",
            crRadGrad    : "i",
            globA        : "j",
            globCO       : "k",
            getImageData : "l",
            measureText  : "m",
            isPointInPath: "n",
            putImageData : "o",
            drawFocusRing: "p",
            addColorStop : "q",
            createPattern: "r",
            fillText     : "s",
            strokeText   : "t",
            font         : "u",
            textAlign    : "v",
            textBaseline : "w",
            clip         : "x",
            resize       : "y",
            idle         : "z",
      endQueue       : "'",
      ready          : "#",
      onframe        : "-",
      dummy          : ")",
      toDataURL      : "(",
      _loadImage     : "$",
      _lockBitmap    : "*",
      _unlockBitmap  : "+",
      event          : "^",
      invoke         : "~",
      except         : "!",
      frameDuration  : "@",
      viewImage      : ".",
      saveImage      : ",",
      path           : "/"
        };                  

        // syntetic events
        private var _event:String = null, 
                    CanvasEvent:Object = {
                        FRAME : "1",
                        RESIZE : "2"
                    };

        // 
        private var workFrameRate:uint = 100, 
                    idleFrameRate:uint = 10,
                    idle:Boolean       = false;

        // styles stack
        private var styles:Object = {};

        // canvas and page id 
        private var canvasId:int, pageId:String,
                    host_addr:String = "";

        // cache objects
        private var imageCache:Object = {};

        // returned data 
        private var _queue:Array = [];

        // catched flash exception
        private var _exception:String = null;

        // reference to the root.loaderInfo.parameters 
        private var buf:Object;

        // width and height of the canvas
        private var _width:int = 300, _height:int = 150;
        // new size
        private var newWidth:int, newHeight:int;
        private var stageWidth:int, stageHeight:int;

        // timeout may be more than 1000ms, in this case set frameRate=1000 
        // (one frame per microsec) and send onframe event when time is out
        private var _frameDuration:uint = 0, _time:uint = 0;

        private var lc:LocalConnection;

        // used for exchange bitmap data
        private var _dataChunks:ByteArray;

        // proxy for loading images from another domain,
        // required PHP and CURL
        private var proxy:String;

        private var _callStack:Array;

        private var _focus:Boolean = false;

        private var scaleWidth:Number;
        private var scaleHeight:Number;
        private var scaleMatrix:Matrix;
            
        public function fxCanvas() { 
            addEventListener("enterFrame", listen)

            // debug console
            console = new TextField();
            console.autoSize = TextFieldAutoSize.LEFT;
            console.text = ""
            console.textColor = 0x000000;

            stage.scaleMode = StageScaleMode.NO_SCALE;
            stage.align     = StageAlign.TOP_LEFT;

            // Canvas may be resized with distorted proportions
            stage.addEventListener(Event.RESIZE, resizeHandler);

            for (var c:String in com) {
                cmdName[com[c]] = c
            }

            // set up localconnection so that we will able to draw another 
            // canvas element on this canvas
            lc = new LocalConnection();
            lc.addEventListener(StatusEvent.STATUS, on_data_status);
            lc.client=this;

            // context menu
            var custom_menu:ContextMenu = new ContextMenu(); 
            custom_menu.hideBuiltInItems(); 
            // as for version 0.1b flash context menu was disabled in browser
            // ...

            try {
                // silently skip security errors
                send(com.ready,"")
            } catch (e:*) {
            }

            /*
            loader.addEventListener(HTTPStatusEvent.HTTP_STATUS, httpStatusHandler);
            loader.addEventListener(IOErrorEvent.IO_ERROR, ioErrorHandler);
            */

            //stage.removeEventListener(MouseEvent.MOUSE_MOVE, mouseMoveHandler);
            //stage.removeEventListener(MouseEvent.MOUSE_DOWN, mouseDownHandler);

            var args:Array = root.loaderInfo.parameters.c.split(argEnd);
            //log(args)
            newWidth = _width = parseInt(args[0]);
            newHeight = _height = parseInt(args[1]);
            stageWidth = parseInt(args[2])
            stageHeight = parseInt(args[3])
            __setFrameRate(parseInt(args[4]));
            canvasId = parseInt(args[5]);
            pageId = args[6];
            host_addr = args[7];
            viewImageUrl = args[8];
            saveAsUrl = args[9];
            proxy = args[10];

            var lc_id:String = getCanvasUUID();
            lc.connect(lc_id)
            //log("id:"+lc_id)
            //log("d:"lc.domain)

            //log([_width, _width].join("x"))

            init(_width, _height);
        }

        private function mouseMoveHandler(event:MouseEvent):void {
            _focus = true;
        }

        private function mouseDownHandler(event:MouseEvent):void {
            _focus = true;
        }

        private function resizeHandler(event:Event, stageWidth:int = -1, stageHeight:int = -1):void {
            stageWidth = (stageWidth > 0 ? stageWidth : stage.stageWidth)
            stageHeight = (stageHeight > 0 ? stageHeight : stage.stageHeight)
            scaleWidth = stageWidth/newWidth
            scaleHeight = stageHeight/newHeight

            if(scaleWidth < 0.01 || scaleHeight < 0.01) return;
            scaleMatrix = new Matrix(scaleWidth, 0, 0, scaleHeight);
            transform.matrix = scaleMatrix
            //log([newWidth, newHeight, stageWidth, stageHeight, "@", scaleWidth, scaleHeight, ])
        }
        
        private function getCanvasUUID(elId:int = -1):String {
            return "canvas-" + pageId + "-" + (elId == -1 ? canvasId : elId);
        }

        public function listen(evt:Event):void
        {
            if (root.loaderInfo.parameters[com.ready] == undefined)
                return

            removeEventListener("enterFrame", listen)
            addEventListener("enterFrame", onFrame)
        }

        public function init(width: int, height :int):void
        {
            var spr:Sprite = new Sprite();
            this.addChild(spr);
            this.addChild(console);
            try {
                canvas = new Canvas(width, height);
                ctx = canvas.getContext("2d")
            } catch(e:*){
                _exception = "init(): " + e
            }
            stage.frameRate = workFrameRate;

            resizeHandler(null, stageWidth, stageHeight)
            stage.stageWidth = stageWidth
            stage.stageHeight = stageHeight

            spr.addChild(canvas);
            
            //log([canvasId, [width, height].join("x"), stage.frameRate + "fps"].join(", ") )
        }

        // todo serialize result queue into single string
        public function onFrame(evt:Event):void
        {
            if (_frameDuration) {
                if (getTimer()-_time < _frameDuration) {
                    return;
                } else {
                    //log((getTimer()-_time)+"ms")
                    _time = getTimer();
                }
            }

            if (_exception) {
                send(com.except, _exception);
                _exception = null;
            //} else if (_focus) {
                //send('focus', '');
                //_focus = false;
            } else if (_queue.length) {
                var _data:Array = _queue.shift();
                send(_data[0], _data[1]);
            } else if (_event) {
                _width = newWidth
                _height = newHeight
                send(com.event, _event);
                _event = null;
            } else {
                send(com.event, CanvasEvent.FRAME);
            }

            buf = root.loaderInfo.parameters;

            if (buf.l == undefined || buf.l == '0') {
                // received idle command, put to sleep 
                if (buf.c == com.idle) 
                    sleep()
                return
            }

            wakeUp();

            bufLen = parseInt(buf.l)

            //_callStack = []

            try {
                _draw();
            } catch (e:*) {
                //log("error: " + e)
                _exception = e.toString() //+ "\n" + buf.c //+ "\n" + _callStack ; 
                //log(e.getStackTrace())
            }

        }

        // wake up!
        //
        private function wakeUp():void
        {
            if (idle) {
                //log("wakeUp()")
                stage.frameRate = workFrameRate
                idle = false
            }
        }

        private function sleep():void
        {
            if (!idle) {
                //log("sleep()")
                stage.frameRate = idleFrameRate
                idle = true
            }
        }

        // ==================================
        // internals
        //
        private function send(cmd:String, args:String):void
        {
            fscommand(cmd, args);
        }

        private function _draw():void
        {
            if (bufLen) {
                //log("" + [bufLen, buf.c])
                //console.text = ""
                bufCursor = 0
                // prevent stack overflow exception
                while(bufLen)
                    unserializeCommands(0);
            }

        }

        private function unserializeCommands(i:uint):void
        {
            _applyCmd()

            // prevent stack overflow exception
            if (bufLen && i < 1000)
                unserializeCommands(i+1)
        }

        private function _applyCmd(queueId:int = -1):*
        {
            if(!bufLen) return

            var c:String = parseCmd();
            _cmd = c
            //log("!" + cmdName[c])
            //_callStack.push(cmdName[c])

            var fun:String = cmdName[c]

            switch (c) {
                case com.transform:
                case com.setTransform:
                    __transform(c)
                    break;
                case com.strokeStyle:
                case com.fillStyle:
                    var st:String = parseStyle();
                    if (st in styles)
                        ctx[fun] = styles[st];
                    else
                        ctx[fun] = st;
                    break;
                case com.lineWidth:
                    ctx.lineWidth = getFloat();
                    break;
                case com.lineCap:
                    ctx.lineCap = getString();
                    break;
                case com.lineJoin:
                    ctx.lineJoin = getString();
                    break;
                case com.miterLimit:
                    ctx.miterLimit = getInt();
                    break;
                case com.font:
                    ctx.font = getString();
                    break;
                case com.textAlign:
                    ctx.textAlign = getString();
                    break;
                case com.textBaseline:
                    ctx.textBaseline = getString();
                    break;
                case com.frameDuration:
                    __setFrameRate(uint(getInt()));
                    break;
                default:
                    if(queueId > -1)
                        return this[fun](queueId);
                    return this[fun]();
            }
            return null;
        }

        private function dummy():void {}

        private function invoke():void
        {
            var queueId:int = getInt();
            var cmd:String = getString();
            // now apply invoked command and save returned value in queue,
            // with exception for _loadImage which send data when
            // image will be loaded
            if(cmd == '_loadImage') {
              _applyCmd(queueId)
            }
            else
              _queue.push([queueId, _applyCmd() || "1"]);
            //log("invoke("+[queueId,cmd]+")")
        }

        // ======================================
        // canvas context 
        //
        private function clearRect():void {
            var x:Number = getFloat();
            var y:Number = getFloat();
            var w:Number = getFloat();
            var h:Number = getFloat();
            //log("clearRect("+[x,y,w,h]+")")
            ctx.clearRect(x,y,w,h)
        }

        private function rect():void {
            var x:Number = getFloat();
            var y:Number = getFloat();
            var w:Number = getFloat();
            var h:Number = getFloat();
            ctx.rect(x,y,w,h)
        }

        private function beginPath():void {
            //log("beginPath()")
            ctx.beginPath()
        }

        private function moveTo():void {
            var x:Number = getFloat();
            var y:Number = getFloat(); 
            //log("moveTo("+x+","+y+")")
            ctx.moveTo(x,y)
        }

        private function lineTo():void {
            var x:Number = getFloat();
            var y:Number = getFloat(); 
            //log("lineTo("+x+","+y+")")
            ctx.lineTo(x,y)
        }

        private function bezierCurveTo():void {
            var cp1x:Number = getFloat();
            var cp1y:Number = getFloat();
            var cp2x:Number = getFloat();
            var cp2y:Number = getFloat();
            var x:Number = getFloat();
            var y:Number = getFloat(); 
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
        }

        private function quadraticCurveTo():void {
            var cpx:Number = getFloat();
            var cpy:Number = getFloat();
            var x:Number = getFloat();
            var y:Number = getFloat(); 
            ctx.quadraticCurveTo(cpx, cpy, x, y);
        }

        private function arcTo():void {
            var x1:Number = getFloat();
            var y1:Number = getFloat();
            var x2:Number = getFloat();
            var y2:Number = getFloat();
            var radius:Number = getFloat();
            ctx.arcTo(x1, y1, x2, y2, radius);
        }

        private function arc():void {
            var x:Number = getFloat();
            var y:Number = getFloat();
            var r:Number = getFloat();
            var sa:Number = getFloat();
            var ea:Number = getFloat();
            var cw:Boolean = getInt() ? true : false;
            //log("arc(" + [x,y,r,sa,ea,cw].join(",") + ")")
            ctx.arc(x, y, r, sa, ea, cw);
        }

        private function _loadImage(...args):void {
            var _type:Number = getInt();
            var elementId:Number = getInt();
            var imageId:Number = getInt();
            var src:String = getString();
            var queueId:int = (args.length) ? args[0] : -1;  

            var loader:Loader = new Loader();

            if(_type == 0) {// image
                loader.contentLoaderInfo.addEventListener(Event.COMPLETE, __complete(imageId, queueId));
                // src is image encoded in base64
                if (src.substr(0, 4) === "data") {
                  var type:String = src.substring(src.indexOf(":"), src.indexOf(";")),
                      data:String = src.substr(src.indexOf(";") + "base64,".length + 1);
                  loader.loadBytes(Base64.decodeToByteArrayB(data));
                } else {
                    // set src as relative path if hostname is the same
                    if(src.indexOf(host_addr) === 0) {
                        src = src.substr(host_addr.length)
                    }
                    // If the file is in other domain
                    else if (/^https?:\/\//.test(src))
                    {
                        // Rewrite the URL to load the file via a proxy script
                        src = proxy + '?url=' + src;
                    }
                    loader.load(new URLRequest(src));
                }
            }
            else if(_type == 1) // canvas
            {
                lc.send(getCanvasUUID(elementId), "_getImageData", getCanvasUUID(), imageId, queueId);
            }

            imageCache[imageId] = {
                "id": imageId,
                "src": src,
                "loaded": false,
                "bitmapData": null,
                "width": 0,
                "height": 0,
                "contentType": "",
                "url": "",
                "loader": loader
            }

            //log("_loadImage("+[_type, queueId, imageId, elementId, src, "..."]+")")
        }

        // ==================================
        // shared methods
        //
        public function _putImageData(imageId:int, queueId:int, canvasWidth:int, canvasHeight:int):void {
            var cacheObject:Object = imageCache[imageId]
            cacheObject.width = canvasWidth
            cacheObject.height = canvasHeight
            _dataChunks.position = 0
            try {
                cacheObject.bitmapData = new BitmapData(canvasWidth, canvasHeight, true, 0x00000000); //imageData
                var rect:Rectangle = new Rectangle(0, 0, canvasWidth, canvasHeight);
                cacheObject.bitmapData.setPixels(rect, _dataChunks)
            } catch(e:*) {
                _exception = "_putImageData(): " + e
            }
            cacheObject.loaded = true

            if(queueId > -1)
                _queue.push([
                    queueId,
                    [ cacheObject.contentType, 
                      cacheObject.width, 
                      cacheObject.height, 
                      cacheObject.url ].join(argEnd)
                ]);

            _dataChunks = null
            //log("_putImageData(" + [imageId, queueId, "..."] + ")")
        }

        // fixme concurrent writes
        public function _dataChunk(chunk:ByteArray, len:int):void {
            //log("_dataChunk("+[chunk.length, len]+")")
            if(!_dataChunks)
                _dataChunks = new ByteArray()
            try {
                _dataChunks.writeBytes(chunk)
            } catch(e:*) {
                _exception = "_dataChunk(): " + e
            }
        }

        public function _getImageData(elementId:String, imageId:int, queueId:int):void 
        {
            try {
                var width:int = canvas.width;
                var height:int = canvas.height;
                var pixels:ByteArray = canvas.bitmapData.getPixels(canvas.bitmapData.rect)

                var tempByteArray:ByteArray;

                // limit byteArray to 40K - localconnection limit
                var byteLimit:uint = uint(40000);

                if(pixels.length > byteLimit){

                   var currentSize:uint = byteLimit;
                   var position:uint = 0;
                   var totalSize:uint = 0;

                   while(totalSize < pixels.length){
                      tempByteArray = new ByteArray();
                      tempByteArray.length = currentSize;

                      // Write pixels from position to current size
                      tempByteArray.writeBytes(pixels, position, currentSize);

                      //send ByteArray chunk
                      lc.send(elementId, "_dataChunk", tempByteArray, pixels.length);

                      //get current total and get next position
                      totalSize = totalSize + tempByteArray.length;
                      position = totalSize;

                      //set current size based on limit
                      currentSize = pixels.length - totalSize;
                      if(currentSize >  byteLimit){
                         currentSize = byteLimit;
                      }
                  }
                } else{
                     //less than limit - send as is
                     lc.send(elementId, "_dataChunk", pixels, pixels.length);
                }

                lc.send(elementId, "_putImageData", 
                            imageId, 
                            queueId, 
                            canvas.width, 
                            canvas.height); 

            } catch(e:*) {
                _exception = "_getImageData(): " + e
            }
            
            //log("_getImageData(" + [elementId, imageId, queueId] + ")")
        }

        // Image cache is required to prevent flickering, when browser cache is disabled.
        //
        private function __cachedImage(imageId:Number):BitmapData {
            
            if (imageId in imageCache) {
                if (!imageCache[imageId].loaded)
                    return null;
                return imageCache[imageId].bitmapData;
            }

            return null;
        }

        // return complete event handler
        //
        private function __complete(imageId:Number, queueId:int):Function
        {
            return function(evt:Event):void
            {
                // Remove the event listener
                var loaderInfo:LoaderInfo = evt.target as LoaderInfo;
                loaderInfo.removeEventListener(Event.COMPLETE, arguments.callee);

                var img:Object = imageCache[imageId];
                img.loaded = true;
                img.bitmapData = Bitmap(img.loader.content).bitmapData;
                img.width = loaderInfo.width;
                img.height = loaderInfo.height;
                img.contentType = loaderInfo.contentType;
                img.url = loaderInfo.url;

                // release the memory
                //
                img.loader.unload();

                // For security reasons, I'll check image type 
                // for not allow load flash clips.
                //
                switch (img.contentType) {
                    case "image/jpeg":
                    case "image/gif":
                    case "image/png": break;
                    default:
                        img.loaded = false;
                        throw err("Unknown image format");
                }

                if(queueId > -1)
                    _queue.push([
                        queueId,
                        [img.contentType, img.width, img.height, img.url].join(argEnd)
                    ]);

                //log(["!", queueId, img.width, img.height, img.url])
            }
        }

        private function on_data_status(evt:StatusEvent):void {
            switch (evt.level) {
                case "status":
                    //log(canvasId + ": send")
                    break;
                case "error":
                    _exception = "Image data error"
                    //log(canvasId + ": error")
                    break;
            }
        }

        private function _lockBitmap():void {
            ctx.canvas.bitmapData.lock()
        }

        private function _unlockBitmap():void {
            ctx.canvas.bitmapData.unlock()
        }

        private function stroke():void {
            //log("stroke()")
            ctx.stroke();
        }

        private function fill():void {
            //log("fill()")
            ctx.fill();
        }

        private function fillRect():void {
            var x:Number = getFloat();
            var y:Number = getFloat();
            var w:Number = getFloat();
            var h:Number = getFloat();
            ctx.fillRect(x, y, w, h)
        }

        private function strokeRect():void {
            var x:Number = getFloat();
            var y:Number = getFloat();
            var w:Number = getFloat();
            var h:Number = getFloat();
            ctx.strokeRect(x, y, w, h)
        }

        private function fillText():void {
            var text:String = getString();
            var x:Number = getFloat();
            var y:Number = getFloat();
            var maxWidth:Number = getFloat();
            ctx.fillText(text, x, y, maxWidth)
        }

        private function strokeText():void {
            var text:String = getString();
            var x:Number = getFloat();
            var y:Number = getFloat();
            var maxWidth:Number = getFloat();
            ctx.strokeText(text, x, y, maxWidth)
        }

        // I know, it's against Canvas specs.. 
        // Hopefully it will be added in there somehow...
        private function measureText():String {
            var text:String = getString();

            var m:Object = ctx.measureText(text);
            return [m.width, m.height, m.ascent, m.descent].join(argEnd);
        }

        private function closePath():void {
            ctx.closePath()
        }

        private function clip():void {
            ctx.clip()
        }

        private function scale():void {
            var x:Number = getFloat();
            var y:Number = getFloat();
            //log("scale("+[x,y]+")")
            ctx.scale(x,y)
        }

        private function rotate():void {
            var r:Number = getFloat()
            //log("rotate("+r+")")
            ctx.rotate(r);
        }

        private function translate():void {
            var tx:Number = getFloat();
            var ty:Number = getFloat();
            //log("translate("+[tx,ty]+")")
            ctx.translate(tx,ty);
        }

        private function __transform(c:String):void {
            var m11:Number = getFloat();
            var m12:Number = getFloat();
            var m21:Number = getFloat();
            var m22:Number = getFloat();
            var dx:Number = getFloat();
            var dy:Number = getFloat();
            //log("transform("+[m11,m12,m21,m22,dx,dy]+")")
            if (c == com.transform)
                ctx.transform(m11, m12, m21, m22, dx, dy)
            else
                ctx.setTransform(m11, m12, m21, m22, dx, dy)
        }

        private function crLinGrad():void {
            var id:String = getString();
            var x0:Number = getFloat();
            var y0:Number = getFloat();
            var x1:Number = getFloat();
            var y1:Number = getFloat();
            //log("crLinGrad("+[id,x0,y0,x1,y1]+")")
            styles[id] = ctx.createLinearGradient(x0, y0, x1, y1);
        }

        private function crRadGrad():void {
            var id:String = getString();
            var x0:Number = getFloat();
            var y0:Number = getFloat();
            var r0:Number = getFloat();
            var x1:Number = getFloat();
            var y1:Number = getFloat();
            var r1:Number = getFloat();
            //log("crRadGrad("+[id,x0,y0,x1,y1]+")")
            styles[id] = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
        }

        private function addColorStop():void {
            var id:String     = getString();
            var offset:Number = getFloat();
            var color:String  = getString();
            //log("addColorStop(" + [id,offset,color] + ")")
            styles[id].addColorStop(offset, color);
        }

        private function createPattern():void {
            var id:String  = getString();
            var imageId:Number = getInt();
            var repetition:String = getString();
            //log("createPattern("+[id,imageId,src,repetition]+")")
            var bitmap:BitmapData = __cachedImage(imageId);
            styles[id] = bitmap ? ctx.createPattern(bitmap, repetition) : null;
        }

        private function shadOffX():void {
            ctx.shadowOffsetX = getFloat()
        }

        private function shadOffY():void {
            ctx.shadowOffsetY = getFloat()
        }

        private function shadBlur():void {
            ctx.shadowBlur = getFloat()
        }

        private function shadColor():void {
            ctx.shadowColor = parseStyle()
        }

        private function globA():void {
            ctx.globalAlpha = getFloat()
        }

        private function globCO():void {
            ctx.globalCompositeOperation = getString()
        }

        private function drawImage():void {
            var argc:int = getInt();
            var imageId:Number = getInt();

            var bitmap:BitmapData = __cachedImage(imageId);
            __drawImage(argc, bitmap);
        }

        private function __drawImage(argc:int, image:BitmapData):void {
            var sx:Number;
            var sy:Number;
            var sw:Number;
            var sh:Number;
            var dx:Number;
            var dy:Number;
            var dw:Number;
            var dh:Number;

            if (argc == 3)
            {
                dx = getFloat();
                dy = getFloat();
                //log("drawImage(" + [image, dx, dy].join() + ")")
                if (image)
                    ctx.drawImage(image, dx, dy);
                getArgEnd()
                getArgEnd()
            }
            else if (argc == 5)
            {
                dx = getFloat();
                dy = getFloat();
                dw = getFloat();
                dh = getFloat();
                //log("drawImage(" + [image.src, dx, dy, dw, dh].join() + ")")
                if (image)
                    ctx.drawImage(image, dx, dy, dw, dh);
                getArgEnd()
            }
            else if (argc == 9)
            {
                sx = getFloat();
                sy = getFloat();
                sw = getFloat();
                sh = getFloat();
                dx = getFloat();
                dy = getFloat();
                dw = getFloat();
                dh = getFloat();
                //log("drawImage(" + [image, sx, sy, sw, sh, dx, dy, dw, dh].join() + ")")
                if (image)
                    ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
            }
            //log("drawImage(" + [argc, image, sx, sy, sw, sh, dx, dy, dw, dh].join() + ")")
        }

        private function save():void {
            //log("save()")
            ctx.save()
        }

        private function restore():void {
            //log("restore()")
            ctx.restore()
        }

        private function resize():void {
            newWidth = getInt();
            newHeight = getInt();
            if(newWidth < 1 || newHeight < 1) {
                _exception = "Unexpected canvas size " + [newWidth, newHeight].join("x")
                return
            }
            //log("resize(" + [newWidth,newHeight].join(",") + "), " + [_width, _height])
            if(newHeight != _width || newHeight != _height){
                ctx.resize(newWidth, newHeight);
                _event = CanvasEvent.RESIZE
            }
            resizeHandler(null)
        }

        private function endQueue():void {
            //log("endQueue()")
            bufLen = 0
        }

        // Unfortunately null (\x00) char cannot be transmitted in/from flash via fscommand,
        // therefore fast manipulating with raw image data does not possible.
        // So I'll use flow-zero hack: I add one byte to
        // the pixel value. That will be bit-mask for color values to keep them 
        // in range (1, 255).
        // 
        private function getImageData():String {
            var sx:Number = getFloat();
            var sy:Number = getFloat();
            var sw:Number = getFloat();
            var sh:Number = getFloat();

            var pixelValue:uint, 
                width:uint = uint(sw),
                height:uint = uint(sh);

            // header:
            // I don't think someone will transmit image data with size more than 65535 px...
            // 
            var _imgData:String = __encodePixel((width << 16) + height);

            var i:uint = 0, 
                x:int = int(sx), 
                y:int = int(sy),
                x_:int = x,
                y_:int = y;

            while (i < width * height) {
                pixelValue = ctx.canvas.bitmapData.getPixel32(x_, y_);
                _imgData += __encodePixel(pixelValue);

                if (y_ == y + height) {
                    y_ = y
                } else {
                    x_ += 1
                }
                
                if (x_ == x + width) {
                    x_ = x;
                    y_ += 1
                }
                i += 1;
                if (x_ > 0xffff || y_ > 0xffff) 
                    throw err("Data out of bounds");
            }
            //log(["getImageData("+[sx, sy, sw, sh].join(",")+")", _imgData.length].join(", "))
            
            return _imgData;
        }

        private function __encodePixel(pixelValue:uint):String {
           var  alpha:uint, 
                red:uint, 
                green:uint, 
                blue:uint, 
                mask:uint = 0,
                mask_alpha:uint,
                mask_red:uint,
                mask_green:uint,
                mask_blue:uint;

            alpha = pixelValue >> 24 & 0xFF;
            red = pixelValue >> 16 & 0xFF;
            green = pixelValue >> 8 & 0xFF;
            blue = pixelValue & 0xFF;

            mask_red = uint(! red) << 1
            mask_green = uint(! green) << 2
            mask_blue = uint(! blue) << 3
            mask_alpha = uint(! alpha) << 4

            // note: canvas colors order is RGBA, in flash - ARGB
            return String.fromCharCode( mask_red + mask_green + mask_blue + mask_alpha + 1,
                                        red ^ mask_red, 
                                        green ^ mask_green, 
                                        blue ^ mask_blue, 
                                        alpha ^ mask_alpha );
        }

        private function putImageData():void {
            var argc:int = getInt();
            var width:Number = getFloat();
            var height:Number = getFloat();
            //var rawData:String = getData(width * height * 5);
            var dataStartIndex:uint = bufCursor;
            bufCursor += (width * height * 5)+1;
            var alpha:uint, 
                red:uint, 
                green:uint, 
                blue:uint, 
                mask:uint,
                ofs:uint;

            var dx:Number = getFloat();
            var dy:Number = getFloat(); 
            var dirtyX:Number = 0;
            var dirtyY:Number = 0;
            var dirtyWidth:Number = width;
            var dirtyHeight:Number = height;
            if (argc == 7) {
                dirtyX = getFloat();
                dirtyY = getFloat();
                dirtyWidth = getFloat();
                dirtyHeight = getFloat();
            }

            for (var y:uint=0; y<uint(height); y += 1) {
                for (var x:uint=0; x<uint(width); x += 1) 
                {
                    if (x < dirtyX || y < dirtyY || x > dirtyX + dirtyWidth || y > dirtyY + dirtyHeight) 
                        continue;
                    ofs = dataStartIndex + ((y*5) * width + (x*5));
                    mask = buf.c.charCodeAt(ofs);
                    red = buf.c.charCodeAt(ofs + 1) ^ (mask & 0x2);
                    green = buf.c.charCodeAt(ofs + 2) ^ (mask & 0x4);
                    blue = buf.c.charCodeAt(ofs + 3) ^ (mask & 0x8);
                    alpha = buf.c.charCodeAt(ofs + 4) ^ (mask & 0x10);
                    ctx.canvas.bitmapData.setPixel32(dx + x, dy + y, (alpha << 24) + (red << 16) + (green << 8) + blue)
                }
            }
            //log(["putImageData("+[dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight].join(",")+")", 
                //[width, height].join("x")].join(", "))
        }

        private function isPointInPath():String {
            var x:Number = getInt();
            var y:Number = getInt();
            if (ctx.isPointInPath(x, y)) 
                return "1";
            else
                return "0";
        }

        private function toDataURL ():String {
            var _type:String = getString();
            var qual:Number = getFloat();

            return ctx.canvas.toDataURL(_type, qual);
        }

        // ==================================
        // parser
        //
        private function parseCmd():String
        {
            var cmd:String = getNextChar();
            if (!cmdName[cmd])
                throw err("Unknown command " + cmd)
            if(next() == argEnd) // single char
                getArgEnd()
            return cmd;
        }

        private function parseStyle():String
        {
            var style:String=getString();
            return style;
        }

        private function getString():String
        {
            var str:String = buf.c.substring(bufCursor, buf.c.indexOf(argEnd, bufCursor));
            bufCursor = bufCursor + str.length;
            getArgEnd();
            return str;
        }

        private function getNumber():String
        {
            //123456789012345678901234...
            //1.2679600852380507e+30
            var num:String = buf.c.substring(bufCursor, buf.c.indexOf(argEnd, bufCursor))
            bufCursor = bufCursor + num.length;
            getArgEnd();
            return num;
        }

        private function getInt():Number
        {
            var x:int = parseInt(getNumber());
            return x;
        }

        private function getFloat():Number
        {
            var x:Number = parseFloat(getNumber());
            return x;
        }

        private function getArgEnd():void {
            var next:String = getNextChar();
            if (next != argEnd)
                throw err("Unexpected tail of the argument")
        }

        private function getNextChar():String
        {
            return buf.c.charAt (bufCursor++);
        }

        private function getChar():String
        {
            return buf.c.charAt (bufCursor);
        }

        private function getData(len:Number):String
        {
            var data:String = buf.c.substring(bufCursor, bufCursor + len);
            bufCursor += len + 1;
            return data;
        }

        private function next():String
        {
            return buf.c.charAt (bufCursor);
        }

        private function peek():String
        {
            return buf.c.charAt (bufCursor+1);
        }

        // ======================================
        // debug
        //

        private function log(s:*):void {
            console.background = true
            console.appendText(s + "\n")
        }

        private function err(prx:String = "Parse error: "):Error {
            var errMsg:String = " [" + cmdName[_cmd ]+ "," + bufCursor + "," + buf.c.length + "] " + buf.c.substring(bufCursor > 0 ? bufCursor - 1 : 0, bufCursor+20) + "...";
            return new Error(prx +  errMsg);
        }

        // ======================================
        // utils
        //

        private function saveImage ():void {
            if (!saveAsUrl) return;
            var req:URLRequest = new URLRequest(saveAsUrl);
            sendImageRequest(req);
        }

        private function viewImage ():void {
            if (!viewImageUrl) return;
            var req:URLRequest = new URLRequest(viewImageUrl);
            sendImageRequest(req);
        }

        private function sendImageRequest (req:URLRequest):void {
            req.contentType = "application/octet-stream";
            req.method      = URLRequestMethod.POST;
            req.data        = PNGEncoder.encode(canvas.bitmapData);

            navigateToURL(req, "_self");
        }

        // frameDuration is in microseconds!
        //
        private function __setFrameRate(frameDuration:uint):void {
            var defFrameRate:int = Math.abs(Math.floor(1000 / frameDuration));
            if (defFrameRate == workFrameRate) return;
            if (defFrameRate) {
                workFrameRate = defFrameRate;
                _frameDuration = 0;
            } else {
                workFrameRate = 1000;
                _frameDuration = frameDuration;
                _time = getTimer();
            }
            //log("workFrameRate=" + [workFrameRate, defFrameRate, frameDuration].join(", ") );
            stage.frameRate = workFrameRate;
        }

        /*
        private function httpStatusHandler(event:HTTPStatusEvent):void {
            log("httpStatusHandler: " + event);
        }

        private function ioErrorHandler(event:IOErrorEvent):void {
            log("ioErrorHandler: " + event);
        }
        */
    }
}
