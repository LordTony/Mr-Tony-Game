import * as THREE from 'three';
import { Config } from './config';
import { DragControls } from 'three/examples/jsm/Addons'
import { Card } from './card';
import { GUI } from 'dat.gui';
import { DB } from './utils/database';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { orderBy } from 'lodash-es';
import Stats from 'stats.js'

const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);
stats.dom.style.left = `${document.body.getBoundingClientRect().right - stats.dom.getBoundingClientRect().width - 8}px`;
stats.dom.style.top = '8px';

const texture_Loader = new THREE.TextureLoader();

const scene = new THREE.Scene();
scene.background = new THREE.Color('grey');

const camera = new THREE.PerspectiveCamera(75, Config.GameAspectRatio, 0.1, 1000);
camera.position.setZ(2);
//camera.rotateX(Math.PI / 36)

scene.add(camera)

const renderer = new THREE.WebGLRenderer({
	antialias: true,
	canvas: document.getElementById('game') as HTMLCanvasElement,
	precision: 'highp',
});

//renderer.setPixelRatio(0.9);
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(window.devicePixelRatio);

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

// Assuming you already have a scene, camera, and renderer set up:
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Set up the OutlinePass with the size of the viewport
const resolution = new THREE.Vector2()
renderer.getSize(resolution)
const outlinePass = new OutlinePass(
  resolution.multiplyScalar(.5),
  scene,
  camera
);
composer.addPass(outlinePass);

// Configure outline parameters (optional)
outlinePass.edgeStrength = 5.0;
outlinePass.edgeGlow = 1;
outlinePass.edgeThickness = 2.0;
outlinePass.visibleEdgeColor.set('#ffffff'); // white outline
outlinePass.hiddenEdgeColor.set('#190a05');
outlinePass.selectedObjects = [];
outlinePass.patternTexture = await texture_Loader.loadAsync(Config.BackgroundUrl)

composer.addPass(new OutputPass());

const lighting = new THREE.AmbientLight('white', .8);
const spot_light = new THREE.DirectionalLight('white', 1)

spot_light.rotateX(Math.PI / 2)
spot_light.rotateZ(Math.PI / 10)
spot_light.position.set(0, 0, 4);
spot_light.castShadow = true;
spot_light.shadow.mapSize = new THREE.Vector2(1024, 1024);
spot_light.shadow.camera.top = 9;
spot_light.shadow.camera.bottom = -5;
spot_light.shadow.camera.left = -9;
spot_light.shadow.camera.right = 9;
spot_light.shadow.camera.near = 0;
spot_light.shadow.camera.far = 20;

scene.add( lighting );
scene.add( spot_light );

// BACKGROUND
const table_z = -3;
const bg = await texture_Loader.loadAsync(Config.BackgroundUrl)
bg.offset = new THREE.Vector2(0,.5)
bg.colorSpace = THREE.SRGBColorSpace;
bg.wrapS = THREE.RepeatWrapping;
bg.wrapT = THREE.RepeatWrapping;
bg.repeat.set(15,15)
const table = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50), 
  new THREE.MeshPhongMaterial({map: bg})
)
table.position.setZ(table_z)
table.receiveShadow = true;
scene.add(table);

// Middle Line
const line = new THREE.Mesh(
  new THREE.BoxGeometry(10, .02, .01),
  new THREE.MeshBasicMaterial({color: 'red', opacity: .2, transparent: true})
)
scene.add(line);

// HUD
const hud_left_bound_percent = 20;

const a_little_bit = .0001
const height_width = new THREE.Vector2();
camera.getViewSize(camera.near, height_width)

const percent = (percent: number) => percent / 100;

const hud_width = height_width.x * percent(hud_left_bound_percent);
const hud_height = hud_width * Config.CardAspectRatio;
const card_back_texture = await texture_Loader.loadAsync(Config.CardBackUrl);
card_back_texture.colorSpace = THREE.SRGBColorSpace
const hud = new THREE.Mesh(
  new THREE.PlaneGeometry(hud_width, hud_height), 
  new THREE.MeshBasicMaterial({map: card_back_texture })
);
hud.position.set((-(height_width.x - hud_width)/ 2) + .001, (height_width.y - hud_height) / 2 - .0005, -camera.near)
camera.add(hud)

// const gui = new GUI()
// const cubeFolder = gui.addFolder('Cube')
// cubeFolder.add(card_left.material[2].color, 'r', 0, 1)
// cubeFolder.add(card_left.material[2].color, 'g', 0, 1)
// cubeFolder.add(card_left.material[2].color, 'b', 0, 1)
// cubeFolder.add(card_left.position, 'x', -5, 5)
// cubeFolder.open()

//Create a helper for the shadow camera (optional)
//scene.add( new THREE.CameraHelper( spot_light.shadow.camera ) );

//const helper = new THREE.DirectionalLightHelper(spot_light, 1)
//scene.add( helper );


// Game Code
const db = new DB()
await db.init()
const decks = await db.getAllDecks()

