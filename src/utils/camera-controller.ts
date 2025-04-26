import { OrbitControls } from "three/examples/jsm/Addons";
import { Camera, MOUSE, Vector3 } from "three";
import { clamp } from "three/src/math/MathUtils";

export class CameraController extends OrbitControls {

    public min_pan_x: number = -5;
    public max_pan_x: number = 5;
    public locked_camera_y_position: number;
    public locked_camera_z_position: number;
    public target_locked_y: number;
    public target_locked_z: number;
    public panning: boolean = false;
    public pan_enabled: boolean = true;
    private camera: Camera;

    constructor(camera: Camera, domElement: HTMLElement, target: Vector3) {
        super(camera, domElement);

        this.camera = camera;
        this.zoomSpeed = 3;
        this.panSpeed = 2;
        this.enablePan = true;
        this.enableZoom = true;
        this.enableRotate = false;
        this.maxDistance = 10;
        this.minDistance = 4;
        this.target = target;

        this.target_locked_y = target.y;
        this.target_locked_z = target.z;
        this.locked_camera_y_position = camera.position.y;
        this.locked_camera_z_position = camera.position.z;

        this.domElement!.addEventListener('pointerdown', this.on_pointer_down);

        ['pointerup', 'pointercancel', 'pointerleave'].forEach(eventName => {
            this.domElement!.addEventListener(eventName, this.on_pointer_up_cancel_leave);
        });

        this.addEventListener('change', this.on_change)
    }

    private on_change = () => {
        this.target.x = clamp(this.target.x, this.min_pan_x, this.max_pan_x);
        this.target.y = this.target_locked_y;
        this.target.z = this.target_locked_z;
        this.camera.position.x = this.target.x;
        this.camera.position.y = this.locked_camera_y_position;
        if(this.panning) {
            this.camera.position.z = this.locked_camera_z_position;
        }
    }

    private on_pointer_up_cancel_leave = () => {
        this.panning = false;
    }

    private on_pointer_down = (event: MouseEvent) => {
        if(event.button == MOUSE.PAN) {
            this.panning = true;
        }
    }

    // Oh no, you are in real code land now
    public dispose() {
        this.domElement!.removeEventListener('pointerdown', this.on_pointer_down);
    
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(eventName => {
            this.domElement!.removeEventListener(eventName, this.on_pointer_up_cancel_leave);
        });
    
        this.removeEventListener('change', this.on_change);
    }
}