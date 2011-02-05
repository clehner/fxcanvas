/*
 * FlashCanvas
 *
 * Copyright (c) 2009 Shinya Muramatsu
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
 * @author Colin (developed original ASCanvas)
 * @author Tim Cameron Ryan (developed haXe version)
 * @author Shinya Muramatsu (flashcanvas)
 */

// TODO stroke to path conversion
// TODO Canvas composite operations 'source-over','source-in','source-out','source-atop',
//  'destination-over','destination-in','destination-out','destination-atop',
//  'copy','xor'

package com.googlecode.flashcanvas
{
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.BlendMode;
    import flash.display.CapsStyle;
    import flash.display.Graphics;
    import flash.display.InterpolationMethod;
    import flash.display.JointStyle;
    import flash.display.LineScaleMode;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.display.SpreadMethod;
    import flash.events.Event;
    import flash.geom.ColorTransform;
    import flash.geom.Matrix;
    import flash.geom.Point;
    import flash.geom.Rectangle;
    import flash.text.TextFormat;
    import flash.text.TextField;
    import flash.text.TextFieldAutoSize;
    import flash.text.TextFormat;
    import flash.text.TextLineMetrics;


    public class CanvasRenderingContext2D
    {
        // back-reference to the canvas
        public var _canvas:Canvas;

        // vector shape
        private var shape:Shape;

        // clipping region
        private var clippingMask:Shape;

        // current path
        public var path:Path;

        // first point of the current subpath
        private var startingPoint:Point;

        // last point of the current subpath
        private var currentPoint:Point;

        // stack of drawing states
        private var stateStack:Array = [];

        // drawing state
        public var state:State;

        public function CanvasRenderingContext2D(canvas:Canvas)
        {
            _canvas = canvas;

            shape        = new Shape();
            clippingMask = new Shape();
            shape.mask   = clippingMask;

            path          = new Path();
            startingPoint = new Point();
            currentPoint  = new Point();

            state = new State();
        }

        public function resize(width:int, height:int):void
        {
            // initialize bitmapdata
            _canvas.resize(width, height);

            // initialize drawing states
            stateStack = [];
            state = new State();

            // draw initial clipping region
            beginPath();
            rect(0, 0, width, height);
            clip();

            // clear the current path
            beginPath();
        }

        /*
         * back-reference to the canvas
         */

        public function get canvas():Canvas
        {
            return _canvas;
        }

        /*
         * state
         */

        public function save():void
        {
            stateStack.push(state.clone());
        }

        public function restore():void
        {
            if (stateStack.length == 0)
                return;

            state = stateStack.pop();

            // redraw clipping image
            var graphics:Graphics = clippingMask.graphics;
            graphics.clear();
            graphics.beginFill(0x000000);
            state.clippingPath.draw(graphics);
            graphics.endFill();
        }

        /*
         * transformations
         */

        public function scale(sx:Number, sy:Number):void
        {
            var matrix:Matrix = state.transformMatrix.clone();
            state.transformMatrix.identity();
            state.transformMatrix.scale(sx, sy);
            state.transformMatrix.concat(matrix);

            state.lineScale *= Math.sqrt(Math.abs(sx * sy));
        }

        public function rotate(angle:Number):void
        {
            var matrix:Matrix = state.transformMatrix.clone();
            state.transformMatrix.identity();
            state.transformMatrix.rotate(angle);
            state.transformMatrix.concat(matrix);
        }

        public function translate(tx:Number, ty:Number):void
        {
            var matrix:Matrix = state.transformMatrix.clone();
            state.transformMatrix.identity();
            state.transformMatrix.translate(tx, ty);
            state.transformMatrix.concat(matrix);
        }

        public function transform(m11:Number, m12:Number, m21:Number, m22:Number, dx:Number, dy:Number):void
        {
            var matrix:Matrix = state.transformMatrix.clone();
            state.transformMatrix = new Matrix(m11, m12, m21, m22, dx, dy);
            state.transformMatrix.concat(matrix);

            state.lineScale *= Math.sqrt(Math.abs(m11 * m22 - m12 * m21));
        }

        public function setTransform(... args):void
        {
            var m11:Number, m12:Number, m21:Number, m22:Number, dx:Number, dy:Number;
            if (args.length > 1) {
                m11 = args[0]; 
                m12 = args[1]; 
                m21 = args[2]; 
                m22 = args[3]; 
                dx  = args[4]; 
                dy  = args[5];
            } else {
                m11 = args[0].a; 
                m12 = args[0].b; 
                m21 = args[0].c; 
                m22 = args[0].d; 
                dx  = args[0].tx; 
                dy  = args[0].tx;
            }
            state.transformMatrix = new Matrix(m11, m12, m21, m22, dx, dy);
            state.lineScale = Math.sqrt(Math.abs(m11 * m22 - m12 * m21));
        }

        /*
         * compositing
         */

        public function get globalAlpha():Number
        {
            return state.globalAlpha;
        }

        public function set globalAlpha(value:Number):void
        {
            state.globalAlpha = value;
        }

        public function get globalCompositeOperation():String
        {
            return state.globalCompositeOperation;
        }

        public function set globalCompositeOperation(value:String):void
        {
            state.globalCompositeOperation = value;
        }

        /*
         * colors and styles
         */

        public function get strokeStyle():*
        {
            if (state.strokeStyle is CSSColor)
                return state.strokeStyle.toString();
            else
                return state.strokeStyle;
        }

        public function set strokeStyle(value:*):void
        {
            if (value is String)
                state.strokeStyle = new CSSColor(value);
            else if (value is CanvasGradient || value is CanvasPattern)
                state.strokeStyle = value;
        }

        public function get fillStyle():*
        {
            if (state.fillStyle is CSSColor)
                return state.fillStyle.toString();
            else
                return state.fillStyle;
        }

        public function set fillStyle(value:*):void
        {
            if (value is String)
                state.fillStyle = new CSSColor(value);
            else if (value is CanvasGradient || value is CanvasPattern)
                state.fillStyle = value;
        }

        public function createLinearGradient(x0:Number, y0:Number, x1:Number, y1:Number):LinearGradient
        {
            return new LinearGradient(x0, y0, x1, y1);
        }

        public function createRadialGradient(x0:Number, y0:Number, r0:Number, x1:Number, y1:Number, r1:Number):RadialGradient
        {
            return new RadialGradient(x0, y0, r0, x1, y1, r1);
        }

        public function createPattern(image:*, repetition:String):CanvasPattern
        {
            return new CanvasPattern(image, repetition, this);
        }

        /*
         * line caps/joins
         */

        public function get lineWidth():Number
        {
            return state.lineWidth;
        }

        public function set lineWidth(value:Number):void
        {
            state.lineWidth = value;
        }

        public function get lineCap():String
        {
            if (state.lineCap == CapsStyle.NONE)
                return "butt";
            else if (state.lineCap == CapsStyle.ROUND)
                return "round";
            else
                return "square";
        }

        public function set lineCap(value:String):void
        {
            value = value.toLowerCase();

            if (value == "butt")
                state.lineCap = CapsStyle.NONE;
            else if (value == "round")
                state.lineCap = CapsStyle.ROUND;
            else if (value == "square")
                state.lineCap = CapsStyle.SQUARE;
        }

        public function get lineJoin():String
        {
            if (state.lineJoin == JointStyle.BEVEL)
                return "bevel";
            else if (state.lineJoin == JointStyle.ROUND)
                return "round";
            else
                return "miter";
        }

        public function set lineJoin(value:String):void
        {
            value = value.toLowerCase();

            if (value == "bevel")
                state.lineJoin = JointStyle.BEVEL;
            else if (value == "round")
                state.lineJoin = JointStyle.ROUND;
            else if (value == "miter")
                state.lineJoin = JointStyle.MITER;
        }

        public function get miterLimit():Number
        {
            return state.miterLimit;
        }

        public function set miterLimit(value:Number):void
        {
            state.miterLimit = value;
        }

        /*
         * shadows
         */

        public function get shadowOffsetX():Number
        {
            return state.shadowOffsetX;
        }

        public function set shadowOffsetX(value:Number):void
        {
            state.shadowOffsetX = value;
        }

        public function get shadowOffsetY():Number
        {
            return state.shadowOffsetY;
        }

        public function set shadowOffsetY(value:Number):void
        {
            state.shadowOffsetY = value;
        }

        public function get shadowBlur():Number
        {
            return state.shadowBlur;
        }

        public function set shadowBlur(value:Number):void
        {
            state.shadowBlur = value;
        }

        public function get shadowColor():String
        {
            return state.shadowColor.toString();
        }

        public function set shadowColor(value:String):void
        {
            state.shadowColor = new CSSColor(value);
        }

        /*
         * rects
         */

        public function clearRect(x:Number, y:Number, w:Number, h:Number):void
        {
            if (!isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(h))
                return;

            var graphics:Graphics = shape.graphics;

            graphics.beginFill(0x000000);
            graphics.drawRect(x, y, w, h);
            graphics.endFill();

            _canvas.bitmapData.draw(shape, state.transformMatrix, null, BlendMode.ERASE);

            graphics.clear();
        }

        public function fillRect(x:Number, y:Number, w:Number, h:Number):void
        {
            if (!isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(h))
                return;

            var p1:Point = _getTransformedPoint(x, y);
            var p2:Point = _getTransformedPoint(x + w, y);
            var p3:Point = _getTransformedPoint(x + w, y + h);
            var p4:Point = _getTransformedPoint(x, y + h);

            var graphics:Graphics = shape.graphics;

            _setFillStyle(graphics);
            graphics.moveTo(p1.x, p1.y);
            graphics.lineTo(p2.x, p2.y);
            graphics.lineTo(p3.x, p3.y);
            graphics.lineTo(p4.x, p4.y);
            graphics.lineTo(p1.x, p1.y);
            graphics.endFill();

            _renderShape();
        }

        public function strokeRect(x:Number, y:Number, w:Number, h:Number):void
        {
            if (!isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(h))
                return;

            var p1:Point = _getTransformedPoint(x, y);
            var p2:Point = _getTransformedPoint(x + w, y);
            var p3:Point = _getTransformedPoint(x + w, y + h);
            var p4:Point = _getTransformedPoint(x, y + h);

            var graphics:Graphics = shape.graphics;

            _setStrokeStyle(graphics);
            graphics.moveTo(p1.x, p1.y);
            graphics.lineTo(p2.x, p2.y);
            graphics.lineTo(p3.x, p3.y);
            graphics.lineTo(p4.x, p4.y);
            graphics.lineTo(p1.x, p1.y);

            _renderShape();
        }

        /*
         * path API
         */

        public function beginPath():void
        {
            path.initialize();
        }

        public function closePath():void
        {
            if (path.commands.length == 0)
                return;

            path.commands.push(GraphicsPathCommand.LINE_TO);
            path.data.push(startingPoint.x, startingPoint.y);

            currentPoint.x = startingPoint.x;
            currentPoint.y = startingPoint.y;
        }

        public function moveTo(x:Number, y:Number):void
        {
            if (!isFinite(x) || !isFinite(y))
                return;

            var p:Point = _getTransformedPoint(x, y);

            path.commands.push(GraphicsPathCommand.MOVE_TO);
            path.data.push(p.x, p.y);

            startingPoint.x = currentPoint.x = p.x;
            startingPoint.y = currentPoint.y = p.y;
        }

        public function lineTo(x:Number, y:Number):void
        {
            if (!isFinite(x) || !isFinite(y))
                return;

            // check that path contains subpaths
            if (path.commands.length == 0)
                moveTo(x, y);

            var p:Point = _getTransformedPoint(x, y);

            path.commands.push(GraphicsPathCommand.LINE_TO);
            path.data.push(p.x, p.y);

            currentPoint.x = p.x;
            currentPoint.y = p.y;
        }

        public function quadraticCurveTo(cpx:Number, cpy:Number, x:Number, y:Number):void
        {
            if (!isFinite(cpx) || !isFinite(cpy) || !isFinite(x) || !isFinite(y))
                return;

            // check that path contains subpaths
            if (path.commands.length == 0)
                moveTo(cpx, cpy);

            var cp:Point = _getTransformedPoint(cpx, cpy);
            var  p:Point = _getTransformedPoint(x, y);

            path.commands.push(GraphicsPathCommand.CURVE_TO);
            path.data.push(cp.x, cp.y, p.x, p.y);

            currentPoint.x = p.x;
            currentPoint.y = p.y;
        }

        /*
         * Cubic bezier curve is approximated by four quadratic bezier curves.
         * The approximation uses Fixed MidPoint algorithm by Timothee Groleau.
         *
         * @see http://www.timotheegroleau.com/Flash/articles/cubic_bezier_in_flash.htm
         */
        public function bezierCurveTo(cp1x:Number, cp1y:Number, cp2x:Number, cp2y:Number, x:Number, y:Number):void
        {
            if (!isFinite(cp1x) || !isFinite(cp1y) || !isFinite(cp2x) || !isFinite(cp2y) || !isFinite(x) || !isFinite(y))
                return;

            // check that path contains subpaths
            if (path.commands.length == 0)
                moveTo(cp1x, cp1y);

            var p0:Point = currentPoint;
            var p1:Point = _getTransformedPoint(cp1x, cp1y);
            var p2:Point = _getTransformedPoint(cp2x, cp2y);
            var p3:Point = _getTransformedPoint(x, y);

            // calculate base points
            var bp1:Point = Point.interpolate(p0, p1, 0.25);
            var bp2:Point = Point.interpolate(p3, p2, 0.25);

            // get 1/16 of the [p3, p0] segment
            var dx:Number = (p3.x - p0.x) / 16;
            var dy:Number = (p3.y - p0.y) / 16;

            // calculate control points
            var cp1:Point = Point.interpolate( p1,  p0, 0.375);
            var cp2:Point = Point.interpolate(bp2, bp1, 0.375);
            var cp3:Point = Point.interpolate(bp1, bp2, 0.375);
            var cp4:Point = Point.interpolate( p2,  p3, 0.375);
            cp2.x -= dx;
            cp2.y -= dy;
            cp3.x += dx;
            cp3.y += dy;

            // calculate anchor points
            var ap1:Point = Point.interpolate(cp1, cp2, 0.5);
            var ap2:Point = Point.interpolate(bp1, bp2, 0.5);
            var ap3:Point = Point.interpolate(cp3, cp4, 0.5);

            // four quadratic subsegments
            path.commands.push(
                GraphicsPathCommand.CURVE_TO,
                GraphicsPathCommand.CURVE_TO,
                GraphicsPathCommand.CURVE_TO,
                GraphicsPathCommand.CURVE_TO
            );
            path.data.push(
                cp1.x, cp1.y, ap1.x, ap1.y,
                cp2.x, cp2.y, ap2.x, ap2.y,
                cp3.x, cp3.y, ap3.x, ap3.y,
                cp4.x, cp4.y,  p3.x,  p3.y
            );

            currentPoint.x = p3.x;
            currentPoint.y = p3.y;
        }

        /*
         * arcTo() is decomposed into lineTo() and arc().
         *
         * @see http://d.hatena.ne.jp/mindcat/20100131/1264958828
         */
        public function arcTo(x1:Number, y1:Number, x2:Number, y2:Number, radius:Number):void
        {
            if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2) || !isFinite(radius))
                return;

            // check that path contains subpaths
            if (path.commands.length == 0)
                moveTo(x1, y1);

            var p0:Point  = _getUntransformedPoint(currentPoint.x, currentPoint.y);
            var a1:Number = p0.y - y1;
            var b1:Number = p0.x - x1;
            var a2:Number = y2   - y1;
            var b2:Number = x2   - x1;
            var mm:Number = Math.abs(a1 * b2 - b1 * a2);

            if (mm < 1.0e-8 || radius === 0)
            {
                lineTo(x1, y1);
            }
            else
            {
                var dd:Number = a1 * a1 + b1 * b1;
                var cc:Number = a2 * a2 + b2 * b2;
                var tt:Number = a1 * a2 + b1 * b2;
                var k1:Number = radius * Math.sqrt(dd) / mm;
                var k2:Number = radius * Math.sqrt(cc) / mm;
                var j1:Number = k1 * tt / dd;
                var j2:Number = k2 * tt / cc;
                var cx:Number = k1 * b2 + k2 * b1;
                var cy:Number = k1 * a2 + k2 * a1;
                var px:Number = b1 * (k2 + j1);
                var py:Number = a1 * (k2 + j1);
                var qx:Number = b2 * (k1 + j2);
                var qy:Number = a2 * (k1 + j2);
                var startAngle:Number = Math.atan2(py - cy, px - cx);
                var endAngle:Number   = Math.atan2(qy - cy, qx - cx);

                lineTo(px + x1, py + y1);
                arc(cx + x1, cy + y1, radius, startAngle, endAngle, b1 * a2 > b2 * a1);
            }
        }

        /*
         * Arc is approximated with bezier curves. It uses four segments per circle.
         */
        public function arc(cx:Number, cy:Number, radius:Number, 
                            startAngle:Number, endAngle:Number, 
                            anticlockwise:Boolean = false):void
        {
            if (!isFinite(cx) || !isFinite(cy) || !isFinite(radius) ||
                !isFinite(startAngle) || !isFinite(endAngle))
                return;

            var startX:Number = cx + radius * Math.cos(startAngle);
            var startY:Number = cy + radius * Math.sin(startAngle);

            // check that path contains subpaths
            if (path.commands.length == 0)
                moveTo(startX, startY);
            else
                lineTo(startX, startY);

            if (startAngle == endAngle)
                return;

            // note: with more segments, lines will not be smoother, it's 
            // due to flash rendering feature (bug?)
            var segs:int = 4

            var sweep:Number = endAngle - startAngle
            var PI2:Number   = Math.PI * 2;

            // fixme Is it possible to avoid while? 
            //       Why modulo is not working here in the same time?
            if (anticlockwise)
            {
                if (sweep <= -PI2)
                    sweep = PI2;
                else while (sweep >= 0)
                    sweep -= PI2;
            }
            else
            {
                if (sweep >= PI2)
                    sweep = PI2;
                else while (sweep <= 0)
                    sweep += PI2;
            }

            if( sweep == 0 ) 
                return

            var theta:Number = sweep/(segs*2);
            var theta2:Number = theta*2
            // rotate segments from start angle
            var rot:Number = startAngle
            for(var i:int=0; i<segs; i++) {
                drawArcSegment(cx, cy, radius, theta, rot);
                rot = rot + theta2;
            }
        }

        // Research paper:
        // How to determine the control points of a Bézier curve that approximates a small circular arc
        // Richard A DeVeneza, Nov 2004
        // http://www.tinaja.com/glib/bezcirc2.pdf
        //
        public function drawArcSegment(cx:Number, cy:Number, r:Number, 
                                        theta:Number, phi:Number):void
        {
            var x0:Number = Math.cos(theta);
            var y0:Number = Math.sin(theta);
            //var x3:Number = x0;
            //var y3:Number = -y0;
            var x1:Number = (4-x0)/3;
            var y1:Number = ((1-x0)*(3-x0))/(3*y0);
            var x2:Number = x1;
            var y2:Number = -y1;

            // rotate arc segment at phi and make it fixed on left side
            phi = ((theta) + phi);

            var c:Number = Math.cos(phi);
            var s:Number = -Math.sin(phi);
            // rotate empty matrix
            // m11 = 1, m12 = 0, m21 = 0, m22 = 1
            // m11 = m11*c + m21*s = c
            // m21 = m21*c + m22*s = s
            // m12 = m11*-s + m21*c = -s
            // m22 = m21*-s + m22*c = c
            //
            // mupltiply point
            // x = x*m11 + y*m21 = x*c + y*s
            // y = x*m12 + y*m22 = x*-s + y*c
            // 
            // using it for scaling, translating and rotating
            var x0_:Number = ((x0*c) + (y0*s))*r + cx;
            y0 = ((x0*-s) + (y0*c))*r + cy;
            x0 = x0_;
            var x1_:Number = ((x1*c) + (y1*s))*r + cx;
            y1 = ((x1*-s) + (y1*c))*r + cy ;
            x1 = x1_;
            var x2_:Number = ((x2*c) + (y2*s))*r + cx;
            y2 = ((x2*-s) + (y2*c))*r + cy ;
            x2 = x2_;
            //var x3_:Number = ((x3*c) + (y3*s))*r + cx;
            //y3 = ((x3*-s) + (y3*c))*r + cy ;
            //x3 = x3_;

            bezierCurveTo(x2,y2,x1,y1,x0,y0)
        }
        

        public function rect(x:Number, y:Number, w:Number, h:Number):void
        {
            if (!isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(h))
                return;

            var p1:Point = _getTransformedPoint(x, y);
            var p2:Point = _getTransformedPoint(x + w, y);
            var p3:Point = _getTransformedPoint(x + w, y + h);
            var p4:Point = _getTransformedPoint(x, y + h);

            path.commands.push(
                GraphicsPathCommand.MOVE_TO,
                GraphicsPathCommand.LINE_TO,
                GraphicsPathCommand.LINE_TO,
                GraphicsPathCommand.LINE_TO,
                GraphicsPathCommand.LINE_TO
            );
            path.data.push(
                p1.x, p1.y,
                p2.x, p2.y,
                p3.x, p3.y,
                p4.x, p4.y,
                p1.x, p1.y
            );

            startingPoint.x = currentPoint.x = p1.x;
            startingPoint.y = currentPoint.y = p1.y;
        }


        public function fill():void
        {
            var graphics:Graphics = shape.graphics;
            _setFillStyle(graphics);
            path.draw(graphics);
            graphics.endFill();
            _renderShape();
        }

        public function stroke():void
        {
            var graphics:Graphics = shape.graphics;
            _setStrokeStyle(graphics);
            path.draw(graphics);
            _renderShape();
        }

        public function clip():void
        {
            // extract path
            state.clippingPath = path.clone();

            // draw clip path
            var graphics:Graphics = clippingMask.graphics;
            graphics.clear();
            graphics.beginFill(0x000000);
            path.draw(graphics);
            graphics.endFill();
        }

        public function isPointInPath(x:Number, y:Number):Boolean
        {
            return false
        }

        /*
         * text
         */

        public function get font():*
        {
            return state.font;
        }

        public function set font(value:String):void
        {
            state.font = value;
        }

        // fixme font style regexp
        private function _parseFont():TextFormat
        {
            var format:TextFormat = new TextFormat;
            var fontData:Array = state.font.replace(/\s+/g, " ").split(" ");

            var italic:Boolean = fontData[0] == "italic", 
                bold:Boolean = false,
                size:Number = 15, 
                font:String = "sans-serif";

            if(fontData.length == 4) {
                var weight:Number = parseInt(fontData[1]);
                bold = (!isNaN(weight) && weight > 400 || fontData[1] == "bold");
            }
            size = parseFloat(fontData[fontData.length == 2 ? 0 : 2])
            font = fontData.slice(fontData.length == 2 ? 1 : 3)
                            .join(" ").replace(/["']/g, "");

            format.italic = italic;
            format.size = size;

            if(font == "sans" || font == "sans-serif") // fix for compatibility
                format.font = "_sans"
            else if(font == "serif")
                format.font = "_serif"
            else
                format.font = font

            format.bold = bold

            return format;
        }

        public function get textAlign():*
        {
            return state.textAlign;
        }

        public function set textAlign(value:String):void
        {
            value = value.toLowerCase();

            switch(value) {
                case "start":
                case "end":
                case "left":
                case "right":
                case "center":
                    state.textAlign = value;
            }
        }

        public function get textBaseline():*
        {
            return state.textBaseline;
        }

        public function set textBaseline(value:String):void
        {
            value = value.toLowerCase();

            switch(value) {
                case "top":
                case "hanging":
                case "middle":
                case "alphabetic":
                case "ideographic":
                case "bottom":
                    state.textBaseline = value;
            }
        }

        public function fillText(text:String, x:Number, y:Number, maxWidth:Number = Infinity):void
        {
            _renderText(text, x, y, maxWidth);
        }

        public function strokeText(text:String, x:Number, y:Number, maxWidth:Number = Infinity):void
        {
            _renderText(text, x, y, maxWidth, true);
        }

        public function measureText(text:String):TextLineMetrics
        {
            // parse font style
            var textFormat:TextFormat = _parseFont();

            // Create TextField object
            var textField:TextField     = new TextField();
            textField.autoSize          = TextFieldAutoSize.LEFT;
            textField.defaultTextFormat = textFormat;
            textField.text              = text.replace(/[\t\n\f\r]/g, " ");

            var metrics:TextLineMetrics = textField.getLineMetrics(0);

            return metrics;
        }

        private function _renderText(text:String, x:Number, y:Number, maxWidth:Number, isStroke:Boolean = false):void
        {
            if (/^\s*$/.test(text))
                return;

            if (!isFinite(x) || !isFinite(y) || isNaN(maxWidth))
                return;

            // If maxWidth is less than or equal to zero, return without doing
            // anything.
            if (maxWidth <= 0)
                return;

            var textFormat:TextFormat = _parseFont();

            var style:Object = isStroke ? state.strokeStyle : state.fillStyle;

            // Set text color
            if (style is CSSColor)
                textFormat.color = style.color;

            // Create TextField object
            var textField:TextField     = new TextField();
            textField.autoSize          = TextFieldAutoSize.LEFT;
            textField.defaultTextFormat = textFormat;
            textField.text              = text.replace(/[\t\n\f\r]/g, " ");

            // Get the size of the text
            var width:int  = textField.textWidth;
            var height:int = textField.textHeight;
            var ascent:int = textField.getLineMetrics(0).ascent;

            // Remove 2px margins around the text
            var matrix:Matrix = new Matrix();
            matrix.translate(-2, -2);

            // Convert the text into BitmapData 
            var bitmapData:BitmapData = new BitmapData(width, height, true, 0);
            bitmapData.draw(textField, matrix);

            // Adjust x coordinates
            switch (state.textAlign)
            {
                case "start": break;
                case "end": x -= width; break;
                case "left": break;
                case "right": x -= width; break;
                case "center": x -= width / 2; break;
            }

            // Adjust y coordinates
            switch (state.textBaseline)
            {
                case "top":
                case "hanging": break;
                case "middle": y -= height / 2; break;
                case "alphabetic":
                case "ideographic": y -= ascent; break;
                case "bottom": y -= height; break;
            }

            // Create transformation matrix
            matrix = new Matrix();
            matrix.translate(x, y);
            matrix.concat(state.transformMatrix);

            // Calculate alpha multiplier
            var alpha:Number = state.globalAlpha;
            if (style is CSSColor)
                alpha *= style.alpha;

            var colorTransform:ColorTransform = null;
            if (alpha < 1)
            {
                // Make the BitmapData translucent
                colorTransform = new ColorTransform(1, 1, 1, alpha);
            }

            // draw image with applied clipping path
            var mask:Sprite = new Sprite()

            // draw clip path
            var graphics:Graphics = mask.graphics;
            graphics.clear();
            graphics.beginFill(0x000000);
            state.clippingPath.draw(graphics);
            graphics.endFill();

            var tempData:BitmapData = new BitmapData(canvas.width, canvas.height, true, 0)
            var mc:Bitmap = new Bitmap(tempData, "auto", true);
            mc.mask = mask
            mc.bitmapData.draw(bitmapData, matrix);

            matrix = new Matrix();
            matrix.identity()

            // Render the BitmapData to the Canvas
            _canvas.bitmapData.draw(mc, matrix, colorTransform, __blendMode(), null, true);

            // Release the memory
            tempData.dispose();
            bitmapData.dispose();
        }

        /*
         * drawing images
         */

        public function drawImage(bitmapData:BitmapData, ...args:Array):void
        {
            __drawImage(bitmapData.clone(), args, state)
        }

        /*
         * pixel manipulation
         */

        public function createImageData():*
        {
            // TODO: Implement
        }

        public function getImageData(sx:Number, sy:Number, sw:Number, sh:Number):*
        {
            // TODO: Implement
        }

        public function putImageData():void
        {
            // TODO: Implement
        }

        /*
         * private methods
         */

        private function _getTransformedPoint(x:Number, y:Number):Point
        {
            return state.transformMatrix.transformPoint(new Point(x, y));
        }

        private function _getUntransformedPoint(x:Number, y:Number):Point
        {
            var matrix:Matrix = state.transformMatrix.clone();
            matrix.invert();
            return matrix.transformPoint(new Point(x, y));
        }

        private function _setStrokeStyle(graphics:Graphics, pixelHinting:Boolean = true):void
        {
            var strokeStyle:Object = state.strokeStyle;
            var thickness:Number   = state.lineWidth * state.lineScale;

            if (strokeStyle is CSSColor)
            {
                var color:uint   = strokeStyle.color;
                var alpha:Number = strokeStyle.alpha * state.globalAlpha;
                if (thickness < 1)
                    alpha *= thickness;
                graphics.lineStyle(thickness, color, alpha, 
                    pixelHinting, LineScaleMode.NORMAL, 
                    state.lineCap, 
                    state.lineJoin, state.miterLimit);
            }
            else if (strokeStyle is CanvasGradient)
            {
                var alphas:Array = strokeStyle.alphas;
                if (state.globalAlpha < 1)
                {
                    for (var i:int = 0, n:int = alphas.length; i < n; i++)
                    {
                        alphas[i] *= state.globalAlpha;
                    }
                }

                var matrix:Matrix = strokeStyle.matrix.clone();
                matrix.concat(state.transformMatrix);

                graphics.lineStyle(thickness);
                graphics.lineGradientStyle(strokeStyle.type, strokeStyle.colors, alphas, strokeStyle.ratios, matrix, SpreadMethod.PAD, InterpolationMethod.RGB, strokeStyle.focalPointRatio);
            }
            else if (strokeStyle is CanvasPattern)
            {
                // FIXME
            }
        }

        private function _setFillStyle(graphics:Graphics):void
        {
            // disable stroke
            graphics.lineStyle();

            var fillStyle:Object = state.fillStyle;
            if (fillStyle is CSSColor)
            {
                var color:uint   = fillStyle.color;
                var alpha:Number = fillStyle.alpha * state.globalAlpha;
                graphics.beginFill(color, alpha);
            }
            else if (fillStyle is CanvasGradient)
            {
                var alphas:Array = fillStyle.alphas;
                if (state.globalAlpha < 1)
                {
                    for (var i:int = 0, n:int = alphas.length; i < n; i++)
                    {
                        alphas[i] *= state.globalAlpha;
                    }
                }

                var matrix:Matrix = fillStyle.matrix.clone();
                matrix.concat(state.transformMatrix);

                graphics.beginGradientFill(fillStyle.type, fillStyle.colors, alphas, fillStyle.ratios, matrix, SpreadMethod.PAD, InterpolationMethod.RGB, fillStyle.focalPointRatio);
            }
            else if (fillStyle is CanvasPattern)
            {
                _fillPattern(state);
            }
        }

        private function _fillPattern(state:Object):void
        {
            var fillStyle:Object = state.fillStyle;
            var graphics:Graphics = shape.graphics;

            // TODO: support repetition other than 'repeat'.
            graphics.beginBitmapFill(fillStyle.bitmapData, state.transformMatrix);
        }

        private function _renderShape():void
        {
            _canvas.bitmapData.draw(shape, null, null, __blendMode());
            shape.graphics.clear();
        }

        public function __drawImage(bitmapData:BitmapData, args:Array, _state:State):void
        {
            var source:BitmapData;

            var sx:Number;
            var sy:Number;
            var sw:Number;
            var sh:Number;
            var dx:Number;
            var dy:Number;
            var dw:Number;
            var dh:Number;

            if (args.length == 8)
            {
                // Define the source and destination rectangles
                sx = args[0];
                sy = args[1];
                sw = args[2];
                sh = args[3];
                dx = args[4];
                dy = args[5];
                dw = args[6];
                dh = args[7];

                // Clip the region within the source rectangle
                var sourceRect:Rectangle = new Rectangle(sx, sy, sw, sh);
                var destPoint:Point      = new Point();
                source = new BitmapData(sw, sh, true, 0);
                source.copyPixels(bitmapData, sourceRect, destPoint);
            }
            else
            {
                // Get BitmapData of the image
                source = bitmapData;

                // Define the destination rectangle
                dx = args[0];
                dy = args[1];
                dw = args[2] || source.width;
                dh = args[3] || source.height;
            }

            // Create transformation matrix
            var matrix:Matrix = new Matrix();
            matrix.scale(dw / source.width, dh / source.height);
            matrix.translate(dx, dy);
            matrix.concat(_state.transformMatrix);

            var colorTransform:ColorTransform = null;
            if (state.globalAlpha < 1)
            {
                // Make the image translucent
                colorTransform = new ColorTransform(1, 1, 1, state.globalAlpha);
            }

            // draw image with applied clipping path
            var mask:Sprite = new Sprite()

            // draw clip path
            var graphics:Graphics = mask.graphics;
            graphics.clear();
            graphics.beginFill(0x000000);
            state.clippingPath.draw(graphics);
            graphics.endFill();

            var tempData:BitmapData = new BitmapData(canvas.width, canvas.height, true, 0)
            var mc:Bitmap = new Bitmap(tempData, "auto", true);
            mc.mask = mask
            mc.bitmapData.draw(source, matrix);

            matrix = new Matrix()
            matrix.identity()

            // Draw the image on the Canvas
            _canvas.bitmapData.draw(mc, matrix, colorTransform, __blendMode(), null, true);

            // Release the memory
            source.dispose();
            mc.bitmapData.dispose();
            bitmapData.dispose();
            tempData.dispose();
        }

        // There must be some language similar to pixel shaders for 
        // pixel blending operations in Canvas...
        //
        public function __blendMode():String
        {
            switch (state.globalCompositeOperation) {
                case "lighter": 
                    return BlendMode.ADD;
                case "source-over": 
                    return BlendMode.NORMAL;
                default:
                    throw new Error(state.globalCompositeOperation + " not implemented");
            }
        }
    }
}
