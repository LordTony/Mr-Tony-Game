import * as THREE from 'three';
import Stats from 'stats.js'
import orderBy from 'lodash-es/orderBy';

import { Config } from './config';
import { DragControls } from 'three/examples/jsm/Addons'
import { Card } from './card';
import { DB } from './utils/database';
import { OutlineRenderer } from './renderer-setup';
import { CameraController } from './utils/camera-controller';
//import { GUI } from 'dat.gui';

const table_z = -3;
const table_width = 50;
const table_height = 50;
const a_little_bit = .0002

const texture_Loader = new THREE.TextureLoader();
const bg = await texture_Loader.loadAsync(Config.BackgroundUrl)
const card_back_texture = await texture_Loader.loadAsync(Config.CardBackUrl);

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
bg.offset = new THREE.Vector2(0, .5)
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
  new THREE.MeshBasicMaterial({color: 'black', opacity: .4, transparent: true})
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
card_back_texture.colorSpace = THREE.SRGBColorSpace;
const hud = new THREE.Mesh(
  new THREE.PlaneGeometry(hud_width, hud_height),
  new THREE.MeshBasicMaterial({ map: card_back_texture })
);
hud.position.set((-(height_width.x - hud_width) / 2) + .001, (height_width.y - hud_height) / 2 - .0005, -camera.near)
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

const deck = decks[0].cards;
const blobDict = new Map<Blob, string>()
for(let i = 0; i < 300; i++) {
  const image = new Image;
  const blob = deck[i % deck.length].front_blob;
  if(!blobDict.has(blob)) {
    blobDict.set(blob, URL.createObjectURL(blob))
  }
  image.src = blobDict.get(blob)!;
  const start_z = table_z + Config.CardThicknessRatio + (a_little_bit * i);
  const card = await Card.CreateCardAsync(new THREE.Vector3(-6 + (i / 10), (-i / 30) - 1, start_z), image.src);
  field_cards.add(card);
}

const raycaster = new THREE.Raycaster();
raycaster.layers.set(Card.card_layer);

const renderer = new OutlineRenderer(scene, camera);
const domElement = renderer.getRendererDomElement();

const getTopClickedCard = (event: MouseEvent): Card | null => {
  raycaster.setFromCamera(renderer.getWorldMousePos(event), camera);
  const intersects = raycaster.intersectObjects(field_cards.children, false).filter(x => x.object instanceof Card);
  return intersects.length == 0 ? null : intersects[0].object as Card;
}

domElement.addEventListener('dblclick', (event: MouseEvent) => {
  const card = getTopClickedCard(event);
  if(card) {
    moveCardToTop(card);
    card.toggle_tap()
  }
}
, false);


domElement.addEventListener('mouseup', (event: MouseEvent) => {
  if(event.button == 2) {
    const card = getTopClickedCard(event);
    if(card) {
      moveCardToTop(card);
      card.flip_over(() => {
        hud.material.map = card.isFlipped ? card_back_texture : (card.card_front as THREE.MeshPhongMaterial).map;
      })
    }
  }
}
, false);

// CONTROLS
const camera_controller = new CameraController(camera, domElement, line.position.clone());

const dragControls = new DragControls(Card.all_cards, camera, domElement);
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
  renderer.addOutlinedObject(clicked_card);
})

dragControls.addEventListener('dragend', (event) => {
  const clicked_card = (event.object as Card);

  const above = new THREE.Vector3(clicked_card.position.x, clicked_card.position.y + .1, clicked_card.position.z + 2);
  raycaster.set(above, new THREE.Vector3(0, 0, -1));
  raycaster.layers.set(Card.card_layer);
  const intersections = raycaster.intersectObjects(Card.all_cards, true)
  if(intersections.length > 1) {
    for(var i = 0; i < intersections.length; i++) {
      const hit = intersections[i];
      if(hit.object == clicked_card) {
        continue;
      }
      const cardIsCloseEnough = hit.point.distanceTo(hit.object.position) < .4;
      if(cardIsCloseEnough) {
        clicked_card.position.setX(hit.object.position.x)
        clicked_card.position.setY(hit.object.position.y - Config.CardLabelBottomViewOffset)
      }
      const col = cardIsCloseEnough ? 0xff0000 : 0x0000ff;
      var arrow = new THREE.ArrowHelper(raycaster.ray.direction, raycaster.ray.origin, 8, col );
      scene.add( arrow );
      break;
    }
  }
  clicked_card.toggle_pick_up()
  renderer.removeOutlinedObject(clicked_card);
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
  }
})

dragControls.addEventListener('hoveroff', () => {
  hud.material.map = null
})

// Hack to override the listener
const hack_me = (dragControls as any);
domElement.removeEventListener('pointerdown', hack_me._onPointerDown);
const original_OnPointerDown = hack_me._onPointerDown;
hack_me._onPointerDown = function(event: MouseEvent) {
  if (event.button === 2) { return }
  original_OnPointerDown.call(this, event);
};
domElement.addEventListener('pointerdown', hack_me._onPointerDown);

const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);
stats.dom.style.left = `${document.body.getBoundingClientRect().right - stats.dom.getBoundingClientRect().width - 8}px`;
stats.dom.style.top = '8px';

const render = function (t: number) {
  requestAnimationFrame( render );

  stats?.begin()

  for(let i = 0; i < Card.all_cards.length; i++) {
    Card.all_cards[i].update_animations(t);
  }

  camera_controller.update();
  renderer.render(t);
  stats?.end()
};

render(0);

//scene.overrideMaterial = new THREE.MeshStandardMaterial({color: 'red', wireframe: true})