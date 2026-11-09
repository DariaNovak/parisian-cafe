import { useGLTF } from '@react-three/drei'
import { Component, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { InstancedMesh, Matrix4, Mesh, Object3D, Quaternion, Vector3, type AnimationClip, type Euler } from 'three'
import { MODEL_BUILDERS, type ModelKey } from './builders/models'

export const modelUrl = (key: ModelKey) => `${import.meta.env.BASE_URL}models/${key}.glb`

type RenderFn = (root: Object3D, animations: AnimationClip[]) => ReactNode

class ModelErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode; model: string }, { failed: boolean }> {
  override state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override componentDidCatch(error: unknown) {
    console.warn(`[models] "${this.props.model}" GLB failed to load, using procedural fallback.`, error)
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/** Mark every mesh in a loaded model to cast/receive shadows (glTF has no shadow flags). */
function prepare(root: Object3D, castShadow: boolean) {
  root.traverse((o) => {
    if ((o as Mesh).isMesh) {
      o.castShadow = castShadow
      o.receiveShadow = true
    }
  })
  return root
}

function LoadedModel({ model, castShadow, children }: { model: ModelKey; castShadow: boolean; children: RenderFn }) {
  const gltf = useGLTF(modelUrl(model), false)
  const root = useMemo(() => prepare(gltf.scene, castShadow), [gltf.scene, castShadow])
  return <>{children(root, gltf.animations)}</>
}

function FallbackModel({ model, castShadow, children }: { model: ModelKey; castShadow: boolean; children: RenderFn }) {
  const root = useMemo(() => prepare(MODEL_BUILDERS[model](), castShadow), [model, castShadow])
  return <>{children(root, root.animations)}</>
}

/**
 * Loads `public/models/<model>.glb` (suspends while loading). If the file is missing or
 * corrupt, the identical procedural builder is used instead, so the café always renders.
 */
export function ModelSource({ model, castShadow = true, children }: { model: ModelKey; castShadow?: boolean; children: RenderFn }) {
  return (
    <ModelErrorBoundary model={model} fallback={<FallbackModel model={model} castShadow={castShadow} children={children} />}>
      <LoadedModel model={model} castShadow={castShadow} children={children} />
    </ModelErrorBoundary>
  )
}

export interface InstanceTransform {
  position: [number, number, number]
  rotationY?: number
  scale?: number
}

const _m = new Matrix4()
const _q = new Quaternion()
const _p = new Vector3()
const _s = new Vector3()
const _up = new Vector3(0, 1, 0)

/**
 * Renders every placement of a model with one InstancedMesh per sub-mesh.
 * Fourteen chairs therefore cost two draw calls instead of twenty-eight.
 */
function InstancedFromRoot({ root, transforms, castShadow }: { root: Object3D; transforms: InstanceTransform[]; castShadow: boolean }) {
  const parts = useMemo(() => {
    root.updateMatrixWorld(true)
    const list: Array<{ mesh: Mesh; local: Matrix4 }> = []
    const inv = new Matrix4().copy(root.matrixWorld).invert()
    root.traverse((o) => {
      if ((o as Mesh).isMesh) list.push({ mesh: o as Mesh, local: new Matrix4().multiplyMatrices(inv, o.matrixWorld) })
    })
    return list
  }, [root])

  return (
    <group>
      {parts.map(({ mesh, local }) => (
        <InstancedPart key={mesh.uuid} mesh={mesh} local={local} transforms={transforms} castShadow={castShadow} />
      ))}
    </group>
  )
}

function InstancedPart({ mesh, local, transforms, castShadow }: { mesh: Mesh; local: Matrix4; transforms: InstanceTransform[]; castShadow: boolean }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const im = ref.current
    if (!im) return
    transforms.forEach((t, i) => {
      _p.set(...t.position)
      _q.setFromAxisAngle(_up, t.rotationY ?? 0)
      _s.setScalar(t.scale ?? 1)
      _m.compose(_p, _q, _s).multiply(local)
      im.setMatrixAt(i, _m)
    })
    im.instanceMatrix.needsUpdate = true
    im.computeBoundingSphere()
  }, [transforms, local])
  return <instancedMesh ref={ref} args={[mesh.geometry, mesh.material, transforms.length]} castShadow={castShadow} receiveShadow />
}

export function InstancedModel({ model, transforms, castShadow = true }: { model: ModelKey; transforms: InstanceTransform[]; castShadow?: boolean }) {
  return <ModelSource model={model} castShadow={castShadow}>{(root) => <InstancedFromRoot root={root} transforms={transforms} castShadow={castShadow} />}</ModelSource>
}

/** A single placed copy of a model (cloned, so the same GLB can be used many times). */
export function ModelInstance({ model, position, rotation, scale = 1, castShadow = true }: { model: ModelKey; position?: [number, number, number]; rotation?: Euler | [number, number, number]; scale?: number; castShadow?: boolean }) {
  return (
    <ModelSource model={model} castShadow={castShadow}>
      {(root) => <ClonedModel root={root} position={position} rotation={rotation} scale={scale} />}
    </ModelSource>
  )
}

function ClonedModel({ root, ...props }: { root: Object3D; position?: [number, number, number]; rotation?: Euler | [number, number, number]; scale?: number }) {
  const clone = useMemo(() => root.clone(), [root])
  return <primitive object={clone} {...props} />
}

/** Preload all GLBs as soon as the module is imported. */
export function preloadModels() {
  for (const key of Object.keys(MODEL_BUILDERS) as ModelKey[]) useGLTF.preload(modelUrl(key), false)
}
