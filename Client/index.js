
// WebGLRenderingContext
var gl;

var canvasWidth;
var canvasHeight;

// Program attribute & uniform locations.
var locations;
var switchShaderProgram; // function

// WebGL buffers & sizes.
var vertexPosition;
var vertexTextureCoord;
var vertexIndex;
var vertexGridPosition;
var vertexGridDepth;

// WebGL texture and format.
var textures;

// Model-view-projection matrices.
var mvMatrix;
var pMatrix;

// Object.
var kinectData;

// Performance monitor.
var statsRender;
var statsSocket;
var statsServer;
var msStatsServer;	// milliseconds sent from server.

var webSocket;

var mode = 0;

var debugElement;

var currentlyPressedKeys = {};
var mouseX = 0;
var mouseY = 0;
var cameraX = 0;
var cameraY = 0;

$(function () {
	debugElement = $("#debug");
	
	statsRender = initStats(0, "stats-render");
	statsSocket = initStats(0, "stats-socket");
	statsServer = initStats(1, "stats-server");
	webGLStart();
	
	// WebSocket.
	webSocket = initWebSocket();
	webSocket.onmessage = onWebSocketReceive;
	
	$("input:radio").change(onRadioChange);
	
	kinectData = {};
	kinectData.isAvailable = false;
	kinectData.mode = -1;
	kinectData.arrayBufferView = null;
	
	setInterval(updateStatsServer, 1000);
	
	$(document).keydown(keyDownListener);
	$(document).keyup(keyUpListener);
	document.addEventListener( 'mousemove', mouseMoveListener, false );
	
	gl.viewport(0, 0, canvasWidth, canvasHeight);
	initDraw(mode);
	tick();
});


// Show performance monitor.
var initStats = function(mode, id) {
	var stats = new Stats();
	stats.setMode(mode);
	document.getElementById(id).appendChild(stats.domElement);
	return stats;
};


// Manually set values on stats.js for server.
// (note that this hacks into stats.js by simulating private function updateGraph)
var updateStatsServer = function() {
	var isMSGraph = true;
	var height = Math.min( 30, 30 - ( msStatsServer / 200 ) * 30 );
	
	var i = isMSGraph ? 1 : 0;
	var textElement = statsServer.domElement.children[i].children[0]; // #fpsText or #msText.
	var graphElement = statsServer.domElement.children[i].children[1]; // #fpsGraph or #msGraph.
	
	textElement.textContent = msStatsServer + " MS";
	
	var child = graphElement.appendChild( graphElement.firstChild );
	child.style.height = height + 'px';
};


var onRadioChange = function(event) {
	$(document).focus();
	mode = parseInt(event.target.value);
	switchShaderProgram(mode);
	initDraw(mode);
	webSocket.send(new Int16Array([mode]));
};


var webGLStart = function() {
	// Get WebGL context.
	var canvas = document.getElementById("main-canvas");
	canvasWidth = canvas.width;
	canvasHeight = canvas.height;
	gl = initGL(canvas);
	
	// Get shader program's uniform & attribute locations.
	obj = initShaders(gl);
	locations = obj.locations;
	switchShaderProgram = obj.switchShaderProgram;
	
	// Set buffers & get reference to them.
	buffers = initBuffers(gl);
	vertexPosition = buffers.vertexPosition;
	vertexTextureCoord = buffers.vertexTextureCoord;
	vertexIndex = buffers.vertexIndex;
	vertexGridPosition = buffers.vertexGridPosition;
	vertexGridDepth = buffers.vertexGridDepth;
	
	textures = initTexture(gl);
	
	// Model-view-projection matrices.
	mvMatrix = mat4.create();
	pMatrix = mat4.create();
	
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
};


var initDraw = function(mode) {
	switch (mode) {
		case 0:
		case 1:
			initDrawTexture(mode);
			break;
			
		case 2:
			initDrawPoints(mode);
			break;
			
		case 3:
			initDrawPoints2(mode);
			break;
	}
};

