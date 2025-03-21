import { Actor, ActorArgs, BoundingBox, Collider, Engine, PolygonCollider, Scene, Shape } from "excalibur";

type DomElementType = 'div' | 'button' | 'span' | 'input';

type HtmlDomActorArgs = ActorArgs & {
    elementType: DomElementType;
    elementClassName?: string;
    elementId?: string;
    textContent?: string;
}

export class HtmlDomActor extends Actor {
    elementRef: HTMLElement;

    // mirroring the constructor args
    elementType: DomElementType;
    elementClassName?: string;
    elementId?: string;
    textContent?: string;

    override get width() {
        return this.elementRef.clientWidth;
    }

    override set width(value: number) {
        this.elementRef.style.width = value + 'px';
    }

    override get height() {
        return this.elementRef.clientHeight;
    }

    override set height(value: number) {
        this.elementRef.style.height = value + 'px';
    }

    private updatePositionInDom() {
        const ref = this.elementRef;

        if(this.isInitialized) {
            if(this.collider.bounds.width != ref.clientWidth || this.collider.bounds.height != ref.clientHeight) {
                this.collider.set(Shape.Box(ref.clientWidth, ref.clientHeight, this.anchor));
            }
        }

        if(this.parent instanceof Actor) {
            const nextLeft = `${this.parent.globalPos.x + this.pos.x - ref.clientWidth * this.anchor.x}px`;
            const nextTop = `${this.parent.globalPos.y + this.pos.y - ref.clientHeight * this.anchor.y}px`;
            if(nextLeft != ref.style.left || nextTop != ref.style.top) {
                ref.style.left = nextLeft;
                ref.style.top = nextTop;
            }
        }
    }

    constructor(args: HtmlDomActorArgs) {
        super(args)
        this.elementRef = document.createElement(args.elementType);
        this.elementType = args.elementType;
        this.elementClassName = args.elementClassName;
        this.elementId = args.elementId;
        this.textContent = args.textContent;

        this.elementRef.style.zIndex = this.z.toString();

        if(this.elementId) {
            this.elementRef.id = this.elementId;
        }

        if(this.elementClassName) {
            this.elementRef.className = this.elementClassName;
        }

        if(this.textContent) {
            this.elementRef.textContent = this.textContent;
        }

        if(this.width) {
            this.elementRef.style.width = this.width + 'px';
        }

        if(this.height) {
            this.elementRef.style.height = this.height + 'px';
        }
    }

    override onAdd(engine: Engine): void {
        super.onAdd(engine);
        document.getElementById("ui")?.append(this.elementRef);

        this.on('predraw', () => this.updatePositionInDom());
    }

    override onRemove(engine: Engine): void {
        super.onRemove(engine)
        this.elementRef.remove();
    }

    override onPostKill(scene: Scene): void {
        super.onPostKill(scene)
        this.elementRef.remove();
    }
}