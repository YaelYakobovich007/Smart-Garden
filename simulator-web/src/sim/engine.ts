import type { EngineState, PlantId, PlantState } from './types';

export class SimulatorEngine {
    private state: EngineState;

    constructor() {
        this.state = {
            plants: new Map<PlantId, PlantState>(),
            lastUpdateMs: performance.now(),
            evapRatePerSec: 0.02,
            flowRatePerSec: 0.25,
            noiseStdDev: 0.4
        };
    }

    ensurePlant(plantId: PlantId): PlantState {
        let p = this.state.plants.get(plantId);
        if (!p) {
            p = { plantId, moisture: 45, temperature: 23, valveOpen: false, isBlocked: false };
            this.state.plants.set(plantId, p);
        }
        return p;
    }

    setFromGardenSync(plantIds: number[]) {
        // Ensure present
        plantIds.forEach(id => this.ensurePlant(id));
        // Remove absent
        const present = new Set<number>(plantIds.map(Number));
        for (const id of Array.from(this.state.plants.keys())) {
            if (!present.has(id)) this.state.plants.delete(id);
        }
    }

    openValve(plantId: PlantId) {
        const p = this.ensurePlant(plantId);
        if (!p.isBlocked) p.valveOpen = true;
    }

    closeValve(plantId: PlantId) {
        const p = this.ensurePlant(plantId);
        p.valveOpen = false;
    }

    blockValve(plantId: PlantId, blocked: boolean) {
        const p = this.ensurePlant(plantId);
        p.isBlocked = blocked;
        if (blocked) p.valveOpen = false;
    }

    getPlant(plantId: PlantId): PlantState {
        return this.ensurePlant(plantId);
    }

    getAll(): PlantState[] { return Array.from(this.state.plants.values()); }

    removePlant(plantId: PlantId) {
        this.state.plants.delete(plantId);
    }

    // Basic physics tick
    tick() {
        const now = performance.now();
        const dtSec = Math.max(0, (now - this.state.lastUpdateMs) / 1000);
        this.state.lastUpdateMs = now;

        for (const plant of this.state.plants.values()) {
            const rate = plant.valveOpen ? this.state.flowRatePerSec : -this.state.evapRatePerSec;
            plant.moisture = clamp(plant.moisture + rate * dtSec, 0, 100);
            // small temp wobble
            plant.temperature = clamp(plant.temperature + (Math.random() - 0.5) * 0.05, 10, 40);
        }
    }

    readMoisture(plantId: PlantId): { moisture: number; temperature: number } {
        const p = this.ensurePlant(plantId);
        const noise = gaussian(0, this.state.noiseStdDev);
        const m = clamp(p.moisture + noise, 0, 100);
        return { moisture: round1(m), temperature: round1(p.temperature) };
    }
}

function gaussian(mu: number, sigma: number): number {
    // Box-Muller
    let u = 1 - Math.random();
    let v = 1 - Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mu + z * sigma;
}

function clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)); }
function round1(n: number) { return Math.round(n * 10) / 10; }


