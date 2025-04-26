import * as THREE from 'three'

export type ScissorRect = {
    x: number;
    y: number;
    width: number;
    height: number;
}
  
export function computeScissorForMeshes(
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
  meshes: THREE.Mesh[],
  padding: number
): ScissorRect {
  const tmp = new THREE.Vector3();
  const size = renderer.getSize(new THREE.Vector2());
  const width  = size.x;
  const height = size.y;

  let minX =  Infinity;
  let minY =  Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  // for each mesh, project its bounding‑box corners into screen space
  meshes.forEach(mesh => {
    const geom = mesh.geometry as THREE.BufferGeometry;
    if (!geom.boundingBox) {
        geom.computeBoundingBox(); 
    }
    const bb = geom.boundingBox!;

    // loop the 8 corners
    for (const x of [bb.min.x, bb.max.x]) {
      for (const y of [bb.min.y, bb.max.y]) {
        for (const z of [bb.min.z, bb.max.z]) {
          tmp.set(x, y, z)
              .applyMatrix4(mesh.matrixWorld)   // world → view
              .project(camera);                 // view → NDC

          // NDC [-1,+1] → screen [0,width] & [0,height]
          const px = (tmp.x * 0.5 + 0.5) * width;
          const py = (tmp.y * 0.5 + 0.5) * height;

          minX = Math.min(minX, px);
          minY = Math.min(minY, py);
          maxX = Math.max(maxX, px);
          maxY = Math.max(maxY, py);
        }
      }
    }
  });

  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  // clamp to screen bounds
  const x = Math.max(0, Math.floor(minX));
  const y = Math.max(0, Math.floor(minY));
  const w = Math.min(width  - x, Math.ceil(maxX) - x);
  const h = Math.min(height - y, Math.ceil(maxY) - y);

  return { x, y, width: w, height: h };
}