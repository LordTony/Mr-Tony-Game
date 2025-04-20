import { Vector3 } from 'three';
import { Config } from './config';
import { Easing, Tween } from '@tweenjs/tween.js';
import * as THREE from 'three'

const card_material_defaults = {
	shininess: 20,
	reflectivity: 10
} as const

export class Card extends THREE.Mesh {
	// public
	public isTapped: boolean = false;
	public isBeingDragged: boolean = false;
	public isFlipped: boolean = false;
	public card_front: THREE.Material;
	public card_back: THREE.Material;

	// private
	private tap_animation: Tween | null = null;
	private pick_up_animation: Tween | null = null;
	private flip_animation: Tween | null = null; 
	private drag_lift = { value: 0 };
	private flip_lift = { value: 0 };
	private z_displacement = { value: 0 }; // this is a magic uniform
	//private borderMesh: THREE.Mesh | null = null;

	// public static
	public static card_layer = 4;
	public static url_to_material_cache = new Map<string, THREE.Material>();
	public static all_cards: Card[] = [];
	public static top_card_z_offset: number = 0;

	// private static
	private static geometry: THREE.ShapeGeometry;
	
	static {
		// Card dimensions and rounding radius
		const h_width = Config.CardWidth / 2;
		const h_height = h_width * Config.CardAspectRatio;
		const thickness = Config.CardWidth * Config.CardThicknessRatio;
		const r = 0.03; // Rounded corner radius

		const shape = new THREE.Shape();
		shape.moveTo(-h_width + r, -h_height);
		shape.lineTo( h_width - r, -h_height);
		shape.absarc( h_width - r, -h_height + r, r, -Math.PI / 2, 0            , false);
		shape.lineTo( h_width    ,  h_height - r);
		shape.absarc( h_width - r,  h_height - r, r, 0           , Math.PI / 2  , false);
		shape.lineTo(-h_width + r,  h_height);
		shape.absarc(-h_width + r,  h_height - r, r, Math.PI / 2 , Math.PI      , false);
		shape.lineTo(-h_width    , -h_height + r);
		shape.absarc(-h_width + r, -h_height + r, r, Math.PI     , 1.5 * Math.PI, false);

		Card.geometry = new THREE.ShapeGeometry(shape, 1);
		Card.geometry.center();

		// ensure the geometry has a current bounding box
		Card.geometry.computeBoundingBox();
		const bb   = Card.geometry.boundingBox!;
		const minX = bb.min.x;
		const maxX = bb.max.x;
		const minY = bb.min.y;
		const maxY = bb.max.y;

		const pos  = Card.geometry.attributes.position;
		const count = pos.count;
		const uvs  = new Float32Array(2 * count);

		for (let i = 0; i < count; i++) {
			const x = pos.getX(i);
			const y = pos.getY(i);
			uvs[2*i]   = (x - minX) / (maxX - minX);
			uvs[2*i+1] = (y - minY) / (maxY - minY);
		}

		Card.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
	}

	private constructor(start_position: Vector3, card_front: THREE.MeshPhongMaterial, card_back: THREE.MeshPhongMaterial) {
		const card_front_clone = card_front.clone();
		const card_back_clone = card_front.clone();
		card_front_clone.side = THREE.DoubleSide;

		card_front_clone.onBeforeCompile = ( shader ) => {
			shader.uniforms.mapBack = { value: card_back.map?.clone() };

			shader.fragmentShader = shader.fragmentShader.replace(
				`#include <common>`,
				`
					#include <common>
					#ifdef USE_MAP
						uniform sampler2D mapBack;
					#endif
				`
				);

			shader.fragmentShader = shader.fragmentShader.replace(
			`#include <map_fragment>`,
			`
				#ifdef USE_MAP
					vec4 frontColor = texture2D( map, vMapUv );
					vec2 mirroredUv = vec2(1.0 - vMapUv.x, vMapUv.y);
					vec4 backColor  = texture2D( mapBack, mirroredUv );
					vec4 sampledDiffuseColor = gl_FrontFacing ? frontColor : backColor;
					#ifdef DECODE_VIDEO_TEXTURE
						sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
					#endif
					diffuseColor *= sampledDiffuseColor;
				#endif
			`
			);
		};

		super(Card.geometry, card_front_clone);
		this.card_front = card_front_clone;
		this.card_back = card_back_clone;
		this.layers.enable(Card.card_layer);
		this.position.copy(start_position);
		this.z_displacement = { value: 0 };
		this.castShadow = false;
		this.receiveShadow = true;
		const updateMatrixWorld_unmodified = this.updateMatrixWorld;

		this.updateMatrixWorld = function (force) {
			updateMatrixWorld_unmodified.call(this, force);
			this.matrixWorld.elements[14] += this.z_displacement.value;
		};
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
				...card_material_defaults
			});
			material.map!.colorSpace = THREE.SRGBColorSpace;
			Card.url_to_material_cache.set(front_key, material)
		}


		if(!this.url_to_material_cache.has(back_key)) {
			const backTexture = await loader.loadAsync(back_key);
			backTexture.colorSpace = THREE.SRGBColorSpace;
			const material = new THREE.MeshPhongMaterial({ 
				map: backTexture,
				...card_material_defaults
			});
			Card.url_to_material_cache.set(back_key, material)
		}

		const cache_front = Card.url_to_material_cache.get(front_key) as THREE.MeshPhongMaterial;
		const cache_back = Card.url_to_material_cache.get(back_key) as THREE.MeshPhongMaterial;
		const returnMe = new Card(start_position, cache_front, cache_back)
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
		const target_z = { value: this.isBeingDragged ? .5 : 0 };
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
		// This is a hack because the z_displacement_shader makes cards cast shadows on themselves
		// this needs to be based on the table height
		this.castShadow = this.z_displacement.value != 0;
		this.receiveShadow = !this.castShadow;
	}
}