var loopDraw = function(mode) {
	switch (mode) {
		case 0:
		case 1:
			gl.drawElements(gl.TRIANGLES, vertexIndex.numItems, gl.UNSIGNED_SHORT, 0);
			break;
			
		case 2:
			gl.uniformMatrix4fv(locations[mode].mvMatrixUniform, false, mvMatrix);
			gl.drawArrays(gl.POINTS, 0, vertexGridPosition.numItems);
			break;
			
		case 3:
			gl.uniformMatrix4fv(locations[mode].mvMatrixUniform, false, mvMatrix);
			gl.drawArrays(gl.POINTS, 0, 307200);
			break;
	}
};

var initDrawTexture = function(mode) {
	mat4.perspective(90, canvasWidth / canvasHeight, 0.1, 100.0, pMatrix);
	mat4.identity(mvMatrix);
	mat4.translate(mvMatrix, [0.0, 0.0, -1.0]);
	mat4.scale(mvMatrix, [canvasWidth/canvasHeight, 1.0, 1.0]); // stretch cube.
	
	// Vertex positions.
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosition.webGLBuffer);
	gl.vertexAttribPointer(locations[mode].vertexPositionAttribute, vertexPosition.itemSize, gl.FLOAT, false, 0, 0);
	
	// Vertex texture coordinates.
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexTextureCoord.webGLBuffer);
	gl.vertexAttribPointer(locations[mode].textureCoordAttribute, vertexTextureCoord.itemSize, gl.FLOAT, false, 0, 0);
	
	// Texture.
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, textures[mode].webGLTexture);
	gl.uniform1i(locations[mode].samplerUniform, 0);
	
	// Vertex indices.
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndex.webGLBuffer);
	
	// Uniforms.
	gl.uniformMatrix4fv(locations[mode].pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(locations[mode].mvMatrixUniform, false, mvMatrix);
};


var initDrawPoints = function(mode) {
	mat4.perspective(90, canvasWidth / canvasHeight, 0.1, 100.0, pMatrix);
	mat4.identity(mvMatrix);
	mat4.scale(mvMatrix, [1/240, 1/240, 1.0]);
	mat4.translate(mvMatrix, [-320.0, -240.0, -1.0]);
	
	// Vertex positions.
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexGridPosition.webGLBuffer);
	gl.vertexAttribPointer(locations[mode].vertexPositionAttribute, vertexGridPosition.itemSize, gl.FLOAT, false, 0, 0);
	
	// Uniforms.
	gl.uniformMatrix4fv(locations[mode].pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(locations[mode].mvMatrixUniform, false, mvMatrix);
};


var initDrawPoints2 = function(mode) {
	mat4.perspective(50, canvasWidth / canvasHeight, 1, 10000, pMatrix);
	mat4.identity(mvMatrix);
	mat4.lookAt([0, 0, 500], [0, 0, -1000], [0, 1, 0], mvMatrix);
	
	// Vertex positions.
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexGridPosition.webGLBuffer);
	gl.vertexAttribPointer(locations[mode].vertexPositionAttribute, vertexGridPosition.itemSize, gl.FLOAT, false, 0, 0);
	
	// Vertex depth.
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexGridDepth.webGLBuffer);
	gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertexGridPosition.originalArray);
	gl.vertexAttribPointer(locations[mode].vertexDepthAttribute, vertexGridDepth.itemSize, gl.SHORT, false, 0, 0);
	
	// Uniforms.
	gl.uniformMatrix4fv(locations[mode].pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(locations[mode].mvMatrixUniform, false, mvMatrix);
};


var updateData = function() {
	switch (kinectData.mode) {
		case 0:
		case 1:
			// Update texture.
			gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 640, 480, textures[kinectData.mode].format, gl.UNSIGNED_BYTE, kinectData.arrayBufferView);
			break;
			
		case 2:
			// Update vertex buffer.
			gl.bindBuffer(gl.ARRAY_BUFFER, vertexGridPosition.webGLBuffer);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, kinectData.arrayBufferView);
			break;
			
		case 3:
			// Update vertex buffer.
			gl.bindBuffer(gl.ARRAY_BUFFER, vertexGridDepth.webGLBuffer);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, kinectData.arrayBufferView);
			
			gl.uniformMatrix4fv(locations[mode].pMatrixUniform, false, pMatrix);
			break;
			
		default:
	}
};


