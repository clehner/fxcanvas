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
    import flash.display.GradientType;
    import flash.geom.Matrix;

    public class LinearGradient extends CanvasGradient
    {
        public function LinearGradient(x0:Number, y0:Number, x1:Number, y1:Number)
        {
            type = GradientType.LINEAR;

            var dx:Number = x1 - x0;
            var dy:Number = y1 - y0;
            var cx:Number = (x0 + x1) / 2;
            var cy:Number = (y0 + y1) / 2;

            var  d:Number = Math.sqrt(dx * dx + dy * dy);
            var tx:Number = cx - d / 2; 
            var ty:Number = cy - d / 2;

            var rotation:Number = Math.atan2(dy, dx);

            matrix = new Matrix();
            matrix.createGradientBox(d, d, rotation, tx, ty);
        }
    }
}
