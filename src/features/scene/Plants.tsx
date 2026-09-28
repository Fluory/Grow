'use client';

import type { World } from '@/features/garden';
import { gardensOf, groundAt, rowZ, sceneX } from './model';
import { PlantMesh } from './PlantMesh';
import { FallenLog, Mushroom, WaterLily } from './SimplePlants';
import { useDisplayedGarden } from './useDisplayed';
import { waterSurface } from './Water';

/** Every plant of the garden on the displayed day. Re-renders only when the day changes. */
export function Plants({ world }: { world: World }) {
  const { index, garden } = useDisplayedGarden(world);
  if (!garden) return null;
  const following = gardensOf(world)[index + 1];
  const fromDay = world.days[index]?.day ?? 0;
  const toDay = world.days[index + 1]?.day ?? fromDay;
  const date = garden.date;

  return (
    <group>
      {garden.plants.map((plant) => {
        const x = sceneX(plant.x);
        const z = rowZ(plant.row);
        if (plant.species === 'waterlily') {
          return (
            <group key={plant.id} position={[x, waterSurface(garden.nature.water, plant.x), z]}>
              <WaterLily plant={plant} date={date} />
            </group>
          );
        }
        const y = groundAt(plant.x);
        if (plant.status === 'fallen') {
          return (
            <group key={plant.id} position={[x, y, z]}>
              <FallenLog plant={plant} date={date} />
            </group>
          );
        }
        if (plant.species === 'mushroom') {
          return (
            <group key={plant.id} position={[x, y, z]}>
              <Mushroom plant={plant} date={date} />
            </group>
          );
        }
        const next = following?.plants.find((p) => p.id === plant.id)?.stage ?? plant.stage;
        return (
          <group key={plant.id} position={[x, y - 0.05, z]}>
            <PlantMesh plant={plant} nextStage={next} fromDay={fromDay} toDay={toDay} date={date} />
          </group>
        );
      })}
    </group>
  );
}
