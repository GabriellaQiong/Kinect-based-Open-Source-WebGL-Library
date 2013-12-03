var canvas;
var ctx;
var imageData;
var data;


$(function () {
	canvas = document.getElementById('canvas');
	ctx = canvas.getContext('2d');
	imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	data = imageData.data;

	initWebSocket();
});

function initWebSocket() {
	var webSocket = new WebSocket("ws://localhost:8100");
	webSocket.binaryType = "arraybuffer";

	webSocket.onopen = function () {
		console.log("Connection opened");
	};

	webSocket.onmessage = function () {
		var buffer = new Uint8Array(event.data);
		console.log(buffer.byteLength);

		for (var y = 0; y < canvas.height; ++y) {
			for (var x = 0; x < canvas.width; ++x) {
				var index = (y * canvas.width + x) * 4;
				var value = buffer[y * canvas.width + x];

				data[index] = value;    // red
				data[++index] = value;    // green
				data[++index] = value;    // blue
				data[++index] = 255;      // alpha
			}
		}

		ctx.putImageData(imageData, 0, 0);
	};

	webSocket.onerror = function (event) {
		console.log("Web Socket error.");
	};

	webSocket.onclose = function (event) {
		console.log("Web Socket closed.");
	};
}