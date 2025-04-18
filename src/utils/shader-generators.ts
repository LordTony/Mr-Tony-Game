import * as THREE from "three";

const AddZOffsetToVertexShader = (uOffsetZ: { value: number }) => {
    return (shader: THREE.WebGLProgramParametersWithUniforms) => {
        //console.log(shader.vertexShader);
        shader.uniforms.uOffsetZ = uOffsetZ;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>\nuniform float uOffsetZ;`
        );
        shader.vertexShader = shader.vertexShader.replace(
            '#include <project_vertex>',
            `vec4 mvPosition = vec4(transformed, 1.0);
            #ifdef USE_BATCHING
                mvPosition = batchingMatrix * mvPosition;
            #endif
            #ifdef USE_INSTANCING
                mvPosition = instanceMatrix * mvPosition;
            #endif
            mvPosition = modelViewMatrix * mvPosition;
            mvPosition.z += uOffsetZ;
            gl_Position = projectionMatrix * mvPosition;`);
        };
};

export const GenerateDepthMaterialWithZOffset = (uOffsetZ: { value: number }) => {  
  const depthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    blending: THREE.NoBlending,
  });
  depthMaterial.onBeforeCompile = AddZOffsetToVertexShader(uOffsetZ)
  return depthMaterial;
}

export const GenerateDistanceMaterialWithZOffset = (uOffsetZ: { value: number }) => {  
    const distanceMaterial = new THREE.MeshDistanceMaterial({
      blending: THREE.NoBlending,
    });
    distanceMaterial.onBeforeCompile = AddZOffsetToVertexShader(uOffsetZ)
    return distanceMaterial;
  }

export const AddZOffsetToExistingMaterial = (material: THREE.Material, uOffsetZ: { value: number }) => {
    material.onBeforeCompile = AddZOffsetToVertexShader(uOffsetZ)
}