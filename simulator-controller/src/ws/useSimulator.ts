import { useCallback, useEffect, useRef, useState } from 'react';
import type { IncomingMessage, OutgoingMessage, GardenSyncMessage } from './types';
import { SimulatorEngine } from '../sim/engine';

type SimulatorStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// types are defined in types.ts

function getWsUrl(): string {
    // Use env if provided, else default to localhost server
    const url = (window as any).__SIM_BACKEND_URL__ as string | undefined;
    if (url) return url;
    // Backend `app backend/app.js` listens on ws://host:8080
    return `ws://${location.hostname}:8080`;
}

export function useSimulator() {
    const wsRef = useRef<WebSocket | null>(null);
    const [status, setStatus] = useState<SimulatorStatus>('disconnected');
    const [lastType, setLastType] = useState<string | null>(null);
    const [gardenName, setGardenName] = useState<string | null>(null);
    const [plantsCount, setPlantsCount] = useState<number>(0);
    const [synced, setSynced] = useState<boolean>(false);
    const [familyCode, setFamilyCode] = useState<string>('');
    const [notice, setNotice] = useState<{ kind: 'info' | 'success' | 'warning' | 'error'; text: string } | null>(null);
    const engineRef = useRef<SimulatorEngine | null>(null);
    const [plantsSnapshot, setPlantsSnapshot] = useState<Array<{ plantId: number; moisture: number; temperature: number; valveOpen: boolean; isBlocked: boolean }>>([]);
    const [activity, setActivity] = useState<Array<{ ts: string; text: string }>>([]);
    const schedulesRef = useRef<Map<number, Array<{ day: string; time: string }>>>(new Map());
    const lastScheduleRunRef = useRef<Map<number, number>>(new Map());
    const irrigationTimersRef = useRef<Map<number, number>>(new Map());

    const showNotice = useCallback((kind: 'info' | 'success' | 'warning' | 'error', text: string) => {
        setNotice({ kind, text });
        window.clearTimeout((showNotice as any)._t);
        (showNotice as any)._t = window.setTimeout(() => setNotice(null), 3500);
    }, []);

    const send = useCallback((msg: OutgoingMessage) => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(msg));
        }
    }, []);

    const sendLog = useCallback((text: string) => {
        try {
            send({ type: 'PI_LOG', data: { message: `[SIM] ${text}`, timestamp: new Date().toISOString() } });
        } catch { /* noop */ }
        // Also log to browser console for local visibility
        // eslint-disable-next-line no-console
        console.log(`[SIM] ${text}`);
        setActivity((prev) => {
            const next = [{ ts: new Date().toLocaleTimeString(), text }, ...prev];
            return next.slice(0, 100);
        });
    }, [send]);

    const connect = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
        setStatus('connecting');
        const ws = new WebSocket(getWsUrl());
        wsRef.current = ws;
        if (!engineRef.current) engineRef.current = new SimulatorEngine();

        ws.onopen = () => {
            setStatus('connected');
            // Initial identify, then optional PI_CONNECT (family code can be entered later via UI)
            send({ type: 'HELLO_PI', device_id: 'raspberrypi_main_controller' });
            // No heartbeat (per requirements)
            sendLog('WebSocket connected and HELLO_PI sent');
        };

        ws.onmessage = (evt) => {
            try {
                const message: IncomingMessage = JSON.parse(evt.data);
                setLastType(message.type);
                if (message.type === 'GARDEN_SYNC') {
                    // Backend sendSuccess merges payload into top-level (no data wrapper).
                    // Support both shapes: {type, garden, plants} and {type, data:{garden, plants}}
                    const top: any = message as any;
                    const payload: any = top?.data ?? top;
                    const g = payload?.garden;
                    const p = payload?.plants || [];
                    setGardenName((g && g.name) || null);
                    setPlantsCount(Array.isArray(p) ? p.length : 0);
                    try { engineRef.current?.setFromGardenSync((p || []).map((x: any) => Number(x.plant_id))); } catch { }
                    // load schedules
                    try {
                        schedulesRef.current.clear();
                        (p || []).forEach((x: any) => {
                            const sd = x?.scheduleData;
                            const days: string[] = Array.isArray(sd?.irrigation_days) ? sd.irrigation_days : [];
                            const timeStr: string | undefined = sd?.irrigation_time || undefined;
                            if (days && timeStr) {
                                const entries = days.map((d: string) => ({ day: String(d).toLowerCase(), time: String(timeStr) }));
                                schedulesRef.current.set(Number(x.plant_id), entries);
                            }
                        });
                    } catch { }
                    showNotice('success', 'Garden synced successfully');
                    setSynced(true);
                    sendLog(`Garden sync received: name=${(g && g.name) || 'Unknown'} plants=${Array.isArray(p) ? p.length : 0}`);
                }
                if (message.type === 'GET_PLANT_MOISTURE') {
                    const plantId = Number((message as any).data?.plant_id);
                    const r = engineRef.current?.readMoisture(plantId);
                    if (r) send({ type: 'PLANT_MOISTURE_RESPONSE', data: { plant_id: plantId, status: 'success', moisture: r.moisture, temperature: r.temperature } });
                }
                if (message.type === 'GET_ALL_MOISTURE') {
                    const all = (engineRef.current?.getAll() || []).map(p => {
                        const r = engineRef.current?.readMoisture(p.plantId)!;
                        return { plant_id: p.plantId, moisture: r.moisture, temperature: r.temperature };
                    });
                    send({ type: 'ALL_MOISTURE_RESPONSE', data: { status: 'success', plants: all } });
                }
                if (message.type === 'OPEN_VALVE') {
                    const plantId = Number((message as any).data?.plant_id);
                    const minutes = Number((message as any).data?.time_minutes ?? 0);
                    engineRef.current?.openValve(plantId);
                    // Emit IRRIGATION_STARTED for manual mode
                    send({ type: 'IRRIGATION_STARTED', data: { plant_id: plantId, mode: 'manual' } });
                    send({ type: 'OPEN_VALVE_RESPONSE', data: { plant_id: plantId, status: 'success', time_minutes: minutes } });
                    if (minutes > 0) {
                        const ms = Math.max(0, minutes * 60 * 1000);
                        const timer = window.setTimeout(() => {
                            engineRef.current?.closeValve(plantId);
                            sendLog(`Manual valve auto-close after ${minutes}m for plant ${plantId}`);
                        }, ms);
                        // store in map to cancel if needed
                        const key = -100000 - plantId;
                        irrigationTimersRef.current.set(key, timer as unknown as number);
                    }
                }
                if (message.type === 'CLOSE_VALVE') {
                    const plantId = Number((message as any).data?.plant_id);
                    engineRef.current?.closeValve(plantId);
                    send({ type: 'CLOSE_VALVE_RESPONSE', data: { plant_id: plantId, status: 'success' } });
                }
                if (message.type === 'GET_VALVE_STATUS') {
                    const plantId = Number((message as any).data?.plant_id);
                    const p = engineRef.current?.getPlant(plantId);
                    send({ type: 'VALVE_STATUS_RESPONSE', data: { plant_id: plantId, valve_id: plantId, is_blocked: !!p?.isBlocked, is_open: !!p?.valveOpen, can_irrigate: !p?.isBlocked, status: p?.valveOpen ? 'open' : 'closed', user_message: p?.isBlocked ? 'Valve blocked' : (p?.valveOpen ? 'Valve open' : 'Valve closed') } });
                }
                if (message.type === 'ADD_PLANT') {
                    const d = (message as any).data || {};
                    const plantId = Number(d.plant_id);
                    engineRef.current?.ensurePlant(plantId);
                    // Assignments: simple mapping by plantId for demo
                    const sensor_port = String(plantId);
                    const assigned_valve = plantId;
                    send({ type: 'ADD_PLANT_RESPONSE', data: { plant_id: plantId, status: 'success', sensor_port, assigned_valve } });
                    setPlantsCount((n) => Math.max(0, (n ?? 0)) + 1);
                    sendLog(`ADD_PLANT handled for plant_id=${plantId}, assigned valve=${assigned_valve}, sensor_port=${sensor_port}`);
                }
                if (message.type === 'UPDATE_PLANT') {
                    const d = (message as any).data || {};
                    const plantId = Number(d.plant_id);
                    engineRef.current?.ensurePlant(plantId);
                    send({ type: 'UPDATE_PLANT_RESPONSE', data: { plant_id: plantId, success: true, message: 'updated' } });
                    sendLog(`UPDATE_PLANT handled for plant_id=${plantId}`);
                }
                if (message.type === 'UPDATE_SCHEDULE') {
                    const d = (message as any).data || {};
                    const plantId = Number(d.plant_id);
                    const sd = d?.scheduleData || {};
                    const days: string[] = Array.isArray(sd?.irrigation_days) ? sd.irrigation_days : [];
                    const timeStr: string | undefined = sd?.irrigation_time || undefined;
                    if (days && timeStr) {
                        const entries = days.map((x: string) => ({ day: String(x).toLowerCase(), time: String(timeStr) }));
                        schedulesRef.current.set(plantId, entries);
                    } else {
                        schedulesRef.current.delete(plantId);
                    }
                    // No response expected from Pi in real flow; just log
                    sendLog(`UPDATE_SCHEDULE stored for plant_id=${plantId}`);
                }
                if (message.type === 'REMOVE_PLANT') {
                    const d = (message as any).data || {};
                    const plantId = Number(d.plant_id);
                    // best-effort: clear engine state
                    try {
                        // close interval if any
                        const t = irrigationTimersRef.current.get(plantId);
                        if (t) { clearInterval(t); irrigationTimersRef.current.delete(plantId); }
                        engineRef.current?.removePlant(plantId);
                    } catch { }
                    send({ type: 'REMOVE_PLANT_RESPONSE', data: { plant_id: plantId, status: 'success' } });
                    setPlantsCount((n) => Math.max(0, (n ?? 1) - 1));
                    sendLog(`REMOVE_PLANT handled for plant_id=${plantId}`);
                }
                if (message.type === 'IRRIGATE_PLANT') {
                    const d = (message as any).data || {};
                    const plantId = Number(d.plant_id);
                    const sessionId = d.session_id ?? null;
                    const startReading = engineRef.current?.readMoisture(plantId);
                    // Emit started event for smart mode
                    send({ type: 'IRRIGATION_STARTED', data: { plant_id: plantId, mode: 'smart', session_id: sessionId } });
                    send({ type: 'IRRIGATE_PLANT_ACCEPTED', data: { plant_id: plantId, session_id: sessionId } });
                    const current = startReading?.moisture ?? 40;
                    const target = current + 8;
                    // Simulate rain_expected skip 10% of the time
                    if (Math.random() < 0.1) {
                        send({ type: 'IRRIGATION_DECISION', data: { plant_id: plantId, current_moisture: current, target_moisture: target, moisture_gap: target - current, will_irrigate: false, reason: 'rain_expected', session_id: sessionId } });
                        return;
                    }
                    // If already moist enough, skip
                    if (current >= target) {
                        send({ type: 'IRRIGATION_DECISION', data: { plant_id: plantId, current_moisture: current, target_moisture: target, moisture_gap: 0, will_irrigate: false, reason: 'already_moist', session_id: sessionId } });
                        return;
                    }
                    send({ type: 'IRRIGATION_DECISION', data: { plant_id: plantId, current_moisture: current, target_moisture: target, moisture_gap: target - current, will_irrigate: true, reason: 'moisture_below_target', session_id: sessionId } });
                    engineRef.current?.openValve(plantId);
                    sendLog(`IRRIGATE_PLANT accepted: plant_id=${plantId}, session_id=${sessionId}`);
                    let elapsed = 0;
                    const interval = window.setInterval(() => {
                        elapsed += 1;
                        const r = engineRef.current?.readMoisture(plantId);
                        send({ type: 'IRRIGATION_PROGRESS', data: { plant_id: plantId, session_id: sessionId, stage: 'update', status: 'in_progress', current_moisture: r?.moisture ?? 0, target_moisture: target, moisture_gap: target - (r?.moisture ?? 0), total_water_used: elapsed * 0.02 } });
                        if (elapsed >= 6) {
                            clearInterval(interval);
                            irrigationTimersRef.current.delete(plantId);
                            engineRef.current?.closeValve(plantId);
                            const end = engineRef.current?.readMoisture(plantId);
                            // 10% chance: water limit reached without target
                            if (Math.random() < 0.1 && (end?.moisture ?? 0) < target) {
                                engineRef.current?.blockValve(plantId, true);
                                send({ type: 'IRRIGATE_PLANT_RESPONSE', data: { plant_id: plantId, status: 'error', error_message: 'water_limit_reached_target_not_met', moisture: current, final_moisture: end?.moisture ?? 0, water_added_liters: elapsed * 0.02 } });
                                sendLog(`IRRIGATION error: water limit without target; valve blocked for plant ${plantId}`);
                                return;
                            }
                            send({ type: 'IRRIGATE_PLANT_RESPONSE', data: { plant_id: plantId, status: 'success', moisture: startReading?.moisture ?? 0, final_moisture: end?.moisture ?? 0, water_added_liters: 0.12, irrigation_time: Date.now() } });
                            sendLog(`IRRIGATE_PLANT completed: plant_id=${plantId}`);
                        }
                    }, 1000);
                    irrigationTimersRef.current.set(plantId, interval);
                }
                if (message.type === 'STOP_IRRIGATION') {
                    const d = (message as any).data || {};
                    const plantId = Number(d.plant_id);
                    const t = irrigationTimersRef.current.get(plantId);
                    if (t) { clearInterval(t); irrigationTimersRef.current.delete(plantId); }
                    engineRef.current?.closeValve(plantId);
                    const r = engineRef.current?.readMoisture(plantId);
                    send({ type: 'STOP_IRRIGATION_RESPONSE', data: { plant_id: plantId, status: 'success', moisture: r?.moisture ?? 0, final_moisture: r?.moisture ?? 0, water_added_liters: 0 } });
                    sendLog(`STOP_IRRIGATION handled: plant_id=${plantId}`);
                }
                if (message.type === 'CHECK_SENSOR_CONNECTION') {
                    const d = (message as any).data || {};
                    const plantId = Number(d.plant_id);
                    const r = engineRef.current?.readMoisture(plantId);
                    send({ type: 'CHECK_SENSOR_CONNECTION_RESPONSE', data: { plant_id: plantId, status: 'success', moisture: r?.moisture ?? 0, temperature: r?.temperature ?? 0, sensor_port: String(plantId), is_connected: true, message: 'Sensor responded' } });
                    sendLog(`CHECK_SENSOR_CONNECTION handled: plant_id=${plantId}`);
                }
                if (message.type === 'CHECK_VALVE_MECHANISM') {
                    const d = (message as any).data || {};
                    const plantId = Number(d.plant_id);
                    // brief pulse
                    engineRef.current?.openValve(plantId);
                    const pulseSec = Number((d.pulse_seconds ?? 0.6));
                    setTimeout(() => engineRef.current?.closeValve(plantId), Math.max(0, pulseSec * 1000));
                    send({ type: 'CHECK_VALVE_MECHANISM_RESPONSE', data: { plant_id: plantId, status: 'success', valve_id: plantId, is_open: false, is_blocked: false, status_data: { pulse_seconds: pulseSec }, message: 'Valve pulse completed' } });
                    sendLog(`CHECK_VALVE_MECHANISM handled: plant_id=${plantId}`);
                }
                if (message.type === 'CHECK_POWER_SUPPLY') {
                    const d = (message as any).data || {};
                    const plantId = Number(d.plant_id ?? 0);
                    const ok = Math.random() > 0.05;
                    send({ type: 'CHECK_POWER_SUPPLY_RESPONSE', data: { plant_id: plantId, status: ok ? 'success' : 'error', ok, data: { source: 'sim', under_voltage_now: !ok }, message: ok ? 'Power supply OK' : 'Power supply issue detected' } });
                    sendLog(`CHECK_POWER_SUPPLY handled: ok=${ok}`);
                }
                if (message.type === 'RESTART_VALVE') {
                    const d = (message as any).data || {};
                    const plantId = Number(d.plant_id);
                    engineRef.current?.blockValve(plantId, false);
                    send({ type: 'RESTART_VALVE_RESPONSE', data: { plant_id: plantId, status: 'success' } });
                    sendLog(`RESTART_VALVE handled: plant_id=${plantId}`);
                }
            } catch (e) {
                // ignore malformed
            }
        };

        ws.onerror = () => {
            setStatus('error');
        };

        ws.onclose = () => {
            setStatus('disconnected');
            wsRef.current = null;
            setSynced(false);
            setGardenName(null);
            setPlantsCount(0);
        };
    }, [send]);

    const disconnect = useCallback(() => {
        const ws = wsRef.current;
        if (ws) {
            ws.close();
            wsRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []);

    const setFamily = useCallback((code: string) => setFamilyCode(code), []);
    const sendPiConnect = useCallback(() => {
        if (!familyCode) return;
        if (status !== 'connected') {
            showNotice('warning', 'Please connect to the server first');
            return;
        }
        send({ type: 'PI_CONNECT', data: { family_code: familyCode } });
    }, [familyCode, send, status, showNotice]);

    // Physics + snapshot loop + basic schedule runner
    useEffect(() => {
        let raf = 0;
        let lastSnap = 0;
        const step = (t?: number) => {
            engineRef.current?.tick();
            const now = performance.now();
            if (!lastSnap || now - lastSnap > 250) {
                const list = (engineRef.current?.getAll() || []).map((p) => ({
                    plantId: p.plantId,
                    moisture: Math.round(p.moisture * 10) / 10,
                    temperature: Math.round(p.temperature * 10) / 10,
                    valveOpen: p.valveOpen,
                    isBlocked: p.isBlocked
                }));
                setPlantsSnapshot(list);
                lastSnap = now;
            }
            // Simple schedule runner: check every ~second
            if (Math.floor(now / 1000) !== Math.floor((lastSnap - 260) / 1000)) {
                try {
                    const entries = schedulesRef.current;
                    const when = new Date();
                    const day = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][when.getDay()];
                    const hh = String(when.getHours()).padStart(2, '0');
                    const mm = String(when.getMinutes()).padStart(2, '0');
                    const current = `${hh}:${mm}`;
                    for (const [plantId, sch] of entries) {
                        const last = lastScheduleRunRef.current.get(plantId) || 0;
                        if (now - last < 55_000) continue; // avoid re-run within a minute
                        const hit = sch?.some(e => e.day?.slice(0, 3).toLowerCase() === day.slice(0, 3) && String(e.time).slice(0, 5) === current);
                        if (hit) {
                            // trigger smart irrigation session
                            send({ type: 'IRRIGATE_PLANT', data: { plant_id: plantId, session_id: `sch-${when.getTime()}` } });
                            lastScheduleRunRef.current.set(plantId, now);
                            sendLog(`Schedule triggered irrigation for plant ${plantId} at ${current}`);
                        }
                    }
                } catch { }
            }
            raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, []);

    return { status, lastType, connect, disconnect, send, familyCode, setFamily, sendPiConnect, gardenName, plantsCount, notice, synced, plantsSnapshot, activity };
}


