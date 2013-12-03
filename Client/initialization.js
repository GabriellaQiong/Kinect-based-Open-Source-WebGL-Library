/**
 * Get WebGL context from DOM canvas.
 * @param {HTMLCanvasElement} canvas
 * @return {WebGLRenderingContext} gl
 */
var initGL = function(canvas) {
	var gl = null;
	
	try {
		gl = canvas.getContext("webgl");
	} catch (e) {
	}
	
	if (!gl) {
		alert("Unable to initialize WebGL. Your browser may not support it.");
		gl = null;
	}
	
	return gl;
};

var initMVPMatrix = function(canvasWidth, canvasHeight) {
	var mv = mat4.create();
	mat4.identity(mv);
	mat4.translate(mv, [0.0, 0.0, -1.0]);
	mat4.scale(mv, [canvasWidth/canvasHeight, 1.0, 1.0]); // stretch cube.
	
	var p = mat4.create();
	mat4.perspective(90, canvasWidth / canvasHeight, 0.1, 100.0, p);
	
	return {
		modelView: mv,
		projection: p
	};
};

// -----------------------------------------------------------------------------
// --------------------------------  SHADER  -----------------------------------
// -----------------------------------------------------------------------------

// Returns shader from script tag.
var getShader = function(gl, id) {
	var shaderScript = document.getElementById(id);
	if (!shaderScript) {
		return null;
	}

	var str = "";
	var k = shaderScript.firstChild;
	while (k) {
		if (k.nodeType == 3) {
			str += k.textContent;
		}
		k = k.nextSibling;
	}

	var shader;
	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(shader, str);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
};

// Attach shaders, link/use program, and enable attribute arrays.
// Returns program's attribute & unifrom locations.
var initShaders = function(gl) {
	var shaderProgram = null;
	
	// Get vertex & fragment shaders.
	var fragmentShader = getShader(gl, "shader-fs");
	var vertexShader = getShader(gl, "shader-vs");
	
	// Create, link, and use shader program.
	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Could not initialise shaders");
	}
	
	gl.useProgram(shaderProgram);
	
	
	// Get attribute & uniform locations of vertex & fragment shaders.
	var locations = {};
	locations.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	locations.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
	locations.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
	locations.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	locations.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	
	// Enable attribute array.
	gl.enableVertexAttribArray(locations.vertexPositionAttribute);
	gl.enableVertexAttribArray(locations.textureCoordAttribute);
	
	return locations;
};

// -----------------------------------------------------------------------------
// --------------------------------  BUFFER  -----------------------------------
// -----------------------------------------------------------------------------

// Create, bind, and buffer vertex position, texture coordinate, and index data.
var initBuffers = function(gl) {
	
	var vertexPosition = {
		webGLBuffer: gl.createBuffer(),
		itemSize: 3
	};
	
	var vertexTextureCoord = {
		webGLBuffer: gl.createBuffer(),
		itemSize: 2
	};
	
	var vertexIndex = {
		webGLBuffer: gl.createBuffer(),
		numItems: 6
	};
	
	//  3 -- 2
	//  |    | side length 2, centered at origin, xy plane.
	//  0 -- 1
	var vertices = [
		// Front face
		-1.0, -1.0,  0.0, // 0.
		 1.0, -1.0,  0.0, // 1.
		 1.0,  1.0,  0.0, // 2.
		-1.0,  1.0,  0.0  // 3.
	];
	
	var textureCoords = [
		// Front face
		0.0, 0.0,
		1.0, 0.0,
		1.0, 1.0,
		0.0, 1.0
	];
	
	var vertexIndices = [
		0, 1, 2,      0, 2, 3    // Front face
	];
	
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosition.webGLBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexTextureCoord.webGLBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
	
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndex.webGLBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertexIndices), gl.STATIC_DRAW);
	
	return {
		vertexPosition: vertexPosition,
		vertexTextureCoord: vertexTextureCoord,
		vertexIndex: vertexIndex
	};
};

// -----------------------------------------------------------------------------
// --------------------------------  TEXTURE  ----------------------------------
// -----------------------------------------------------------------------------

function handleLoadedTexture(gl, texture) {
	gl.bindTexture(gl.TEXTURE_2D, texture.webGLTexture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	
	gl.bindTexture(gl.TEXTURE_2D, null);
};

function initTexture(gl) {
	var texture = {
		webGLTexture: null,
		image: null
	};
	
	texture.webGLTexture = gl.createTexture();
	texture.image = new Image();
	texture.image.onload = function () {
		handleLoadedTexture(gl, texture);
	};

	//texture.image.src = "nehe.gif";
	texture.image.src = "cat.jpg";
	
	return texture;
};


// -----------------------------------------------------------------------------
// --------------------------------  WEB SOCKET  -------------------------------
// -----------------------------------------------------------------------------

var initWebSocket = function() {
	var webSocket = new WebSocket("ws://localhost:8100");
	webSocket.binaryType = "arraybuffer";

	webSocket.onopen = function () {
		console.log("Web Socket opened.");
	};

	webSocket.onmessage = function () {
		statsSocket.end();
		statsSocket.begin();
		console.log(event);
		kinectDepth = new Uint8Array(event.data);
		isKinectDataAvailable = true;
	};

	webSocket.onerror = function (event) {
		console.log("Web Socket error.");
	};

	webSocket.onclose = function (event) {
		console.log("Web Socket closed.");
	};
};