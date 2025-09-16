import React from 'react';
import { PlantCard } from './PlantCard';

export function PlantsPanel(props: { plants: Array<{ plantId: number; moisture: number; temperature: number; valveOpen: boolean; isBlocked: boolean }> }): JSX.Element {
    return (
        <div className="section panel">
            <div className="sectionTitle">Plants</div>
            {/* Cards layout for plants */}
            {props.plants.length === 0 && (
                <div className="row" style={{ borderBottom: 'none' }}>
                    <div className="pill">No plants yet</div>
                </div>
            )}
            <div className="plantsGrid">
                {props.plants.map((p) => (
                    <PlantCard key={p.plantId} p={p} />
                ))}
            </div>
        </div>
    );
}


