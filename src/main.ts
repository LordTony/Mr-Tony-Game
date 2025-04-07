import * as THREE from 'three';
import { Config } from './config';
import { OrbitControls } from 'three/examples/jsm/Addons'

//import vertexShaderCode from './shaders/vertex.glsl';
//import fragmentShaderCode from './shaders/fragment.glsl';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
camera.position.setZ(4);

const renderer = new THREE.WebGLRenderer({
	antialias:true,
	canvas: document.getElementById('game') as HTMLCanvasElement,
	precision: 'highp'
});

const controls = new OrbitControls(camera, renderer.domElement);

const bg = new THREE.Color()
const c1 = new THREE.Color(THREE.Color.NAMES.blue);
const c2 = new THREE.Color(THREE.Color.NAMES.white);
bg.lerpColors(c1, c2, .7)
renderer.setClearColor(bg);

addEventListener("resize", () => {
  const height_is_limit = window.innerWidth / window.innerHeight > Config.GameAspectRatio
  renderer.setSize(
    height_is_limit 
      ? window.innerHeight * Config.GameAspectRatio 
      : window.innerWidth,
    height_is_limit 
      ? window.innerHeight 
      : window.innerWidth / Config.GameAspectRatio);
});

window.dispatchEvent(new Event('resize'));

const tex_loader = new THREE.TextureLoader();
const texture = await tex_loader.loadAsync('images/card-back.png'); 

const lighting = new THREE.AmbientLight('white', 1);
scene.add( lighting );

const geometry = new THREE.BoxGeometry(Config.CardWidth, Config.CardWidth * Config.CardAspectRatio, Config.CardWidth * Config.CardThicknessRatio);
const back_material = new THREE.MeshPhongMaterial( { 
	map: texture,
	side: THREE.FrontSide,
	shininess: 10,
	transparent: true
});
const side_material = new THREE.MeshPhongMaterial({ color: 'black' });
const front_material = new THREE.MeshPhongMaterial({ color: 'green' });
const cube = new THREE.Mesh(geometry, [side_material, side_material, side_material, side_material, front_material, back_material]);
cube.rotateZ(Math.PI / 6)
scene.add( cube );

const render = function () {
  requestAnimationFrame( render );

	controls.update();

  cube.rotation.y += 0.007;

  renderer.render(scene, camera);
};

render();