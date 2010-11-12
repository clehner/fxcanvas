var x = 150;
var y = 150;
var oldX = 150;
var oldY = 150;

var ctx;
var ctCanvas;
var WIDTH = 2000;
var HEIGHT = 1000;

var intervalID = 0;
var cursorX = 150;
var cursorY = 150;
var fadeRate = .05;
var showLog = false;


function init() {
  	//ctx = $('#canvas')[0].getContext('2d');
  	ctx = $('#canvas')[0].getContext('2d');
	HEIGHT =  window.innerHeight;
 	WIDTH =  window.innerWidth;
	ctCanvas = document.getElementById("canvas");
	  	
  	if ($.browser.msie && document.all){
  		//alert("PC MODE");
  		//setTimeout("initCanvasSize();",3000);
  		pcMode = true;
  		showLog = false;
  		initCanvasSize();
  	} else {
  		initCanvasSize();
  	}
  ctx = document.getElementById('canvas').getContext('2d');
	ctx.globalCompositeOperation = "source-over";


	intervalId = setInterval(draw, 1);
	return intervalId;

}

function initCanvasSize(){
	// check for IEs innerHeight alternative
	if (!pcMode){
		HEIGHT =  window.innerHeight;
 		WIDTH =  window.innerWidth;
 	} else {
		WIDTH = document.body.clientWidth;
		HEIGHT = document.documentElement.clientHeight;
	}
	
	ctCanvas.width = WIDTH - 15;
	ctCanvas.height = HEIGHT;
	
	log(window.innerHeight);
}

function onMouseMove(evt) {
  cursorX = evt.pageX;
  cursorY = evt.pageY;
}

function line(x,y,r) {
	ctx.lineWidth = 1;
	ctx.strokeStyle = lineColor;
    ctx.beginPath();
    ctx.moveTo(oldX,oldY);
    ctx.lineTo(x,y);
    ctx.stroke();
	
	oldX = x;
	oldY = y;
}

function circle(x,y,r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI*2, true);
  ctx.closePath();
  ctx.fill();
}


function rect(x,y,w,h) {
  ctx.beginPath();
  ctx.rect(x,y,w,h);
  ctx.closePath();
  ctx.fill();
}

function fade() {
  ctx.fillStyle = "rgba(255, 255, 255, "+fadeRate+")"
  ctx.beginPath();
  ctx.rect(0,0,WIDTH,HEIGHT);
  ctx.closePath();
  ctx.fill();
}

function clear() {
	ctx.clearRect(0, 0, WIDTH, HEIGHT);
}

$(document).mousemove(onMouseMove);

// Logging that i can turn off
function log(m){
	if (showLog){
		console.log(m);
	}
}

