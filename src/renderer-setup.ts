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
    private cull_mesh_box = new THREE.Box3();
    private cull_mesh_size = new THREE.Vector2();
    private cull_mesh_ndcMax = new THREE.Vector2();
    private cull_mesh_ndcMin = new THREE.Vector2();

    public constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
        this.scene = scene;
        this.camera = camera;

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            canvas: document.getElementById('game') as HTMLCanvasElement,
            precision: 'highp',
        });
        this.renderer.shadowMap.enabled = true;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.info.autoReset = false;
        this.renderer.autoClear = false;
        this.renderer.debug.checkShaderErrors = false;

        this.composer = new EffectComposer(this.renderer);
        this.renderPass = new RenderPass(scene, camera);

        this.outlinePass = new OutlinePass(
          new THREE.Vector2(256, 256),
          scene,
          camera
        );
        this.outlinePass.edgeStrength = 4;
        this.outlinePass.edgeGlow = 2;
        this.outlinePass.pulsePeriod = 3;
        this.outlinePass.edgeThickness = 5;
        this.outlinePass.downSampleRatio = 1;
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
        
          this.renderer.setSize(w, h);
          this.renderer.setPixelRatio(devicePixelRatio);
          this.composer.setSize(w * devicePixelRatio, h * devicePixelRatio);
          this.composer.renderTarget1.setSize(w * devicePixelRatio, h * devicePixelRatio);
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

    public getWorldMousePos = (event: MouseEvent): THREE.Vector2 => {
        const elem = this.getRendererDomElement();
        const canvas_bounds = elem.getBoundingClientRect()
        return new THREE.Vector2(
            ((event.clientX - canvas_bounds.left) / canvas_bounds.width) * 2 - 1, 
            -((event.clientY - canvas_bounds.top) / canvas_bounds.height) * 2 + 1
        );
    }

    public getRendererDomElement = () => {
        return this.renderer.domElement as HTMLElement;
    }

    private cullMeshes = (scissor: ScissorRect): THREE.Mesh[] => {
        const returnMe: THREE.Mesh[] = [];

        this.renderer.getSize(this.cull_mesh_size);

        this.cull_mesh_ndcMin.set(
            (scissor.x / this.cull_mesh_size.x) * 2 - 1,
            (scissor.y / this.cull_mesh_size.y) * 2 - 1
        );

        this.cull_mesh_ndcMax.set(
            ((scissor.x + scissor.width) / this.cull_mesh_size.x) * 2 - 1,
            ((scissor.y + scissor.height) / this.cull_mesh_size.y) * 2 - 1
        );

        // for every mesh in scene:
        this.scene.traverse(obj => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.visible || !mesh.geometry || mesh.geometry instanceof THREE.PlaneGeometry) return;

            // get its world‑space bounding box
            const bufferGeom = mesh.geometry as THREE.BufferGeometry;
            if(!bufferGeom.boundingBox) {
                bufferGeom.computeBoundingBox();
            }
            this.cull_mesh_box.copy(bufferGeom.boundingBox!);
            this.cull_mesh_box.applyMatrix4(mesh.matrixWorld);

            // project min+max corners to NDC
            const mn = this.cull_mesh_box.min.project(this.camera);
            const mx = this.cull_mesh_box.max.project(this.camera);

            // quick test: does [mn,mx] overlap [ndcMin,ndcMax]?
            const overlaps =
                mx.x >= this.cull_mesh_ndcMin.x && mn.x <= this.cull_mesh_ndcMax.x &&
                mx.y >= this.cull_mesh_ndcMin.y && mn.y <= this.cull_mesh_ndcMax.y;
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

