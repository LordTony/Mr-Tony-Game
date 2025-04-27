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

const domElement = document.getElementById('game') as HTMLCanvasElement;
const texture_Loader = new THREE.TextureLoader();
const table_z = -3;
const table_width = 50;
const table_height = 50;
const a_little_bit = .0002

const bg = await texture_Loader.loadAsync(Config.BackgroundUrl)
const card_back_texture = await texture_Loader.loadAsync(Config.CardBackUrl);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(50, Config.GameAspectRatio, 0.1, 20);
camera.position.setZ(5);
camera.position.setY(-3);

scene.add(camera)

// LIGHTS
const lighting = new THREE.AmbientLight('white', .8);
scene.add( lighting );

const spot_light = new THREE.DirectionalLight('white', 1)
spot_light.rotateX(Math.PI / 2)
spot_light.rotateZ(Math.PI / 10)
spot_light.position.set(0, 0, 4);
spot_light.castShadow = true;
spot_light.shadow.mapSize = new THREE.Vector2(1024, 1024);
spot_light.shadow.camera.top = 9;
spot_light.shadow.camera.bottom = -5;
spot_light.shadow.camera.left = -12;
spot_light.shadow.camera.right = 12;
spot_light.shadow.camera.near = 0;
spot_light.shadow.camera.far = 20;
scene.add( spot_light );

// TABLE
bg.offset = new THREE.Vector2(0, .5)
bg.colorSpace = THREE.SRGBColorSpace;
bg.wrapS = THREE.RepeatWrapping;
bg.wrapT = THREE.RepeatWrapping;
bg.repeat.set(15,15)
const table = new THREE.Mesh(
  new THREE.PlaneGeometry(table_width, table_height), 
  new THREE.MeshStandardMaterial({map: bg})
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

//Create a helper for the shadow camera (optional)
//scene.add( new THREE.CameraHelper( spot_light.shadow.camera ) );

//const helper = new THREE.DirectionalLightHelper(spot_light, 1)
//scene.add( helper );

// Game Code
const db = new DB()
await db.init()
const decks = await db.getAllDecks()

const deck = decks[0].cards;
const blobDict = new Map<Blob, string>()
for(let i = 0; i < 60; i++) {
  const image = new Image;
  const blob = deck[i % deck.length].front_blob;
  if(!blobDict.has(blob)) {
    blobDict.set(blob, URL.createObjectURL(blob))
  }
  image.src = blobDict.get(blob)!;
  const start_z = table_z + Config.CardThicknessRatio + (a_little_bit * i);
  const card = await Card.CreateCardAsync(new THREE.Vector3(-6 + (i / 10), (-i / 30) - 1, start_z), image.src);
  scene.add(card);
}

const card_raycaster = new THREE.Raycaster();
card_raycaster.layers.set(Card.card_layer);

const world_mouse_pos = new THREE.Vector2();
const getWorldMousePos = (event: MouseEvent): THREE.Vector2 => {
    const canvas_bounds = domElement.getBoundingClientRect()
    return world_mouse_pos.set(
        ((event.clientX - canvas_bounds.left) / canvas_bounds.width) * 2 - 1, 
        -((event.clientY - canvas_bounds.top) / canvas_bounds.height) * 2 + 1
    );
}


const getTopClickedCard = (event: MouseEvent): Card | null => {
  card_raycaster.setFromCamera(getWorldMousePos(event), camera);
  const intersects = card_raycaster.intersectObjects(Card.all_cards, false);
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


let mouse_down_card: Card | null = null;
domElement.addEventListener('mousedown', (event: MouseEvent) => {
  if(event.button == 2) {
    mouse_down_card = getTopClickedCard(event);
  }
}
, false);

domElement.addEventListener('mouseup', (event: MouseEvent) => {
  if(event.button == 2) {
    const card = getTopClickedCard(event);
    if(card && card == mouse_down_card) {
      moveCardToTop(card);
      card.flip_over(() => {
        hud.material.map = card.isFlipped ? card_back_texture : (card.card_front as THREE.MeshStandardMaterial).map;
      })
    }
  }
}
, false);

// CONTROLS
const camera_controller = new CameraController(camera, domElement, line.position.clone());

camera_controller.addEventListener('change', () => {
  spot_light.shadow.camera.position.setX(camera.position.x);
  console.log("moved shadow camera position");
});

const dragControls = new DragControls(Card.all_cards, camera, domElement);
dragControls.raycaster.layers.set(Card.card_layer)

const moveCardToTop = (card_to_put_on_top: Card) => {
  const cards_above = Card.all_cards.filter(card => (card as Card).position.z > card_to_put_on_top.position.z);
  const higher_cards = orderBy(cards_above, (card) => card.position.z);

  // swap everything
  higher_cards.forEach(card => {
    const temp = card_to_put_on_top.position.z;
    card_to_put_on_top.position.setZ(card.position.z);
    card.position.setZ(temp);
  })
}

const renderer = new OutlineRenderer(scene, camera, domElement);

let lockedDragZPosition = 0;
dragControls.addEventListener('dragstart', (event) => {
  const clicked_card = (event.object as Card);
  moveCardToTop(clicked_card)
  clicked_card.toggle_pick_up()
  lockedDragZPosition = clicked_card.position.z;
  renderer.addOutlinedObject(clicked_card);
})

const above = new THREE.Vector3();
const above_direction = new THREE.Vector3(0, 0, -1);

dragControls.addEventListener('dragend', (event) => {
  const clicked_card = (event.object as Card);

  above.set(clicked_card.position.x, clicked_card.position.y + .1, clicked_card.position.z + 2);
  card_raycaster.set(above, above_direction);
  const intersections = card_raycaster.intersectObjects(Card.all_cards, true)
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
      var arrow = new THREE.ArrowHelper(card_raycaster.ray.direction, card_raycaster.ray.origin, 8, col );
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
})

dragControls.addEventListener('hoveron', (event) => {
  const card = (event.object as Card);
  if(card.card_front["map"]) {
    hud.material.map = card.isFlipped ? card_back_texture : card.card_front["map"]
  }
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