const field_cards = new THREE.Group();
scene.add( field_cards );
for(let i = 0; i < decks[0].cards.length; i++) {
  const image = new Image;
  image.src = URL.createObjectURL(decks[0].cards[i].front_blob);
  const start_z = table_z + Config.CardThicknessRatio + (a_little_bit * i);
  const card = await Card.CreateCardAsync(new THREE.Vector3(i / 3, (-i / 6) - 1.25, start_z), image.src);
  field_cards.add(card);
}

const getWorldMousePos = (event: MouseEvent): THREE.Vector2 => {
  const canvas_bounds = (renderer.domElement as HTMLElement).getBoundingClientRect()
  const mouse = new THREE.Vector2(((event.clientX - canvas_bounds.left) / renderer.domElement.clientWidth) * 2 - 1, -((event.clientY - canvas_bounds.top) / renderer.domElement.clientHeight) * 2 + 1);
  return mouse;
}

const raycaster = new THREE.Raycaster();
raycaster.layers.set(Card.card_layer);

const getTopClickedCard = (event: MouseEvent): Card | null => {
  raycaster.setFromCamera(getWorldMousePos(event), camera);
  const intersects = raycaster.intersectObjects(field_cards.children, false).filter(x => x.object instanceof Card);
  return intersects.length == 0 ? null : intersects[0].object as Card;
}

renderer.domElement.addEventListener('dblclick', (event: MouseEvent) => {
  const card = getTopClickedCard(event);
  if(card) {
    moveCardToTop(card);
    card.toggle_tap()
  }
}
, false);

renderer.domElement.addEventListener('mouseup', (event: MouseEvent) => {
  if(event.button == 2) {
    const card = getTopClickedCard(event);
    if(card) {
      moveCardToTop(card);
      card.flip_over(() => {
        hud.material.map = card.isFlipped ? card_back_texture : (card.card_front as THREE.MeshPhongMaterial).map;
        hud.material.needsUpdate = true;
      })
    }
  }
}
, false);

const dragControls = new DragControls(Card.all_cards, camera, renderer.domElement);
dragControls.recursive = false;
dragControls.raycaster.layers.set(Card.card_layer)

const moveCardToTop = (card_to_put_on_top: Card) => {
  const higher_cards = orderBy(
      field_cards.children.filter(card => (card as Card).position.z > card_to_put_on_top.position.z), 
      (card) => { return (card as Card).position.z}, 
      "asc") as Card[];

  // swap everything
  higher_cards.forEach(card => {
    const temp = card_to_put_on_top.position.z;
    card_to_put_on_top.position.setZ(card.position.z);
    card.position.setZ(temp);
  })
}

let lockedDragZPosition = 0;
dragControls.addEventListener('dragstart', (event) => {
  const clicked_card = (event.object as Card);
  moveCardToTop(clicked_card)
  clicked_card.toggle_pick_up()
  lockedDragZPosition = clicked_card.position.z;
  //outlinePass.selectedObjects.push(clicked_card)
})

dragControls.addEventListener('dragend', (event) => {
  const clicked_card = (event.object as Card);
  clicked_card.toggle_pick_up()
  //outlinePass.selectedObjects = [];
})

dragControls.addEventListener('drag', (event) => {
  const clicked_card = (event.object as Card);
  clicked_card.position.setZ(lockedDragZPosition);
  var size = new THREE.Vector3()
  clicked_card.geometry.boundingBox?.getSize(size)
  if(clicked_card.position.y > -(size.y / 2)) {
    (clicked_card.material as THREE.Material[]).forEach(mat => {
      mat.opacity = .5;
      mat.transparent = true;
      mat.needsUpdate = true;
    })
  }
  
})

dragControls.addEventListener('hoveron', (event) => {
  const card = (event.object as Card);
  if(card.card_front instanceof THREE.MeshPhongMaterial) {
    hud.material.map = card.isFlipped ? card_back_texture : card.card_front.map
    hud.material.needsUpdate = true
  }
})

dragControls.addEventListener('hoveroff', () => {
  hud.material.map = null
})

// Hack to override the listener
const hack_me = (dragControls as any);
renderer.domElement.removeEventListener('pointerdown', hack_me._onPointerDown);
const original_OnPointerDown = hack_me._onPointerDown;
hack_me._onPointerDown = function(event: MouseEvent) {
  if (event.button === 2) { return }
  original_OnPointerDown.call(this, event);
};
renderer.domElement.addEventListener('pointerdown', hack_me._onPointerDown);

const c1 = field_cards.children.at(2) as Card;
const c2 = field_cards.children.at(4) as Card;
outlinePass.selectedObjects.push(c1, c2);


const render = function (t: number) {
  requestAnimationFrame( render );

  stats.begin()
  renderer.autoClear = false;

  Card.all_cards.forEach(card => {
    card.update_animations(t);
  })

  //if(outlinePass.selectedObjects.length > 0) {
  //composer.render(t);
  // } else {
  renderer.render(scene, camera)
  // }

   stats.end()
};

render(0);