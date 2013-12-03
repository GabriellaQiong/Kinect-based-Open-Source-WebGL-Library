var scene, camera, light, render;
var mouse, center;
var stats;
var image;

if (Detector.webgl) {
    init();
    animate();
} else {
    document.body.appendChild(Detect.getWebGLErrorMessage());
}

function init() {
    scene  = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(0, 0, 400);
    scene.add(camera);

    center = new THREE.Vector3();
    center.z = -800;

    material = new THREE.ShaderMaterial( {
        uniforms: {
            "depthTex": { type: "t", value, 0, texture: texture },
            "width": { type: "f", value: width },
            "height": { type: "f", value: height },
            "nearZ": { type: "f", value: nearZ },
            "farZ": { typw: "f", value: farZ }
        },
        vertexShader: document.getElementById('vs').textContent,
        fragmentShader: document.getElementById('fs').textContent,
        depthWrite: false
    } );

    mesh = new THREE.ParticleSystem(geometry, material);
    mesh.position.x = 0;
    mesh.position.y = 0;
    scene.add(mesh);

    renderer = new THREE.WebGLRenderer();
    render.setSize(window.innerWidth, window.innerHeight);

    mouse = new THREE.Vector3( 0, 0, 1);
}

function moveMouse (event) {
    mouse.x = (event.clientX - window.innerWidth / 2.0) * 10.0;
    mouse.y = (event.clientY - window.innerWidth / 2.0) * 10.0;
}

function animate() {
    requestAnimationFrame (animate);
    render();
    stats.update();
}

function render() {
    camera.position.x += (mouse.x - camera.position.x) * 0.05;
    camera.position.y -= (mouse.y + camera.position.y) * 0.05;
    camera.lookAt(center);
    renderer.render(scene, camera);
}
