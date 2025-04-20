import * as THREE from 'three';
import Stats from 'stats.js'
import orderBy from 'lodash-es/orderBy';

import { Config } from './config';
import { DragControls, OrbitControls } from 'three/examples/jsm/Addons'
import { Card } from './card';
import { DB } from './utils/database';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';
import { computeScissorForMeshes } from './utils/scissor-helper';
import { GUI } from 'dat.gui';

const table_z = -3;
const table_width = 50;
const table_height = 50;
const a_little_bit = .0002

const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);
stats.dom.style.left = `${document.body.getBoundingClientRect().right - stats.dom.getBoundingClientRect().width - 8}px`;
stats.dom.style.top = '8px';

const texture_Loader = new THREE.TextureLoader();

const renderer = new THREE.WebGLRenderer({
	antialias: true,
	canvas: document.getElementById('game') as HTMLCanvasElement,
	precision: 'highp',
});
renderer.setPixelRatio(devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color('grey');

const camera = new THREE.PerspectiveCamera(50, Config.GameAspectRatio, 0.1, 20);
camera.position.setZ(5);
camera.position.setY(-3);

scene.add(camera)

// LIGHTS
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

// TABLE
const bg = await texture_Loader.loadAsync(Config.BackgroundUrl)
bg.offset = new THREE.Vector2(0,.5)
bg.colorSpace = THREE.SRGBColorSpace;
bg.wrapS = THREE.RepeatWrapping;
bg.wrapT = THREE.RepeatWrapping;
bg.repeat.set(15,15)
const table = new THREE.Mesh(
  new THREE.PlaneGeometry(table_width, table_height), 
  new THREE.MeshPhongMaterial({map: bg})
)
table.position.setZ(table_z)
table.receiveShadow = true;
scene.add(table);

// Middle Line
const line = new THREE.Mesh(
  new THREE.PlaneGeometry(table_width, .02),
  new THREE.MeshBasicMaterial({color: 'black', opacity: .2, transparent: true})
);
line.position.setZ(table_z + a_little_bit);
scene.add(line);

// HUD
const hud_left_bound_percent = 20;
const height_width = new THREE.Vector2();
camera.getViewSize(camera.near, height_width)

const percent = (percent: number) => percent / 100;

const hud_width = height_width.x * percent(hud_left_bound_percent);
const hud_height = hud_width * Config.CardAspectRatio;
const card_back_texture = await texture_Loader.loadAsync(Config.CardBackUrl);
card_back_texture.colorSpace = THREE.SRGBColorSpace;
const hud = new THREE.Mesh(
  new THREE.PlaneGeometry(hud_width, hud_height),
  new THREE.MeshBasicMaterial({ map: card_back_texture })
);
hud.position.set((-(height_width.x - hud_width) / 2) + .001, (height_width.y - hud_height) / 2 - .0005, -camera.near)
camera.add(hud)

// POST PROCESSING
const pp_render_target = new THREE.WebGLRenderTarget(
  window.innerWidth * devicePixelRatio,
  window.innerHeight * devicePixelRatio,
  {
    format: THREE.RGBAFormat,
    encoding: renderer.outputColorSpace,
    samples: 3,
  } as THREE.RenderTargetOptions
);

const composer = new EffectComposer(renderer, pp_render_target);
const renderPass = new RenderPass(scene, camera);
const outputPass = new OutputPass();

const outlinePass = new OutlinePass(
  new THREE.Vector2(128, 128),
  scene,
  camera
);
outlinePass.edgeStrength = 4;
outlinePass.edgeGlow = 1;
outlinePass.pulsePeriod = 2;
outlinePass.edgeThickness = 3;
outlinePass.downSampleRatio = 2;
outlinePass.visibleEdgeColor.set('#ffffff'); // white outline
outlinePass.hiddenEdgeColor.set('#190a05');
outlinePass.selectedObjects = [];
outlinePass.renderTargetMaskBuffer = new THREE.WebGLRenderTarget(
  window.innerWidth * devicePixelRatio, 
  window.innerHeight * devicePixelRatio, 
  { samples: 3 }
);
composer.addPass(renderPass);
composer.addPass(outlinePass);
composer.addPass(outputPass);

addEventListener("resize", () => {
  const height_is_limit = window.innerWidth / window.innerHeight > Config.GameAspectRatio

  const w = height_is_limit 
    ? window.innerHeight * Config.GameAspectRatio
    : window.innerWidth;

  const h = height_is_limit 
    ? window.innerHeight
    : window.innerWidth / Config.GameAspectRatio;

  // camera.aspect = w / h;
  // camera.updateProjectionMatrix();

  renderer.setSize(w, h);
  renderer.setPixelRatio(devicePixelRatio);
  pp_render_target.setSize(w * devicePixelRatio, h * devicePixelRatio);
  composer.setSize(w * devicePixelRatio, h * devicePixelRatio);
});

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

const deck = decks[0].cards;
const blobDict = new Map<Blob, string>()
for(let i = 0; i < 50; i++) {
  const image = new Image;
  const blob = deck[i % deck.length].front_blob;
  if(!blobDict.has(blob)) {
    blobDict.set(blob, URL.createObjectURL(blob))
  }
  image.src = blobDict.get(blob)!;
  const start_z = table_z + Config.CardThicknessRatio + (a_little_bit * i);
  const card = await Card.CreateCardAsync(new THREE.Vector3(-6 + (i / 3), (-i / 14) - 1, start_z), image.src);
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

// CONTROLS
const zoomControls = new OrbitControls(camera, renderer.domElement);
zoomControls.zoomSpeed = 3;
zoomControls.panSpeed = 2;
zoomControls.enablePan = false;
zoomControls.enableRotate = false;
zoomControls.enableZoom = true;
zoomControls.maxDistance = 10;
zoomControls.minDistance = 4;
zoomControls.target = line.position;

const dragControls = new DragControls(Card.all_cards, camera, renderer.domElement);
dragControls.recursive = true;
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
  outlinePass.selectedObjects.push(clicked_card)
})

