#ifdef GL_ES
precision highp float;
#endif

uniform vec4 pointColor;
uniform float pointSize;
uniform sampler2D img;

varying vec2 vUv;
varying float sd;
varying float depth;

float alpha(float val) 
{
	float a;
	
	if ( val > -800.0 ) {
		a = smoothstep( -2000.0, 2000.0, val);
	} else {
		a = 0.0;
	}
	
	return a;
}

vec3 heat( float t )
{
	vec3 rgb = pointColor.xyz;
	float n = 100.0;   // nearest
	float f = -1000.0;  // farthest
	float z = t;
	rgb.g = smoothstep(n, f, t);
	return rgb;
}

void main( void ) 
{	
    vec3 color = texture2D(img,vUv).rgb;
    // heat map alpha blended color
	float d = gl_FragCoord.z / gl_FragCoord.w;
	//vec4 cH = vec4( heat(depth) * color, pointColor.w * alpha(depth));
	vec4 cH = vec4( heat(depth) * pointColor.xyz, pointColor.w * alpha(depth));
	gl_FragColor = 5.0 * vec4(cH);
    //gl_FragColor = texture2D(img, vUv);
}