var onWebSocketReceive = function (event) {
	statsSocket.end();
	statsSocket.begin();
	
	var aboutData = new Uint16Array(event.data);
	kinectData.mode = aboutData[0];
	msStatsServer = aboutData[1];
	
	switch (kinectData.mode) {
		case 0:
		case 1:
			kinectData.arrayBufferView = new Uint8Array(event.data);
			break;
			
		case 2:
			kinectData.arrayBufferView = new Float32Array(event.data);
			break;
			
		case 3:
			kinectData.arrayBufferView = new Uint16Array(event.data);
			break;
	}
	kinectData.isAvailable = true;
};


var tick = function() {
	statsRender.begin();
	
	requestAnimFrame(tick);
	handleKeys();
	
	// Don't render unless selected mode data has arrived.
	if (mode == kinectData.mode) {
		//drawScene();
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		loopDraw(mode);
	}
	
	if (kinectData.isAvailable) {
		kinectData.isAvailable = false;
		updateData();
	}
	statsRender.end();
};


var keyDownListener = function(event) {
	currentlyPressedKeys[event.keyCode] = true;
};


var keyUpListener = function(event) {
	currentlyPressedKeys[event.keyCode] = false;
};


var handleKeys = function() {
/*
	if (currentlyPressedKeys[37]) {
		// Left cursor key
		//mat4.rotate(mvMatrix, deg2rad(5), [0, 1, 0]);
		mat4.rotate(pMatrix, deg2rad(5), [0, 1, 0]);
	}
	if (currentlyPressedKeys[39]) {
		// Right cursor key
		mat4.rotate(mvMatrix, deg2rad(-5), [0, 1, 0]);
	}
	if (currentlyPressedKeys[38]) {
		// Up cursor key
		alert("UP");
	}
	if (currentlyPressedKeys[40]) {
		// Down cursor key
		alert("DOWN");
	}
*/
cameraX += ( mouseX - cameraX ) * 0.05;
cameraY += ( - mouseY - cameraY ) * 0.05;
mat4.identity(mvMatrix);
mat4.lookAt([cameraX, cameraY, 500], [0, 0, -1000], [0, 1, 0], mvMatrix);
};


var mouseMoveListener = function(event) {
	mouseX = ( event.clientX - window.innerWidth / 2 ) * 8;
	mouseY = ( event.clientY - window.innerHeight / 2 ) * 8;
};


var deg2rad = function(value) {
	return value * 3.14159 / 180;
};

/*
var drawScene = function() {
	// Set viewport & clear.
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	if (mode == 0 || mode == 1) {
		// Vertex positions.
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosition.webGLBuffer);
		gl.vertexAttribPointer(locations[mode].vertexPositionAttribute, vertexPosition.itemSize, gl.FLOAT, false, 0, 0);
		
		// Vertex texture coordinates.
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexTextureCoord.webGLBuffer);
		gl.vertexAttribPointer(locations[mode].textureCoordAttribute, vertexTextureCoord.itemSize, gl.FLOAT, false, 0, 0);
		
		// Texture.
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, textures[mode].webGLTexture);
		gl.uniform1i(locations[mode].samplerUniform, 0);
		
		// Vertex indices.
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndex.webGLBuffer);
		
	} else {
		// Vertex positions.
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexGridPosition.webGLBuffer);
		gl.vertexAttribPointer(locations[mode].vertexPositionAttribute, vertexGridPosition.itemSize, gl.FLOAT, false, 0, 0);
		
		// Vertex data.
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexGridData.webGLBuffer);
		gl.vertexAttribPointer(locations[mode].vertexDataAttribute, vertexGridData.itemSize, gl.FLOAT, false, 0, 0);
	}
	
	// Uniforms.
	gl.uniformMatrix4fv(locations[mode].pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(locations[mode].mvMatrixUniform, false, mvMatrix);
	
	// Draw.
	if (mode == 0 || mode == 1) {
		gl.drawElements(gl.TRIANGLES, vertexIndex.numItems, gl.UNSIGNED_SHORT, 0);
	} else {
		gl.drawArrays(gl.POINTS, 0, vertexGridPosition.numItems);
	}
	
};
*/
