#ifdef GL_ES
precision highp float;
#endif

uniform vec4 pointColor;
uniform float pointSize;

varying vec2 vUv;
varying float depth;


void main( void )
{
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	gl_PointSize = pointSize;
	depth = position.z;
}
