
// WebGLRenderingContext
var gl;

var canvasWidth;
var canvasHeight;

// Program attribute & uniform locations.
var locations;

// WebGL buffers & sizes.
var vertexPosition;
var vertexTextureCoord;
var vertexIndex;

// WebGL texture and DOM image.
var texture;

// Model-view-projection matrices.
var mvMatrix;
var pMatrix;

// Uint8.
var kinectDepth;
var isKinectDataAvailable = false;

// Performance monitor.
var statsRender;
var statsSocket;

$(function () {
	initStats();
	webGLStart();
	initWebSocket();
	
	tick();
});


// Show performance monitor.
var initStats = function() {
	statsRender = new Stats();
	statsSocket = new Stats();
	
	statsRender.setMode(0);
	statsSocket.setMode(0);
	
	document.getElementById("stats-render").appendChild( statsRender.domElement );
	document.getElementById("stats-socket").appendChild( statsSocket.domElement );
}


var webGLStart = function() {
	// Get WebGL context.
	var canvas = document.getElementById("main-canvas");
	canvasWidth = canvas.width;
	canvasHeight = canvas.height;
	gl = initGL(canvas);
	
	// Get shader program's uniform & attribute locations.
	locations = initShaders(gl);
	
	// Set buffers & get reference to them.
	buffers = initBuffers(gl);
	vertexPosition = buffers.vertexPosition;
	vertexTextureCoord = buffers.vertexTextureCoord;
	vertexIndex = buffers.vertexIndex;
	
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
	
	// Vertex positions.
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosition.webGLBuffer);
	gl.vertexAttribPointer(locations.vertexPositionAttribute, vertexPosition.itemSize, gl.FLOAT, false, 0, 0);
	
	// Vertex texture coordinates.
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexTextureCoord.webGLBuffer);
	gl.vertexAttribPointer(locations.textureCoordAttribute, vertexTextureCoord.itemSize, gl.FLOAT, false, 0, 0);
	
	// Texture.
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture.webGLTexture);
	gl.uniform1i(locations.samplerUniform, 0);
	
	// Vertex indices.
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndex.webGLBuffer);
	
	// Uniforms.
	gl.uniformMatrix4fv(locations.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(locations.mvMatrixUniform, false, mvMatrix);
	
	// Draw.
	gl.drawElements(gl.TRIANGLES, vertexIndex.numItems, gl.UNSIGNED_SHORT, 0);
};

var animate = function() {
	if (isKinectDataAvailable) {
		updateTexture(kinectDepth, texture.webGLTexture);
		isKinectDataAvailable = false;
	}
};

// data: Uint8Array
var updateTexture = function(data, webGLTexture) {
	gl.bindTexture(gl.TEXTURE_2D, webGLTexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 640, 480, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);
};

var tick = function() {
	statsRender.begin();
	
	requestAnimFrame(tick);
	drawScene();
	animate();
	
	statsRender.end();
};
