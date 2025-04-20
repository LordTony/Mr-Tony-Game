import * as THREE from 'three'

interface ScissorRect {
    x: number;
    y: number;
    width: number;
    height: number;
  }
  
  /**
   * Computes a scissor rectangle (in pixel coords) enclosing the world‑space
   * bounding boxes of a set of meshes, with optional padding.
   *
   * @param renderer - your WebGLRenderer
   * @param camera   - the camera used for projection
   * @param meshes   - array of THREE.Mesh
   * @param padding  - pixels to pad the rectangle outward (default 0)
   * @returns a ScissorRect suitable for renderer.setScissor(...)
   */
  export function computeScissorForMeshes(
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera,
    meshes: THREE.Mesh[],
    padding: number = 0
  ): ScissorRect {
    const size = renderer.getSize(new THREE.Vector2());
    const width  = size.x;
    const height = size.y;
  
    // temp vector to avoid allocations
    const tmpV = new THREE.Vector3();
  
    let minX =  Infinity;
    let minY =  Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
  
    // for each mesh, project its bounding‑box corners into screen space
    meshes.forEach(mesh => {
      const geom = mesh.geometry as THREE.BufferGeometry;
      // ensure bounding box is computed
      if (!geom.boundingBox) geom.computeBoundingBox();
      const bb = geom.boundingBox!;
  
      // loop the 8 corners
      for (const x of [bb.min.x, bb.max.x]) {
        for (const y of [bb.min.y, bb.max.y]) {
          for (const z of [bb.min.z, bb.max.z]) {
            tmpV.set(x, y, z)
                .applyMatrix4(mesh.matrixWorld)   // world → view
                .project(camera);                 // view → NDC
  
            // NDC [-1,+1] → screen [0,width] & [0,height]
            const px = (tmpV.x * 0.5 + 0.5) * width;
            const py = (tmpV.y * 0.5 + 0.5) * height;
  
            minX = Math.min(minX, px);
            minY = Math.min(minY, py);
            maxX = Math.max(maxX, px);
            maxY = Math.max(maxY, py);
          }
        }
      }
    });
  
    // apply padding
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
  
    // clamp to screen bounds
    const x      = Math.max(0, Math.floor(minX));
    const y      = Math.max(0, Math.floor(minY));
    const w      = Math.min(width  - x, Math.ceil(maxX) - x);
    const h      = Math.min(height - y, Math.ceil(maxY) - y);
  
    return { x, y, width: w, height: h };
  }