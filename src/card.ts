import { Vector3 } from 'three';
import { Config } from './config';
import { Easing, Tween } from '@tweenjs/tween.js';
import * as THREE from 'three'
import { AddZOffsetToExistingMaterial, GenerateDepthMaterialWithZOffset, GenerateDistanceMaterialWithZOffset } from './utils/shader-generators';

// Custom UV generator for ExtrudeGeometry
const uvGenerator: THREE.UVGenerator = {
	generateTopUV: function (_geometry, vertices, indexA, indexB, indexC) {
		// Extract vertex coordinates from the flat vertices array
		const ax = vertices[indexA * 3];
		const ay = vertices[indexA * 3 + 1];
		const bx = vertices[indexB * 3];
		const by = vertices[indexB * 3 + 1];
		const cx = vertices[indexC * 3];
		const cy = vertices[indexC * 3 + 1];
	
		const height = Config.CardWidth * Config.CardAspectRatio;
		// Normalize to [0, 1] based on the card dimensions (assuming the card is centered at 0)
		const uva = new THREE.Vector2((ax + Config.CardWidth / 2) / Config.CardWidth, (ay + height / 2) / height);
		const uvb = new THREE.Vector2((bx + Config.CardWidth / 2) / Config.CardWidth, (by + height / 2) / height);
		const uvc = new THREE.Vector2((cx + Config.CardWidth / 2) / Config.CardWidth, (cy + height / 2) / height);

		return [uva, uvb, uvc];
	},
  
	generateSideWallUV: function () {
	  // This simple example maps each side wall face to a full texture square.
	  // You can adjust this logic to better match BoxGeometry's side UV mapping.
	  const uvA = new THREE.Vector2(0, 0);
	  const uvB = new THREE.Vector2(1, 0);
	  const uvC = new THREE.Vector2(1, 1);
	  const uvD = new THREE.Vector2(0, 1);
	  return [uvA, uvB, uvC, uvD];
	}
  };

export class Card extends THREE.Mesh {
	public isTapped: boolean = false;
	public isBeingDragged: boolean = false;
	public isFlipped: boolean = false;
	public card_front: THREE.Material;
	private tap_animation: Tween | null = null;
	private pick_up_animation: Tween | null = null;
	private flip_animation: Tween | null = null; 
	private drag_lift = { value: 0 };
	private flip_lift = { value: 0 };
	private z_displacement = { value: 0 }; // this is a magic inform

	public static card_layer = 52;
	public static url_to_material_cache = new Map<string, THREE.Material>();

	private static geometry: THREE.ExtrudeGeometry;
	private static side_material = new THREE.MeshPhongMaterial({ 
		color: new THREE.Color('#121105'),
		transparent: true,
		shininess: 20,
		reflectivity: 10
	});
	public static all_cards: Card[] = [];
	public static top_card_z_offset: number = 0;

	static {
		// Card dimensions and rounding radius
		const width = Config.CardWidth;
		const height = Config.CardWidth * Config.CardAspectRatio;
		const thickness = Config.CardWidth * Config.CardThicknessRatio;
		const radius = 0.02; // Rounded corner radius

		const shape = new THREE.Shape();
		shape.moveTo(-width / 2 + radius, -height / 2);
		shape.lineTo(width / 2 - radius, -height / 2);
		shape.absarc(width / 2 - radius, -height / 2 + radius, radius, -Math.PI / 2, 0, false);
		shape.lineTo(width / 2, height / 2 - radius);
		shape.absarc(width / 2 - radius, height / 2 - radius, radius, 0, Math.PI / 2, false);
		shape.lineTo(-width / 2 + radius, height / 2);
		shape.absarc(-width / 2 + radius, height / 2 - radius, radius, Math.PI / 2, Math.PI, false);
		shape.lineTo(-width / 2, -height / 2 + radius);
		shape.absarc(-width / 2 + radius, -height / 2 + radius, radius, Math.PI, 1.5 * Math.PI, false);
		
		const extrudeSettings: THREE.ExtrudeGeometryOptions = {
			depth: thickness,
			bevelOffset: 0,
			bevelSize: 0,
			bevelThickness: 0,
			bevelSegments: 1,
			steps: 1,
			UVGenerator: uvGenerator
		};
		  
		// Create the geometry by extruding the 2D shape
		Card.geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
		const normalAttr = Card.geometry.attributes.normal;
		const posAttr = Card.geometry.attributes.position;
		const triangleCount = posAttr.count / 3;
		
		Card.geometry.clearGroups();
		
		for (let i = 0; i < triangleCount; i++) {
		  const aIndex = i * 3;
		  const bIndex = aIndex + 1;
		  const cIndex = aIndex + 2;
		
		  // Get normals from the normal attribute for each vertex
		  const na = new THREE.Vector3(
			normalAttr.getX(aIndex),
			normalAttr.getY(aIndex),
			normalAttr.getZ(aIndex)
		  );
		  const nb = new THREE.Vector3(
			normalAttr.getX(bIndex),
			normalAttr.getY(bIndex),
			normalAttr.getZ(bIndex)
		  );
		  const nc = new THREE.Vector3(
			normalAttr.getX(cIndex),
			normalAttr.getY(cIndex),
			normalAttr.getZ(cIndex)
		  );
		
		  // Average the normals
		  const avgNormal = new THREE.Vector3()
			.add(na)
			.add(nb)
			.add(nc)
			.divideScalar(3);
		
		  let materialIndex: number;
		  // If the average normal is strongly vertical, treat it as a cap.
		  // Use a threshold—here 0.7 works reasonably well, but you may need to tweak it.
		  if (Math.abs(avgNormal.z) > 0.7) {
			materialIndex = avgNormal.z > 0 ? 0 : 1;
		  } else {
			// Side
			materialIndex = 2;
		  }
		
		  // Assign this triangle to the appropriate material group.
		  Card.geometry.addGroup(aIndex, 3, materialIndex);
		}
	}