dragControls.addEventListener('dragend', (event) => {
  const clicked_card = (event.object as Card);
  clicked_card.toggle_pick_up()
  outlinePass.selectedObjects = [];
})

dragControls.addEventListener('drag', (event) => {
  const clicked_card = (event.object as Card);
  clicked_card.position.setZ(lockedDragZPosition);
  // var size = new THREE.Vector3()
  // clicked_card.geometry.boundingBox?.getSize(size)
  // if(clicked_card.position.y > -(size.y / 2)) {
  //   (clicked_card.material as THREE.Material[]).forEach(mat => {
  //     mat.opacity = .5;
  //     mat.transparent = true;
  //     mat.needsUpdate = true;
  //   })
  // }
  
})

dragControls.addEventListener('hoveron', (event) => {
  const card = (event.object as Card);
  if(card.card_front instanceof THREE.MeshPhongMaterial) {
    hud.material.map = card.isFlipped ? card_back_texture : card.card_front.map
    //hud.material.needsUpdate = true
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

window.dispatchEvent(new Event('resize'));

renderer.info.autoReset = false;
renderer.autoClear = false;

const render = function (t: number) {
  requestAnimationFrame( render );

  stats.begin()

  Card.all_cards.forEach(card => {
    card.update_animations(t);
  })

  zoomControls.update();

  renderer.info.reset();
  renderer.clear();
  renderer.render(scene, camera);
  if(outlinePass.selectedObjects.length > 0) {
    const selected = outlinePass.selectedObjects as THREE.Mesh[];
    const { x, y, width, height } = computeScissorForMeshes(renderer, camera, selected, 50);
    renderer.setScissorTest(true);
    renderer.setScissor(x, y, width, height);
    composer.render(t);
    renderer.setScissorTest(false);
  }

   stats.end()
};

render(0);

//scene.overrideMaterial = new THREE.MeshStandardMaterial({color: 'red', wireframe: true})