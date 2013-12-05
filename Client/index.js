
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
var vertexGridData;

// WebGL texture and DOM image.
var texture;

// Model-view-projection matrices.
var mvMatrix;
var pMatrix;

// Uint8.
var kinectData;
var isKinectDataAvailable = false;

// Performance monitor.
var statsRender;
var statsSocket;
var statsServer;
var msStatsServer;	// milliseconds sent from server.
var dataMode;		// data mode sent from server.

var webSocket;


var mode = 0;

$(function () {
	statsRender = initStats(0, "stats-render");
	statsSocket = initStats(0, "stats-socket");
	statsServer = initStats(1, "stats-server");
	webGLStart();
	
	// WebSocket.
	webSocket = initWebSocket();
	webSocket.onmessage = onWebSocketReceive;
	
	$("input:radio").change(onRadioChange);
	
	setInterval(updateStatsServer, 1000);
	
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
	mode = parseInt(event.target.value);
	switchShaderProgram(mode);
	var buffer = new Int16Array([mode]);
	webSocket.send(buffer);
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
	vertexGridData = buffers.vertexGridData;
	
	texture = initTexture(gl);
	
	// Model-view-projection matrices.
	matrices = initMVPMatrix(canvasWidth, canvasHeight);
	mvMatrix = matrices.modelView;
	pMatrix = matrices.projection;
	
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
};


var drawScene = function() {
	// Set viewport & clear.
	gl.viewport(0, 0, canvasWidth, canvasHeight);
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
		gl.bindTexture(gl.TEXTURE_2D, texture.webGLTexture);
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


var animate = function() {
	if (mode == 2 || mode == 3) {
		mat4.identity(mvMatrix);
		mat4.scale(mvMatrix, [1/240, 1/240, 1.0]);
		mat4.translate(mvMatrix, [-320.0, -240.0, -1.0]);
		
		
		if (isKinectDataAvailable) {
			// Update vertex buffer.
			if (mode == 2) {
				gl.bindBuffer(gl.ARRAY_BUFFER, vertexGridPosition.webGLBuffer);
				gl.bufferSubData(gl.ARRAY_BUFFER, 0, kinectData);
			} else {
				gl.bindBuffer(gl.ARRAY_BUFFER, vertexGridData.webGLBuffer);
				gl.bufferSubData(gl.ARRAY_BUFFER, 0, kinectData);
			}
		}
		
	} else {
		if (isKinectDataAvailable) {
			updateTexture(kinectData, texture.webGLTexture);
			isKinectDataAvailable = false;
		}
	}
};


var onWebSocketReceive = function (event) {
	// event.data is ArrayBuffer.
	
	statsSocket.end();
	statsSocket.begin();
	
	var aboutData = new Uint16Array(event.data);
	dataMode = aboutData[0];
	msStatsServer = aboutData[1];
	
	kinectData = new Uint8Array(event.data);
	isKinectDataAvailable = true;
};


// data: Uint8Array
var updateTexture = function(data, webGLTexture) {
	gl.bindTexture(gl.TEXTURE_2D, webGLTexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	if (dataMode == 0) {
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 640, 480, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);
	} else if (dataMode == 1) {
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 640, 480, 0, gl.RGB, gl.UNSIGNED_BYTE, data);
		//gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 640, 480, gl.RGB, gl.UNSIGNED_BYTE, data);
	}
};


var tick = function() {
	statsRender.begin();
	
	requestAnimFrame(tick);
	drawScene();
	animate();
	
	statsRender.end();
};

