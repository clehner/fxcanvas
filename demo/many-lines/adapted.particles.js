// Super Simple Particle System
// Eric Ishii Eckhardt for Adapted
// http://adaptedstudio.com
//


var _r;
var _g;
var _b;
var _a = .5;
var rad = 100;
var particleList;
var system;
var particleColor;
var systemSize = 250;
var lots = true;

var pcMode = false;
var fadeStage = false;
var grayScale = false;
var dx = 2;
var dy = 4;
var lineColor = 'rgba(255,0,100,.2)';
var particleCount = 0;
var particleList = {}; 



function draw() {
	// FOR PARICLES NOT LINES
	//clear();
	
	// UPDATE PARTICLE SYSTEM
	if (system){
		system.update();
	}
		
	// FOR FADING LINES
	if (fadeStage){
		fade();	
	}
}

function initParticleSystem(){
	system = new ParticleSystem();
	system.init(systemSize);
}

function ParticleSystem(){
	//this.init(systemSize);
}

ParticleSystem.prototype.init = function(_systemSize){
	this.list = [];
	var i = 0;
	for(i=0; i < _systemSize+1; i++){
		this.createParticle();
	}
}

ParticleSystem.prototype.createParticle = function(){
	var newParticle = new Particle();
	newParticle.init();
	this.list.push(newParticle);
}

ParticleSystem.prototype.update = function(){
	var i = 0;
	for(i = 0; i < systemSize-1; i++){
		this.list[i].draw();
	}
}


function Particle(){
	// Particle
}


Particle.prototype.init = function(){
	setColor(this);
	this.x = Math.random() * WIDTH;
	this.y = Math.random() * HEIGHT;
	this.vel = Math.random() * 5 + 1;
	this.ang = Math.random() * (Math.PI);
	this.diameter = Math.random() * 5 + 1;
	this.oldX = this.x;
	this.oldY = this.y;
	this.speedModX = Math.random() * 20 + 8;
	this.speedModY = Math.random() * 20 + 8;
	this.speedModTargX = Math.random() * 3 + 2;
	this.speedModTargY = Math.random() * 3 + 2;
	this.maxSpeed = Math.random() * 20 + 5;
	this.speedX = 0;
	this.speedY = 0;
}

Particle.prototype.draw = function(){
	ctx.fillStyle = this.color;
	
	var _x = this.x;
	var _y = this.y;
	var _d = this.diameter;
	var _vel = this.vel;
	var _ang = this.ang;
	var _smx = this.speedModX;
	var _smy = this.speedModY;
	
	var _sX = this.speedX;
	var _sY = this.speedY;
	
	this.oldX = _x;
	this.oldY = _y;
	
	var targSpeedX = (cursorX - _x)/this.speedModTargX;
	var targSpeedY = (cursorY - _y)/this.speedModTargY;
	
	var maxSpeed = this.maxSpeed;
	if (Math.abs(_sX) > maxSpeed){
		if (_sX > 0){
			_sX = maxSpeed;
		} else {
			_sX = 0 - maxSpeed;
		}
	}
	if (Math.abs(_sY) > maxSpeed){
		if (_sY > 0){
			_sY = maxSpeed;
		} else {
			_sY = 0 - maxSpeed;
		}
	}
	
	_sX += (targSpeedX - _sX)/_smx;
	_sY += (targSpeedY - _sY)/_smy;
	
	_x += _sX;
	_y += _sY;
	
	this.speedX = _sX;
	this.speedY = _sY;
	
	this.x = _x;
	this.y = _y;
	this.vel = _vel;
	this.ang = _ang;
	
	particleLine(this)
	
}

function particleLine(p) {
	
	
	var _x = p.x;
	var _y = p.y;
	var _oldX = p.oldX;
	var _oldY = p.oldY;
	ctx.lineWidth = .5;
	if (p.colorTint > 5){
		ctx.lineWidth = 1.2;	
	}
	ctx.strokeStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(_oldX,_oldY);
    ctx.lineTo(_x,_y);
    ctx.stroke();
	
}



// Chooses Grayscale or color image
function setColor(targ){
	if (grayScale){
		var gryV = Math.round(Math.random()*100);
		var gryA = (Math.random()*.35);
		targ.color = 'rgba('+gryV+','+gryV+','+gryV+','+gryA+')';
	} else {
		var colorTint = Math.round(Math.random() * 7);
		targ.colorTint = colorTint;
		//getColor(colorTint);
		_a = .55;
		if (colorTint <= 1){
			_r = 255;
			_g = 0;
			_b = 144;
			targ.color = 'rgba(255,0,144,'+_a+')';
		} else if (colorTint == 2){
			_r = 0;
			_g = 209;
			_b = 255;	
			targ.color = 'rgba(0,209,255,'+_a+')';
		} else if (colorTint == 3){
			_r = 0;
			_g = 255;
			_b = 4;	
			targ.color = 'rgba(0,255,4,'+_a+')';
		} else if (colorTint == 4){
			_r = 100;
			_g = 0;
			_b = 255;
			targ.color = 'rgba(100,0,255,'+_a+')';
		} else if (colorTint == 5){
			_r = 255;
			_g = 70;
			_b = 0;
			targ.color = 'rgba(255,70,0,'+_a+')';
		} else if (colorTint > 5){
			_r = 255;
			_g = 255;
			_b = 255;
			targ.color = 'rgba(255,255,255,'+_a+')';
		}
		
	}
}

// UI Checkbox Toggles Toggles
function toggleFade(){
	log("toggle fade");
	if (fadeStage == false){
		fadeStage = true;
	} else {
		fadeStage = false;
	}
}

function toggleColor() {
	log("toggle color");
	if (grayScale == false){
		grayScale = true;
	} else {
		grayScale = false;
	}
	
	var i = 0;
	for(i = 0; i < systemSize-1; i++){
		var curItem = system.list[i];
		curItem.grayScale = grayScale;
		setColor(curItem);
	}
}

function toggleAmount(){
	if (lots == false){
		lots = true;
		systemSize = 150;
	} else {
		lots = false;
		systemSize = 10;
	}
	
	initParticleSystem();
}


