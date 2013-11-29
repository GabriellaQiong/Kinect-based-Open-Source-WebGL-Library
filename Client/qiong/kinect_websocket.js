// Base codes from:
// http://divyen.wordpress.com/2012/06/13/html5-developing-websocket-server-using-c-sharp-dot-net/

function openConnection() {
    // uses global 'conn' object
    if (conn.readyState === undefined || conn.readyState > 1) {

        conn = new WebSocket('ws://localhost:8100');
        conn.binaryType = "arraybuffer";

        conn.onopen = function () {
            conn.send("Connection Established Confirmation");
        };


        conn.onmessage = function (event) {
        	//document.getElementById("content").innerHTML = event.data;
        	
        	var buffer = new Int8Array(event.data);
        	console.log(buffer.byteLength);
        	
        	for (var y = 0; y < canvas.height; ++y) {
        		for (var x = 0; x < canvas.width; ++x) {
        			var index = (y * canvas.width + x) * 4;
        			var value = buffer[y * canvas.width + x];

        			data[index]   = value;    // red
        			data[++index] = value;    // green
        			data[++index] = value;    // blue
        			data[++index] = 255;      // alpha
        		}
        	}

        	ctx.putImageData(imageData, 0, 0);
        };

        conn.onerror = function (event) {
            alert("Web Socket Error");
        };


        conn.onclose = function (event) {
            alert("Web Socket Closed");
        };
    }
}

var canvas;
var ctx;
var imageData;
var data;

$(function () {
	conn = {}, window.WebSocket = window.WebSocket || window.MozWebSocket;

	openConnection();


	canvas = document.getElementById('canvas');
	ctx = canvas.getContext('2d');
	imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	data = imageData.data;
});

