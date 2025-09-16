import React from 'react';
import { useSimulator } from '../ws/useSimulator';
import { Dashboard } from './Dashboard';
import './app.css';

export function App(): JSX.Element {
    const { status, lastType, connect, disconnect, familyCode, setFamily, sendPiConnect, gardenName, plantsCount, notice, synced, plantsSnapshot, activity } = useSimulator();

    const statusClass = `badge ${status}`;

    return (
        <div className="page">
            <div className="card">
                <div className="header">
                    <div className="logo">🌿</div>
                    <h1 className="title">Smart Garden Simulator <span className={`heartbeat ${status}`}></span></h1>
                </div>

                {notice ? (
                    <div className={`notice ${notice.kind}`}>{notice.text}</div>
                ) : null}

                {!synced && (
                    <div className="section panel">
                        <div className="sectionTitle">Server Connection</div>
                        <div className="statusRow">
                            <span className="label">Status</span>
                            <span className={statusClass}>{status}</span>
                        </div>
                        <div className="statusRow">
                            <span className="label">Last message</span>
                            <span className="pill">{lastType || '—'}</span>
                        </div>
                        <div className="actions">
                            <button className="btn primary" onClick={connect}>Connect</button>
                            <button className="btn" onClick={disconnect}>Disconnect</button>
                        </div>
                    </div>)}

                {!synced && (
                    <div className="section panel">
                        <div className="sectionTitle">Garden Sync</div>
                        <div className="row">
                            <label className="label" htmlFor="family">Family code</label>
                            <div className="inline">
                                <input id="family" className="input" placeholder="Enter family code" value={familyCode} onChange={(e) => setFamily(e.target.value)} />
                                <button className="btn" onClick={sendPiConnect} disabled={!familyCode}>PI_CONNECT</button>
                            </div>
                        </div>
                        {(gardenName || plantsCount) ? (
                            <div className="statusRow">
                                <span className="label">Garden</span>
                                <span className="pill">{gardenName || '—'} • {plantsCount} plants</span>
                            </div>
                        ) : null}
                    </div>)}

                {synced && (
                    <Dashboard gardenName={gardenName} plantsCount={plantsCount} plants={plantsSnapshot} activity={activity} />
                )}


            </div>
        </div>
    );
}


