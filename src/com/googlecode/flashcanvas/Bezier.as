package com.googlecode.flashcanvas {
	import flash.display.Graphics;
	import flash.geom.Point;
	/*////////////////////////////////////////////////////////////////////////
 * orginal from Timothee Groleau, 
 * more information: http://timotheegroleau.com/Flash/articles/cubic_bezier_in_flash.htm
//
// Bezier_lib.as - v1.2 - 19/05/02
// Timothee Groleau
//
// The purpose of this file is mainly to provide a function drawCubicBezier
// for the MovieClip prototype to approximate a cubic Bezier curve
// from the quadratic curveTo of the Flash drawing API
//
// By doing so, several useful functions are created to calculate cubic
// bezier points and derivative. Other Bezier functions can be added to
// the _global.Bezier object, like quadratic or quartic function as necessary.
//
// Also a few functions are added to the Math object to handle 2D line equations
//
////////////////////////////////////////////////////////////////////////*/

	public class Bezier {
		public var graphics : Graphics;
		
		public function Bezier(graphics:Graphics=null){
			this.graphics = graphics;
		}
		
		// Return the bezier location at t based on the 4 parameters
		// c0, c1, c2, c3 are respectively the position of the four bezier controls (1D)
		private function getCubicPt(c0:Number, c1:Number, c2:Number, c3:Number, t:Number):Number{
			var ts:Number = t*t;
			var g:Number = 3 * (c1 - c0);
			var b:Number = (3 * (c2 - c1)) - g;
			var a:Number = c3 - c0 - b - g;
			return ( a*ts*t + b*ts + g*t + c0 );
		}
		
		// Return the value of the derivative of the cubic bezier at t
		// c0, c1, c2, c3 are respectively the position of the four bezier controls (1D)
		private function getCubicDerivative(c0:Number, c1:Number, c2:Number, c3:Number, t:Number):Number {
			var g:Number = 3 * (c1 - c0);
			var b:Number = (3 * (c2 - c1)) - g;
			var a:Number = c3 - c0 - b - g;
			return ( 3*a*t*t + 2*b*t + g );
		}
		
		// returns a tangent object of a cubic Bezier curve at t
		// A tangent object comprises two properties, P and l
		// P is a point with two propertiesx and y
		// l is a line with two properties a and b
		private function getCubicTgt(P0:Point, P1:Point, P2:Point, P3:Point, t:Number):Tangent {
			// calculates the position of the cubic bezier at t
			var P:Point = new Point();
			P.x = getCubicPt(P0.x, P1.x, P2.x, P3.x, t);
			P.y = getCubicPt(P0.y, P1.y, P2.y, P3.y, t);
			
			// calculates the tangent values of the cubic bezier at t
			var V:Point = new Point();
			V.x = getCubicDerivative(P0.x, P1.x, P2.x, P3.x, t);
			V.y = getCubicDerivative(P0.y, P1.y, P2.y, P3.y, t);
		
			// calculates the line equation for the tangent at t
			var l:Line = getLine2(P, V);
		
			// return the Point/Tangent object 
			return new Tangent(P,l);
		}
		
		/////////////////////////////////////////////////////////////////////////
		//
		// Draw a cubic Bezier as a Spline approximation
		// (Very fast processing, but clearly far from the true cubic bezier)
		//
		/////////////////////////////////////////////////////////////////////////
		
		// This function draws a approximation of a cubic bezier curve
		// It is very fast but does not look quite the real one
		public function drawCubicBezier_spline(P0:Point, P1:Point, P2:Point, P3:Point) : void {
		
			// calculates middle point of the two control points segment
			var midP_x:Number = (P1.x + P2.x) / 2;
			var midP_y:Number = (P1.y + P2.y) / 2;
			
			// draw fake cubic bezier curve lines (in two parts)
			graphics.curveTo(P1.x, P1.y, midP_x, midP_y);
			graphics.curveTo(P2.x, P2.y, P3.x, P3.y);
		}
		
		/////////////////////////////////////////////////////////////////////////
		//
		// Add a draw cubic bezier curve to the MovieClip prototype
		//
		/////////////////////////////////////////////////////////////////////////
		
		// this function recursively slice down a cubic Bezier segment to avoid parallel tangents
		// the function returns the number of sub segment used to draw the current segment
		private function sliceCubicBezierSegment(P0:Point, P1:Point, P2:Point, P3:Point, u1:Number, u2:Number, Tu1:Tangent, Tu2 : Tangent, recurs:Number) : Number {
		
			// prevents infinite recursion (no more than 10 levels)
			// if 10 levels are reached the latest subsegment is 
			// approximated with a line (no quadratic curve). It should be good enough.
			if (recurs > 10) {
				var P:Point = Tu2.p;
				graphics.lineTo(P.x, P.y);
				return 1;
			}
		
			// recursion level is OK, process current segment
			var ctrlPt:Point = getLineCross(Tu1.l, Tu2.l);
			var d:Number = 0;
			
			// A control point is considered misplaced if its distance from one of the anchor is greater 
			// than the distance between the two anchors.
			if (	(ctrlPt == null) || 
					(distance(Tu1.p, ctrlPt) > (d = distance(Tu1.p, Tu2.p))) ||
					(distance(Tu2.p, ctrlPt) > d) ) {
		
				// total for this subsegment starts at 0
				var tot:Number = 0;
		
				// If the Control Point is misplaced, slice the segment more
				var uMid:Number = (u1 + u2) / 2;
				var TuMid:Tangent = getCubicTgt(P0, P1, P2, P3, uMid);
				tot += sliceCubicBezierSegment(P0, P1, P2, P3, u1, uMid, Tu1, TuMid, recurs+1);
				tot += sliceCubicBezierSegment(P0, P1, P2, P3, uMid, u2, TuMid, Tu2, recurs+1);
				
				// return number of sub segments in this segment
				return tot;
		
			} else {
				// if everything is OK draw curve
				P = Tu2.p;
				graphics.curveTo(ctrlPt.x, ctrlPt.y, P.x, P.y);
				return 1;
			}
		}
		
		// Draws a cubic bezier point approximation, P0 and P3 are the anchor points
		// P1 and P2 are the handle points
		// nSegments denotes how many quadratic bezier segments will be used to
		// approximate the cubic bezier (default is 4);
		public function drawCubicBezier(P0:Point, P1:Point, P2:Point, P3:Point, nSegment:Number):Number {
			//define the local variables
			var curP:Point; // holds the current Point
			var nextP:Point; // holds the next Point
			var ctrlP:Point; // holds the current control Point
			var curT:Tangent; // holds the current Tangent object
			var nextT:Tangent; // holds the next Tangent object
			var total:Number = 0; // holds the number of slices used
			
			// make sure nSegment is within range (also create a default in the process)
			if (nSegment < 2) nSegment = 4;
		
			// get the time Step from nSegment
			var tStep:Number = 1 / nSegment;
			
			// get the first tangent Object
			curT = new Tangent(P0,getLine(P0, P1));
			
			// move to the first point
			// this.moveTo(P0.x, P0.y);
		
			// get tangent Objects for all intermediate segments and draw the segments
			for (var i:int=1; i<=nSegment; i++) {
				// get Tangent Object for next point
				nextT = getCubicTgt(P0, P1, P2, P3, i*tStep);
		
				// get segment data for the current segment
				total += sliceCubicBezierSegment(P0, P1, P2, P3, (i-1)*tStep, i*tStep, curT, nextT, 0)
		
				// prepare for next round
				curT = nextT;
			}
			return total;
		}
		
		/////////////////////////////////////////////////////////////////////////
		//
		// Add a drawCubicBezier2 to the movieClip prototype based on a MidPoint 
		// simplified version of the midPoint algorithm by Helen Triolo
		//
		/////////////////////////////////////////////////////////////////////////
		
		// This function will trace a cubic approximation of the cubic Bezier
		// It will calculate a serie of [control point/Destination point] which 
		// will be used to draw quadratic Bezier starting from P0
		public function drawCubicBezier2(P0:Point, P1:Point, P2:Point, P3:Point):void {
		
			// calculates the useful base points
			var PA:Point = getPointOnSegment(P0, P1, 3/4);
			var PB:Point = getPointOnSegment(P3, P2, 3/4);
			
			// get 1/16 of the [P3, P0] segment
			var dx:Number = (P3.x - P0.x)/16;
			var dy:Number = (P3.y - P0.y)/16;
			
			// calculates control point 1
			var Pc_1:Point = getPointOnSegment(P0, P1, 3/8);
			
			// calculates control point 2
			var Pc_2:Point = getPointOnSegment(PA, PB, 3/8);
			Pc_2.x -= dx;
			Pc_2.y -= dy;
			
			// calculates control point 3
			var Pc_3:Point = getPointOnSegment(PB, PA, 3/8);
			Pc_3.x += dx;
			Pc_3.y += dy;
			
			// calculates control point 4
			var Pc_4:Point = getPointOnSegment(P3, P2, 3/8);
			
			// calculates the 3 anchor points
			var Pa_1:Point = getMiddle(Pc_1, Pc_2);
			var Pa_2:Point = getMiddle(PA, PB);
			var Pa_3:Point = getMiddle(Pc_3, Pc_4);
		
			// draw the four quadratic subsegments
			graphics.curveTo(Pc_1.x, Pc_1.y, Pa_1.x, Pa_1.y);
			graphics.curveTo(Pc_2.x, Pc_2.y, Pa_2.x, Pa_2.y);
			graphics.curveTo(Pc_3.x, Pc_3.y, Pa_3.x, Pa_3.y);
			graphics.curveTo(Pc_4.x, Pc_4.y, P3.x, P3.y);
		}

		/////////////////////////////////////////////////////////////////////////
		//
		// Add a few line functions to the Math object
		//
		/////////////////////////////////////////////////////////////////////////
		
		// Gets a line equation as two properties (a,b) such that (y = a*x + b) for any x
		// or a unique c property such that (x = c) for all y
		// The function takes two points as parameter, P0 and P1 containing two properties x and y
		private function getLine(P0:Point, P1:Point):Line{
			var l:Line = new Line();
			var x0 : Number = P0.x;
			var y0 : Number = P0.y;
			var x1 : Number = P1.x;
			var y1 : Number = P1.y;
			
			if (x0 == x1) {
				if (y0 == y1) {
					// P0 and P1 are same point, return null
					l = null;
				} else {
					// Otherwise, the line is a vertical line
					l.c = x0;
				}
			} else {
				l.a = (y0 - y1) / (x0 - x1);
				l.b = y0 - (l.a * x0);
			}

			// returns the line object
			return l;
		}
			
		// Gets a line equation as two properties (a,b) such that (y = a*x + b) for any x
		// or a unique c property such that (x = c) for all y
		// The function takes two parameters, a point P0 (x,y) through which the line passes
		// and a direction vector v0 (x,y)
		private function getLine2(P0 : Point, v0:Point) : Line {
			var l:Line = new Line;
			var x0:Number = P0.x;
			var vx0:Number = v0.x;
			
			if (vx0 == 0) {
				// the line is vertical
				l.c = x0
			} else {
				l.a = v0.y / vx0;
				l.b = P0.y - (l.a * x0);
			}
			
			// returns the line object
			return l;
		}
			
		// return a point (x,y) that is the intersection of two lines
		// a line is defined either by a and b parameters such that (y = a*x + b) for any x
		// or a single parameter c such that (x = c) for all y
		private function getLineCross(l0:Line, l1:Line):Point {
			// define local variables
			var a0:Number = (l0 == null)?0:l0.a;
			var b0:Number = (l0 == null)?0:l0.b;
			var c0:Number = (l0 == null)?NaN:l0.c;
			var a1:Number = (l1 == null)?0:l1.a;
			var b1:Number = (l1 == null)?0:l1.b;
			var c1:Number = (l1 == null)?NaN:l1.c;
			var u:Number;
	
			// checks whether both lines are vertical
			if ((isNaN(c0)) && (isNaN(c1))) {
		
				// lines are not verticals but parallel, intersection does not exist
				if (a0 == a1) return null; 
		
				// calculate common x value.
				u = (b1 - b0) / (a0 - a1);		
				
				// return the new Point
				return new Point(u,(a0*u + b0));
		
			} else {
		
				if (isNaN(c0) != true) {
					if (isNaN(c1) != true) {
						// both lines vertical, intersection does not exist
						return null;
					} else {
						// return the point on l1 with x = c0
						return new Point(c0,(a1*c0 + b1));
					}
		
				} else if (isNaN(c1) != true) {
					// no need to test c0 as it was tested above
					// return the point on l0 with x = c1
					return new Point(c1,(a0*c1 + b0));
				}
			}

			return null;
		}
	
		// return the distance between two points
		private function distance(P0:Point, P1:Point):Number{
			var dx:Number = P0.x - P1.x;
			var dy:Number = P0.y - P1.y;
			
			return Math.sqrt(dx*dx + dy*dy);
		}
		
		// return the middle of a segment define by two points
		private function getMiddle(P0:Point, P1:Point):Point {
			return new Point(((P0.x + P1.x) / 2),((P0.y + P1.y) / 2));
		}
		
		// return a point on a segment [P0, P1] which distance from P0
		// is ratio of the length [P0, P1]
		private function getPointOnSegment(P0:Point, P1:Point, ratio:Number):Point {
			return new Point((P0.x + ((P1.x - P0.x) * ratio)),(P0.y + ((P1.y - P0.y) * ratio)));
		}
	}
}

import flash.geom.Point;
class Line {
	public var a : Number=0;
	public var b : Number=0;
	public var c : Number=NaN;
	public function Line(a:Number=0,b:Number=0,c:Number=NaN){
		this.a = a;
		this.b = b;
		this.c = c;
	}
}

class Tangent {
	public var p:Point;
	public var l:Line;

	public function Tangent(pt:Point,line:Line){
		this.p = pt;
		this.l = line;
	}
}