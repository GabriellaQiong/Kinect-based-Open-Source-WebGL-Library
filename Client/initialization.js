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
	
	// Get vertex & fragment shaders.
	var vertexShader0 = getShader(gl, "vs0");
	var vertexShader1 = getShader(gl, "vs1");
	var fragmentShader0 = getShader(gl, "fs0");
	var fragmentShader1 = getShader(gl, "fs1");
	var fragmentShader2 = getShader(gl, "fs2");
	
	
	// Create and link shader programs.
	var createAndLink = function(vs, fs, programNumber) {
		var program = gl.createProgram();
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			alert("Could not initialise shader program #" + programNumber);
		}
		
		return program;
	};
	var numPrograms = 3;
	var shaderProgram = new Array(numPrograms);
	shaderProgram[0] = createAndLink(vertexShader0, fragmentShader0, 0);
	shaderProgram[1] = createAndLink(vertexShader0, fragmentShader1, 1);
	shaderProgram[2] = createAndLink(vertexShader1, fragmentShader2, 2);
	
	gl.useProgram(shaderProgram[0]);
	
	
	// Get attribute & uniform locations of vertex & fragment shaders.
	var locations = new Array(2);
	locations[0] = {};
	locations[0].vertexPositionAttribute = gl.getAttribLocation(shaderProgram[0], "aVertexPosition");
	locations[0].textureCoordAttribute = gl.getAttribLocation(shaderProgram[0], "aTextureCoord");
	locations[0].samplerUniform = gl.getUniformLocation(shaderProgram[0], "uSampler");
	locations[0].pMatrixUniform = gl.getUniformLocation(shaderProgram[0], "uPMatrix");
	locations[0].mvMatrixUniform = gl.getUniformLocation(shaderProgram[0], "uMVMatrix");
	
	locations[1] = {};
	locations[1].vertexPositionAttribute = gl.getAttribLocation(shaderProgram[1], "aVertexPosition");
	locations[1].textureCoordAttribute = gl.getAttribLocation(shaderProgram[1], "aTextureCoord");
	locations[1].samplerUniform = gl.getUniformLocation(shaderProgram[1], "uSampler");
	locations[1].pMatrixUniform = gl.getUniformLocation(shaderProgram[1], "uPMatrix");
	locations[1].mvMatrixUniform = gl.getUniformLocation(shaderProgram[1], "uMVMatrix");
	
	locations[2] = {};
	locations[2].vertexPositionAttribute = gl.getAttribLocation(shaderProgram[2], "aVertexPosition");
	locations[2].vertexDataAttribute = gl.getAttribLocation(shaderProgram[2], "aVertexData");
	locations[2].pMatrixUniform = gl.getUniformLocation(shaderProgram[2], "uPMatrix");
	locations[2].mvMatrixUniform = gl.getUniformLocation(shaderProgram[2], "uMVMatrix");
	
	// Enable attribute array.
	gl.enableVertexAttribArray(locations[0].vertexPositionAttribute);
	gl.enableVertexAttribArray(locations[0].textureCoordAttribute);
	gl.enableVertexAttribArray(locations[1].vertexPositionAttribute);
	gl.enableVertexAttribArray(locations[1].textureCoordAttribute);
	gl.enableVertexAttribArray(locations[2].vertexPositionAttribute);
	gl.enableVertexAttribArray(locations[2].vertexDataAttribute);
	
	return {
		locations: locations,
		switchShaderProgram: function(idx) {gl.useProgram(shaderProgram[idx]);}
	};
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
	
	w = 640;
	h = 480;
	var vertexGridPosition = {
		webGLBuffer: gl.createBuffer(),
		itemSize: 3,
		numItems: w*h
	};
	
	var vertexGridData = {
		webGLBuffer: gl.createBuffer(),
		itemSize: 3,
		numItems: w*h
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
	
	var vertexGrid = new Array(vertexGridPosition.numItems*vertexGridPosition.itemSize);
	var k = 0;
	for (var i = 0; i < w; ++i) {
		for (var j = 0; j < h; ++j) {
			vertexGrid[k++] = i;
			vertexGrid[k++] = j;
			vertexGrid[k++] = 0.0;
		}
	}
	
	
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosition.webGLBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexTextureCoord.webGLBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
	
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndex.webGLBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertexIndices), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, vertexGridPosition.webGLBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexGrid), gl.DYNAMIC_DRAW);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexGridData.webGLBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexGridData.numItems*vertexGridData.itemSize), gl.DYNAMIC_DRAW);
	
	return {
		vertexPosition: vertexPosition,
		vertexTextureCoord: vertexTextureCoord,
		vertexIndex: vertexIndex,
		vertexGridPosition: vertexGridPosition,
		vertexGridData: vertexGridData
	};
};

// -----------------------------------------------------------------------------
// --------------------------------  TEXTURE  ----------------------------------
// -----------------------------------------------------------------------------

function handleLoadedTexture(gl, texture) {
	gl.bindTexture(gl.TEXTURE_2D, texture.webGLTexture);
	//gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	
	gl.bindTexture(gl.TEXTURE_2D, null);
};

function initTexture(gl) {
	var textures = new Array(2);
	textures[0] = {};
	textures[0].webGLTexture = gl.createTexture();
	textures[0].image = new Image();
	textures[0].image.onload = function () {
		handleLoadedTexture(gl, textures[0]);
	};
	
	textures[0].image.src = "cat.jpg";
	
	return textures[0];
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
	
	webSocket.onerror = function (event) {
		console.log("Web Socket error.");
	};

	webSocket.onclose = function (event) {
		console.log("Web Socket closed.");
	};
	
	return webSocket;
};