import React from 'react';
import { PlantSvg } from './PlantSvg';

type PlantView = { plantId: number; moisture: number; temperature: number; valveOpen: boolean; isBlocked: boolean };

export function PlantCard({ p }: { p: PlantView }): JSX.Element {
    return (
        <div className="plantCard">
            <div className="plantHeader">
                <div className="label">Plant {p.plantId}</div>
                <div className={`chip ${p.isBlocked ? 'blocked' : p.valveOpen ? 'open' : 'closed'}`}>
                    {p.isBlocked ? 'Blocked' : (p.valveOpen ? 'Irrigating' : 'Idle')}
                </div>
            </div>

            <div className="plantCanvas">
                <PlantSvg irrigating={p.valveOpen} blocked={p.isBlocked} />
            </div>

            <div className="plantInfo">
                <span className="pill" title="Moisture">Moisture: {p.moisture}%</span>
                <span className="pill" title="Temp">Temp: {p.temperature}°C</span>
            </div>
            <div className="plantInfo" style={{ marginTop: 6 }}>
                <span className="pill" title="Valve">
                    Valve: {p.isBlocked ? 'Blocked' : (p.valveOpen ? 'Open' : 'Closed')}
                </span>
            </div>
        </div>
    );
}


