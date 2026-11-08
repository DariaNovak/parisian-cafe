/**
 * Wind sway for instanced foliage (flowers, leaves, ivy).
 *
 * Implemented as a GLSL patch injected into MeshStandardMaterial via
 * onBeforeCompile, so plants keep full PBR lighting and shadows while the vertex
 * shader bends them. Displacement grows quadratically with height above the
 * planter (`uBaseY`), so roots stay put and tips move the most. A click "pulse"
 * adds a damped springy bounce that ripples outward from the click point.
 */
import { Color, MeshStandardMaterial, Vector3, type IUniform } from 'three'

/** One shared clock uniform for every foliage material (updated once per frame). */
export const foliageTime: IUniform<number> = { value: 0 }

export interface FoliageUniforms {
  uBaseY: IUniform<number>
  uAmplitude: IUniform<number>
  uPulse: IUniform<number>
  uPulseOrigin: IUniform<Vector3>
}

export type FoliageMaterial = MeshStandardMaterial & { userData: { foliage: FoliageUniforms } }

export function createFoliageMaterial(opts: { color?: string; roughness?: number; baseY: number; amplitude?: number; side?: 0 | 1 | 2; emissive?: string }): FoliageMaterial {
  const mat = new MeshStandardMaterial({ color: opts.color ?? '#ffffff', roughness: opts.roughness ?? 0.65, side: opts.side ?? 0 })
  if (opts.emissive) {
    mat.emissive = new Color(opts.emissive)
    mat.emissiveIntensity = 0.06
  }
  const uniforms: FoliageUniforms = {
    uBaseY: { value: opts.baseY },
    uAmplitude: { value: opts.amplitude ?? 0.05 },
    uPulse: { value: 0 },
    uPulseOrigin: { value: new Vector3() },
  }
  mat.userData.foliage = uniforms
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = foliageTime
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform float uTime;
        uniform float uBaseY;
        uniform float uAmplitude;
        uniform float uPulse;
        uniform vec3 uPulseOrigin;`,
      )
      .replace(
        '#include <project_vertex>',
        /* glsl */ `
        // --- wind sway -------------------------------------------------
        vec4 swayWorld = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          swayWorld = instanceMatrix * swayWorld;
        #endif
        swayWorld = modelMatrix * swayWorld;
        // Height above the planter, normalised to ~30 cm, squared so tips bend most.
        float h = clamp((swayWorld.y - uBaseY) / 0.3, 0.0, 1.6);
        float bend = h * h;
        // Phase varies across space so neighbouring stems don't move in lockstep.
        float phase = swayWorld.x * 1.7 + swayWorld.z * 2.3;
        vec3 sway = vec3(
          sin(uTime * 1.6 + phase) + 0.35 * sin(uTime * 3.7 + phase * 2.1),
          0.0,
          cos(uTime * 1.2 + phase * 0.8) * 0.6
        ) * uAmplitude * bend;
        // Click pulse: a ring travelling outward from the click point, decaying over time.
        float d = distance(swayWorld.xz, uPulseOrigin.xz);
        float wave = sin(d * 18.0 - uTime * 14.0) * exp(-d * 2.5);
        sway.y += wave * uPulse * 0.035 * bend;
        sway.xz += normalize(swayWorld.xz - uPulseOrigin.xz + 1e-4) * wave * uPulse * 0.03 * bend;
        // Apply the world-space offset in object space (models here are unrotated/unscaled).
        transformed += sway;
        #include <project_vertex>`,
      )
  }
  // Distinct program cache key so the patched shader is not shared with plain materials.
  mat.customProgramCacheKey = () => 'foliage-sway-v1'
  return mat as FoliageMaterial
}