	private constructor(start_position: Vector3, card_front: THREE.Material, card_back: THREE.Material) {
		const clone_front = card_front.clone();
		const clone_back = card_back.clone();
		const clone_side = Card.side_material.clone()
		const zOffsetUniform = { value: 0 };
		const cloneMaterials = [clone_front, clone_back, clone_side].map(mat => {
			AddZOffsetToExistingMaterial(mat, zOffsetUniform);
			return mat;
		})
		super(Card.geometry, cloneMaterials);
		this.customDepthMaterial = GenerateDepthMaterialWithZOffset(zOffsetUniform);
		this.customDistanceMaterial = GenerateDistanceMaterialWithZOffset(zOffsetUniform);
		this.z_displacement = zOffsetUniform;
		this.card_front = clone_front;
		this.geometry.center();
		this.position.copy(start_position);
		this.layers.enable(Card.card_layer);
	}

	public static async CreateCardAsync(
		start_position: Vector3, 
		card_front: string, 
		card_back: string = Config.CardBackUrl
	) : Promise<Card>
	{
		const loader = new THREE.TextureLoader();

		const front_key = card_front;
		const back_key = card_back;

		if(!this.url_to_material_cache.has(front_key)) {
			const material = new THREE.MeshPhongMaterial({ 
				map: await loader.loadAsync(front_key),
				shininess: 20,
				reflectivity: 10
			});
			material.map!.colorSpace = THREE.SRGBColorSpace;
			material.map!.center.set(1,1)
			Card.url_to_material_cache.set(front_key, material)
		}


		if(!this.url_to_material_cache.has(back_key)) {
			const backTexture = await loader.loadAsync(back_key);
			backTexture.colorSpace = THREE.SRGBColorSpace;
			backTexture.repeat.x = -1;
			backTexture.offset.x = 1;
			const material = new THREE.MeshPhongMaterial({ 
				map: backTexture,
				shininess: 20,
				reflectivity: 10,
			});
			Card.url_to_material_cache.set(back_key, material)
		}

		const returnMe = new Card(start_position, Card.url_to_material_cache.get(front_key) as THREE.Material, Card.url_to_material_cache.get(back_key) as THREE.Material)
		returnMe.castShadow = true;
		returnMe.receiveShadow = true;
		Card.all_cards.push(returnMe);
		return returnMe;
	}

	// Helper to normalize an angle to [-Math.PI, Math.PI]
	private normalizeAngle(angle: number): number {
		return Math.atan2(Math.sin(angle), Math.cos(angle));
  	}
  
	public toggle_tap() {
		if(this.tap_animation == null) {
			const change_by_angle = (Math.PI / 2) * (this.isTapped ? 1 : -1);
			const targetAngle = this.normalizeAngle(this.rotation.z + change_by_angle);
			const duration = 250;
			this.tap_animation = new Tween(this.rotation)
				.to({ z: targetAngle }, duration)
				.easing(Easing.Cubic.Out)
				.onComplete(() => {
					this.tap_animation = null;
					this.isTapped = !this.isTapped;
				})
				.start();
		}
	}

	public flip_over(onCompleteCallback?: () => void) {
		if(this.flip_animation == null) {
			const start_z = { value: 0 };
			const target_z = { value: .7 };
			const lift_duration = 300;
			const flip_duration = 300;
			const fall_duration = 200
			const targetAngle = this.normalizeAngle(this.rotation.y + (Math.PI * (this.isFlipped ? -1 : 1)));
			const target_rotation = { y: targetAngle };

			this.flip_animation = new Tween(this.flip_lift)
				.to(target_z, lift_duration)
				.easing(Easing.Exponential.In)
				.onComplete(() => {
					this.flip_animation = new Tween(this.rotation)
						.to(target_rotation, flip_duration)
						.easing(Easing.Back.Out)
						.onComplete(() => {
							this.flip_animation = new Tween(this.flip_lift)
								.to(start_z, fall_duration)
								.easing(Easing.Exponential.Out)
								.onComplete(() => {
									this.isFlipped = !this.isFlipped;
									this.flip_animation = null;
									onCompleteCallback?.()
								})
							.start();
						})
						.start();
				})
				.start()
		}
	}

	public toggle_pick_up() {
		this.isBeingDragged = !this.isBeingDragged;
		const target_z = { value: this.isBeingDragged ? .3 : 0 };
		const duration = this.isBeingDragged ? 300 : 200;
		this.pick_up_animation = new Tween(this.drag_lift)
			.to(target_z, duration)
			.easing(this.isBeingDragged ? Easing.Back.Out : Easing.Back.In)
			.onComplete(() => {
				this.pick_up_animation = null;
			})
			.start();
	}

	public update_animations(t: number) {
		this.tap_animation?.update(t);
		this.pick_up_animation?.update(t);
		this.flip_animation?.update(t);
		this.z_displacement.value = this.flip_lift.value + this.drag_lift.value;
		this.receiveShadow = this.z_displacement.value == 0;
	}
}
