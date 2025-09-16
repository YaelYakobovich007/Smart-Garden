export type PlantId = number;

export interface PlantState {
    plantId: PlantId;
    moisture: number; // 0..100
    temperature: number; // C
    valveOpen: boolean;
    isBlocked: boolean;
}

export interface EngineState {
    plants: Map<PlantId, PlantState>;
    lastUpdateMs: number;
    evapRatePerSec: number; // %/sec when valve closed
    flowRatePerSec: number; // %/sec when valve open
    noiseStdDev: number; // reading noise
}


