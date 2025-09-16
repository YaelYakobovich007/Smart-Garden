import React from 'react';
import { PlantsPanel } from './PlantsPanel';

export function Dashboard(props: { gardenName: string | null; plantsCount: number; plants: Array<{ plantId: number; moisture: number; temperature: number; valveOpen: boolean; isBlocked: boolean }>; activity: Array<{ ts: string; text: string }> }): JSX.Element {
    return (
        <>
            <div className="section panel" style={{ marginTop: 0 }}>
                <div className="sectionTitle">Dashboard</div>
                <div className="statusRow">
                    <span className="label">Garden</span>
                    <span className="pill">{props.gardenName || '—'}</span>
                </div>
                <div className="statusRow">
                    <span className="label">Plants</span>
                    <span className="pill">{props.plantsCount}</span>
                </div>
            </div>

            <PlantsPanel plants={props.plants} />

            <div className="section panel">
                <div className="sectionTitle">Activity</div>
                {props.activity.length === 0 ? (
                    <div className="row" style={{ borderBottom: 'none' }}>
                        <div className="pill">No activity yet</div>
                    </div>
                ) : (
                    props.activity.slice(0, 12).map((e, idx) => (
                        <div key={idx} className="statusRow">
                            <span className="label">{e.ts}</span>
                            <span className="pill" style={{ maxWidth: 560, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.text}</span>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}


