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
 * @author Shinya Muramatsu
 */

package com.googlecode.flashcanvas
{
    import flash.display.Graphics;
    import flash.geom.Matrix;
    import flash.geom.Point;

    public class Draw
    {
        private var graphics:Graphics;
        private var matrix:Matrix;

        public function Draw(graphics:Graphics, matrix:Matrix)
        {
            this.graphics = graphics;
            this.matrix   = matrix;
        }

        public function arc(cx:Number, cy:Number, radius:Number, startAngle:Number, endAngle:Number, anticlockwise:Boolean):void
        {
            if (startAngle == endAngle)
                return;

            var theta:Number = endAngle - startAngle;
            var PI2:Number   = Math.PI * 2;

            if (anticlockwise)
            {
                if (theta <= -PI2)
                    theta = PI2;
                else while (theta >= 0)
                    theta -= PI2;
            }
            else
            {
                if (theta >= PI2)
                    theta = PI2;
                else while (theta <= 0)
                    theta += PI2;
            }

            var angle:Number     = startAngle;
            var segments:Number  = Math.ceil(Math.abs(theta) / (Math.PI / 4));
            var delta:Number     = theta / (segments * 2);
            var radiusMid:Number = radius / Math.cos(delta);

            var dx:Number;
            var dy:Number;
            var diff:Point;
            var cpx:Number;
            var cpy:Number;
            var apx:Number;
            var apy:Number;

            for (var i:int = 0; i < segments; i++)
            {
                angle += delta;
                dx = Math.cos(angle) * radiusMid;
                dy = Math.sin(angle) * radiusMid;
                diff = matrix.deltaTransformPoint(new Point(dx, dy));
                cpx = cx + diff.x;
                cpy = cy + diff.y;

                angle += delta;
                dx = Math.cos(angle) * radius;
                dy = Math.sin(angle) * radius;
                diff = matrix.deltaTransformPoint(new Point(dx, dy));
                apx = cx + diff.x;
                apy = cy + diff.y;

                graphics.curveTo(cpx, cpy, apx, apy);
            }
        }

    }
}
