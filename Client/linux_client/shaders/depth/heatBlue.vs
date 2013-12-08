#ifdef GL_ES
precision highp float;
#endif

uniform vec4 pointColor;
uniform float pointSize;
uniform vec2 deformRatio;


varying vec2 vUv;
varying float depth;


void main( void )
{
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy * deformRatio, position.z, 1.0);
	gl_PointSize = pointSize;
	depth = position.z;
}
