/*
 * drawarea.js
 *
 * simple drawing area script for various canvas testing purposes
 *
 * Copyright (c) 2010 Evgen Burzak <buzzilo at gmail.moc>
 * Released under the MIT/X License
 */
$Unit(__PATH__, __FILE__, function(unit)
{
  $Import(unit, "geom.*", "browser" );

  $Package("buz.fxcanvas.test", function(group)
  {
    var ctx, canvas, 
        knot = 0,
        knots = 0, 
        cmd = "", 
        cmd_args = 1,
        path = [],
        cmd_btn,
        changed = false,
        grab = null,
        mouse = new unit.Point(0, 0),
        transform = {tx:0, ty:0, rotate:0, scale:0},
        pointInPath = false,
        testPointInPath = false;

    var fillStyle = "rgba(255,255,255,.3)",
        fillStyleInPath = "rgba(255,102,102,.7)",
        strokeStyle = "#fff",
        lineWidth = 3;

    Array.prototype.extend = function (ext) {
        for(var i=0; i<ext.length; i++) {
            this.push(ext[i])
        }
    }

    Array.prototype.last = function (offset) {
        var index = this.length - (1 + (-offset || 0))
        return index > 0 ? this[index] : null;
    }

    function addKnot(p) {
        if (!cmd) return
        if (knots > cmd_args - 1) {
            knot += 1
            knots = 0
            path[knot] = [cmd, []]
        }
        //if (!path[knot] || knots > cmd_args - 1) {
        //}
        if(p.x) path[knot][1].extend([p.x, p.y])
        knots += 1
    }

    function setKnot(p) {
        var args;
        if (grab) {
            args = path[grab[0]][1]
            args[grab[1]] = p.x
            args[grab[1]+1] = p.y
        } else {
            args = path[knot][1]
            args[args.length-1] = p.y
            args[args.length-2] = p.x
        }
    }

    function drawGrid() {
      var cellWidth = 50, cellHeight = 50,
          canvasWidth = canvas.width,
          canvasHeight = canvas.height;

      ctx.lineWidth = 1;
      ctx.strokeStyle = "#555"
      ctx.beginPath()
      var x = 0, y = 0;
      for (var col = 0; x < canvasWidth; col++) {
        x = cellWidth * col
        ctx.moveTo(x, 0)
           .lineTo(x, canvasWidth);
      }
      for (var row = 0; y < canvasHeight; row++) {
        y = cellHeight * row
        ctx.moveTo(0, y)
           .lineTo(canvasWidth, y);
        //ctx.lineTo(y, canvas.cellHeight); 
      }
      ctx.stroke()
    }

    function drawBoundingBox(mouse) { 
        var bbox = ctx.getPathBounds()
        var inbounds = ctx.isPointInPathBounds(mouse._x, mouse._y)
        ctx.setStrokeStyle( inbounds ? 
                "rgba(255, 204, 102, .8)" : 
                "rgba(153, 255, 51, .8)")
            .setLineWidth(1)
            .strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
        //console.log(bbox)
    }

    function drawKnot(p, width, height, style) {
        var w = width || 10, 
            h = height || 10, 
            hook_width = 20,
            hook_height = 20;

        //ctx.fillRect(p.x - (w / 2), p.y - (h / 2), w, h)
        ctx.setFillStyle(style || "rgba(178, 255, 0, .8)")
            .beginPath()
            .rect(p.x - (w / 2), p.y - (h / 2), w, h)
            .fill()
            .rect(p.x - (hook_width / 2), p.y - (hook_height / 2), hook_width, hook_height)
    };

    function drawControlPoints() {
        var i, st, a, c, l, q,
            blue = "rgba(76, 0, 255, .8)", // blue
            pink = "rgba(255, 51, 102, .8)", // pink
            green = "rgba(51, 255, 51, .8)", // green
            orange = "rgba(255, 153, 51, .8)"; // orange

        ctx.strokeStyle = "rgba(175, 178, 171, .8)"
        ctx.lineWidth = 1

        var p = new unit.Point(), x0 = 0, y0 = 0;

        for(i=0; i<path.length; i++) {
            c = path[i][0]
            a = path[i][1]
            l = a.length
            for (q=0; q<l; q += 2) {
                st = blue
                p.x = a[q], p.y = a[q+1]

                if (x0 || y0) {
                    ctx.beginPath()
                        .moveTo(x0, y0)
                        .vectorTo(p.x, p.y)
                        .stroke();
                }
                switch(q) {
                    case 0:
                        if (l == 4) st = green
                        else if (l == 6) st = orange
                        break
                    case 2:
                        if (l == 6) st = pink
                    default:
                }
                drawKnot(p, 5, 5, st)
                if (ctx.isPointInPath(mouse.x, mouse.y)) {
                    grab = [i, q]
                }
                x0 = a[q]
                y0 = a[q+1]
            }
        }
    };

    function draw(mouse) {
        //console.log(path.length)
        if (!path.length) return;
        ctx.save();
        clearCanvas()
        drawGrid()
        ctx.translate(transform.tx, transform.ty)
        ctx.rotate(transform.rotate)
        ctx.scale(transform.scale, transform.scale)
        ctx.beginPath()
        var i, x, c, a, args;
        drawPath:
            for(i=0; i<path.length; i++) {
                c = path[i][0]
                a = path[i][1]

                switch(c) {
                    case "moveTo":
                        if (!a.length) break drawPath;
                        args = a;
                        break;
                    case "lineTo":
                        if (!a.length) break drawPath;
                        args = a;
                        break;
                    case "quadraticCurveTo":
                        if (a.length < 4) break drawPath;
                        args = a;
                        break;
                    case "bezierCurveTo":
                        if (a.length < 6) break drawPath;
                        args = a;
                        break;
                    case "arcTo":
                        if (a.length < 4) break drawPath;
                        var tail = path.last(-1) && path.last(-1)[1],
                            x1 = a[0], 
                            y1 = a[1],
                            x2 = a[2],
                            y2 = a[3],
                            args = [x1, y1, x2, y2, 10];
                        break;
                    case "arc":
                        if (a.length < 4) break drawPath;
                        var x = a[0],
                            y = a[1],
                            rx = a[2],
                            ry = a[3],
                            p = new unit.Point(x, y),
                            v = p.vectorTo(rx, ry),
                            r = Math.sqrt(v.x * v.x + v.y * v.y),
                            args = [x, y, r, 0, 360 * Math.PI/180, false];
                        break;
                    case "rect":
                        if (a.length < 4) break drawPath;
                        var x1 = a[0],
                            y1 = a[1],
                            x2 = a[2],
                            y2 = a[3],
                            p = new unit.Point(x1, y1),
                            v = p.vectorTo(x2, y2),
                            w = v.x, h = v.y,
                            args = [x1, y1, w, h]
                        break
                }
                ctx[c].apply(ctx, args)
            }

        var pointInPath = testPointInPath && ctx.isPointInPath(mouse._x, mouse._y);
        ctx.setFillStyle(pointInPath ? fillStyleInPath : fillStyle)
            .setStrokeStyle(strokeStyle)
            .setLineWidth(lineWidth)
            .stroke()
            .fill();

        drawBoundingBox(mouse);
        ctx.restore();
    }

    function getRelativeCoords (p, element, event) {
        var osl = 0
        var ost = 0
        var el = element
        while (el) {
            osl += el.offsetLeft
            ost += el.offsetTop
            el = el.offsetParent
        }
        p.x = event.pageX - osl
        p.y = event.pageY - ost
        p._x = p.x
        p._y = p.y
        return p
    }

    addDOMLoadEvent(function () {
        // disable text selection in IE
        if (unit.browser.isIE)
          document.onselectstart = function () { return false; };

        var mouseDown = true;
        canvas = document.getElementById("drawarea");
        ctx = canvas.getContext("2d");
        canvas.translate = function (tx, ty) {
          transform.tx = tx
          transform.ty = ty
        };
        canvas.rotate = function (angle) {
          transform.rotate = angle
        };
        canvas.scale = function (sc) {
          transform.scale = sc
        };
        canvas.draw = function () {
          mouse._x = mouse._y = mouse.x = mouse.y = 0
          draw(mouse);
          drawControlPoints()
        };
        var buttons = document.getElementsByTagName("button")
        for(var i=0; i<buttons.length; i++) {
            var btn = buttons[i];
            w3c(btn)
            btn.addEventListener('mousedown', function () {
            }, false);
            btn.addEventListener('click', function () {
                if (this.id == "clear") {
                    this.className = 'released';
                    clear()
                } else {
                    if (cmd && knots < cmd_args) {
                        alert("not enough arguments for command " + cmd + " (" + cmd_args + ")")
                        return;
                    }
                    this.className = "pressed"
                    if (cmd_btn && cmd_btn != this) {
                        cmd_btn.className = "released"
                    }
                    cmd_btn = this
                    var id = this.id.split("_")
                    cmd = id[0],
                    cmd_args = parseInt(id[1]);
                    knots = 0
                    if (path.length) knot += 1
                    path[knot] = [cmd, []]
                }
            }, false);
        }

        canvas.addEventListener("mousemove", function (e) {
            if (e.shiftKey) return
            getRelativeCoords(mouse, this, e);
            ctx.transformMatrix.multiplyPoint(mouse);
            if (mouseDown) changed = true;
        }, false);

        canvas.addEventListener("mousedown", function (e) {
            getRelativeCoords(mouse, this, e);
            ctx.transformMatrix.multiplyPoint(mouse);
            if (e.shiftKey) {
                testPointInPath = true;
                draw(mouse);
                return
            }
            testPointInPath = false;
            if (!cmd) return;
            grab = null
            mouseDown = true
            drawControlPoints()
            if (!grab) addKnot(mouse)
            draw(mouse);
            changed = true;
        }, false);

        canvas.addEventListener("mouseup", function (e) {
            //console.dir(path)
            mouseDown = false
            testPointInPath = false;
            draw(mouse);
            drawControlPoints();
            changed = true;
        }, false);

        // run the main drawing in frame loop to avoid browser hang ups
        canvas.onframe = function () {
            if (!changed) return;
            draw(mouse);
            drawControlPoints()
            if (mouseDown && path.length) {
                setKnot(mouse)
                drawKnot(mouse)
            }
            changed = false;
        };

        clear();

        if (!unit.browser.isIE)
            canvas.style.cursor = "crosshair";
    });

    function clear() {
        clearTransform()
        clearCanvas()
        clearPath()
        drawGrid()
    }

    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    function clearPath() {
        knot = 0
        knots = 0
        cmd = ""
        cmd_args = 1
        path = []
        if (cmd_btn) cmd_btn.className = "released"
    }

    function clearTransform() {
        transform.tx = 0
        transform.ty = 0
        transform.rotate = 0
        transform.scale = 1
    }

  });
});
