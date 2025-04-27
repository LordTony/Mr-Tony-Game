import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';
import { computeScissorForMeshes, ScissorRect } from './utils/scissor-helper';
import { Config } from './config';
import remove from 'lodash-es/remove';

export class OutlineRenderer {
    private renderer: THREE.WebGLRenderer;
    private composer: EffectComposer;
    private camera: THREE.PerspectiveCamera;
    private scene: THREE.Scene;
    private renderPass: RenderPass;
    private outlinePass: OutlinePass;
    private outputPass: OutputPass;

    public constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
        this.scene = scene;
        this.camera = camera;

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            canvas: canvas,
            powerPreference: 'high-performance',
        });
        this.renderer.shadowMap.enabled = true;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.info.autoReset = false;
        this.renderer.autoClear = false;
        this.renderer.debug.checkShaderErrors = false;

        this.composer = new EffectComposer(this.renderer);

        this.renderPass = new RenderPass(scene, camera);

        this.outlinePass = new OutlinePass(
          new THREE.Vector2(128, 128),
          scene,
          camera
        );
        this.outlinePass.edgeStrength = 4;
        this.outlinePass.edgeGlow = 2;
        this.outlinePass.pulsePeriod = 3;
        this.outlinePass.edgeThickness = 3;
        this.outlinePass.downSampleRatio = 1.5;
        this.outlinePass.visibleEdgeColor.set('white');
        this.outlinePass.hiddenEdgeColor.set('white');
        this.outlinePass.selectedObjects = [];
        this.outlinePass.renderTargetMaskBuffer = new THREE.WebGLRenderTarget(
            undefined, 
            undefined, 
            { 
                samples: 3,
                depthBuffer: false,
                resolveDepthBuffer: false,
                resolveStencilBuffer: false
            } as THREE.RenderTargetOptions
        );

        this.outputPass = new OutputPass();

        this.composer.addPass(this.renderPass);
        this.composer.addPass(this.outlinePass);
        this.composer.addPass(this.outputPass);
    
        addEventListener("resize", () => {
          const height_is_limit = window.innerWidth / window.innerHeight > Config.GameAspectRatio
        
          const w = height_is_limit 
            ? window.innerHeight * Config.GameAspectRatio
            : window.innerWidth;
        
          const h = height_is_limit 
            ? window.innerHeight
            : window.innerWidth / Config.GameAspectRatio;
        
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        
          var pixel_ratio_to_use = Math.min(devicePixelRatio, 1.25);

          this.renderer.setSize(w, h);
          this.renderer.setPixelRatio(pixel_ratio_to_use);
          this.composer.setSize(w * pixel_ratio_to_use, h * pixel_ratio_to_use);
        });
    
        window.dispatchEvent(new Event('resize'));

        this.warmUp();
    }

    // This will get all of the rendering trash warmed up
    private warmUp() {
        // Compile everything and render it just in case
        this.renderer.compile(this.scene, this.camera);
        this.renderer.render(this.scene, this.camera);
        
        // Warm up the outline pass by feeding it a mesh and getting it to fire
        // Should also warm up the whole compser
        const dummyMesh = this.scene.children.find(x => x instanceof THREE.Mesh)!;
        this.addOutlinedObject(dummyMesh);
        this.composer.render(0);
        this.clearOutlinedObjects();
    }

    public clearOutlinedObjects() {
        this.outlinePass.selectedObjects = [];
    }

    public addOutlinedObject(selectedObject: THREE.Object3D<THREE.Object3DEventMap>) {
        this.outlinePass.selectedObjects.push(selectedObject);
    }

    public removeOutlinedObject(selectedObject: THREE.Object3D<THREE.Object3DEventMap>) {
        remove(this.outlinePass.selectedObjects, (item) => item == selectedObject);
    }

    // Avoid re-allocating vectors every frame.
    private card_bounding_sphere = new THREE.Sphere();
    private renderer_size = new THREE.Vector2();
    private scissor_normalized_coords_bottom_right = new THREE.Vector2();
    private scissor_normalized_coords_top_left = new THREE.Vector2();
    private edge_point = new THREE.Vector3();
    private center_ndc = new THREE.Vector3();

    private cullMeshes = (scissor: ScissorRect): THREE.Mesh[] => {

        const returnMe: THREE.Mesh[] = [];

        this.renderer.getSize(this.renderer_size);

        this.scissor_normalized_coords_top_left.set(
            (scissor.x / this.renderer_size.x) * 2 - 1,
            (scissor.y / this.renderer_size.y) * 2 - 1
        );

        this.scissor_normalized_coords_bottom_right.set(
            ((scissor.x + scissor.width) / this.renderer_size.x) * 2 - 1,
            ((scissor.y + scissor.height) / this.renderer_size.y) * 2 - 1
        );

        // for every mesh in scene:
        this.scene.traverse(obj => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.visible || !mesh.geometry || mesh.geometry instanceof THREE.PlaneGeometry) return;

            // get its world‑space bounding box
            const bufferGeom = mesh.geometry as THREE.BufferGeometry;
            if (!bufferGeom.boundingSphere) {
                bufferGeom.computeBoundingSphere();
            }

            this.card_bounding_sphere.copy(bufferGeom.boundingSphere!);
            this.card_bounding_sphere.applyMatrix4(mesh.matrixWorld);
            
            this.center_ndc.copy(this.card_bounding_sphere.center)
            this.center_ndc.project(this.camera)

            this.edge_point.copy(this.card_bounding_sphere.center)
            this.edge_point.setX(this.edge_point.x + this.card_bounding_sphere.radius)
            this.edge_point.project(this.camera);

            const fudge_factor = .2;
            const radiusNDC = Math.abs(this.edge_point.x - this.center_ndc.x) + fudge_factor;

            const overlaps = 
                (this.center_ndc.x + radiusNDC) >= this.scissor_normalized_coords_top_left.x &&
                (this.center_ndc.x - radiusNDC) <= this.scissor_normalized_coords_bottom_right.x &&
                (this.center_ndc.y + radiusNDC) >= this.scissor_normalized_coords_top_left.y &&
                (this.center_ndc.y - radiusNDC) <= this.scissor_normalized_coords_bottom_right.y;

            if(!overlaps) {
                mesh.visible = false;
                returnMe.push(mesh);
            }
        });
        return returnMe;
    }

    public render(t: number) {
          this.renderer.info.reset();
          this.renderer.clear();
          const selected = this.outlinePass.selectedObjects as THREE.Mesh[];
          this.renderer.render(this.scene, this.camera);
          if(selected.length > 0) {
            const s: ScissorRect = computeScissorForMeshes(this.renderer, this.camera, selected, 10);
            this.renderer.setScissorTest(true);
            this.renderer.setScissor(s.x, s.y, s.width, s.height);
            const culled = this.cullMeshes(s);
            this.composer.render(t);
            for(var i = 0; i < culled.length; i++) {
                culled[i].visible = true;
            }
            this.renderer.setScissorTest(false);
          }
    }
}

