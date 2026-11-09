import { Selection } from '@react-three/postprocessing'
import { useCafeStore } from '../../app/store/useCafeStore'
import { CafeBuilding } from '../../models/CafeBuilding'
import { CafeInterior } from '../../models/CafeInterior'
import { Counter } from '../../models/Counter'
import { CoffeeStation, StationGrinder } from '../../features/coffee/CoffeeStation'
import { Furniture } from '../../models/Furniture'
import { PhysicsWorld } from '../../physics/PhysicsWorld'
import { NeighborBuildings } from '../../models/NeighborBuildings'
import { PastryDisplay } from '../../models/PastryDisplay'
import { Plants } from '../../models/Plants'
import { Street } from '../../models/Street'
import { CameraController } from './CameraController'
import { Lighting } from './Lighting'
import { SceneEnvironment } from './SceneEnvironment'
import { DustMotes } from './effects/DustMotes'
import { FallingPetals } from './effects/FallingPetals'
import { PostFX } from './effects/PostFX'
import { Interactive } from './interactions/Interactive'
import { MergeStatic } from './MergeStatic'
import { preloadModels } from '../../models/ModelSource'

// Start fetching every GLB as soon as this chunk arrives.
preloadModels()

function CoffeeBar() {
  const openPanel = useCafeStore((s) => s.openPanel)
  const goToView = useCafeStore((s) => s.goToView)
  const open = () => {
    openPanel('coffee')
    goToView('coffee')
  }
  return (
    <Counter
      grinder={
        <Interactive label="Coffee grinder — make a coffee" onSelect={open}>
          <StationGrinder />
        </Interactive>
      }
      machine={
        <Interactive label="Espresso machine — make a coffee" onSelect={open}>
          <CoffeeStation />
        </Interactive>
      }
    />
  )
}

/** Scene composition only — every object is implemented in its own module. */
export function Scene() {
  return (
    <>
      <SceneEnvironment />
      <Lighting />
      <CameraController />
      <Selection>
        {/* Static architecture & props are batched into a few merged draw calls. */}
        <MergeStatic>
          <Street />
          <NeighborBuildings />
          <CafeBuilding />
          <CafeInterior />
          <CoffeeBar />
          <PastryDisplay />
          <Furniture />
          <Plants />
        </MergeStatic>
        <PhysicsWorld />
        <DustMotes />
        <FallingPetals />
        <PostFX />
      </Selection>
    </>
  )
}
