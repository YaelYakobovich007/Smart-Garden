export type SocketType = 'HELLO_PI' | 'WELCOME' | 'PI_CONNECT' | 'GARDEN_SYNC'
    | 'ADD_PLANT' | 'ADD_PLANT_RESPONSE'
    | 'UPDATE_PLANT' | 'UPDATE_PLANT_RESPONSE'
    | 'REMOVE_PLANT' | 'REMOVE_PLANT_RESPONSE'
    | 'GET_PLANT_MOISTURE' | 'PLANT_MOISTURE_RESPONSE'
    | 'GET_ALL_MOISTURE' | 'ALL_MOISTURE_RESPONSE'
    | 'IRRIGATE_PLANT' | 'IRRIGATE_PLANT_ACCEPTED' | 'IRRIGATE_PLANT_RESPONSE' | 'IRRIGATION_STARTED'
    | 'IRRIGATION_DECISION' | 'IRRIGATION_PROGRESS'
    | 'STOP_IRRIGATION' | 'STOP_IRRIGATION_RESPONSE'
    | 'OPEN_VALVE' | 'OPEN_VALVE_RESPONSE'
    | 'CLOSE_VALVE' | 'CLOSE_VALVE_RESPONSE'
    | 'GET_VALVE_STATUS' | 'VALVE_STATUS_RESPONSE'
    | 'RESTART_VALVE' | 'RESTART_VALVE_RESPONSE'
    | 'CHECK_SENSOR_CONNECTION' | 'CHECK_SENSOR_CONNECTION_RESPONSE'
    | 'CHECK_VALVE_MECHANISM' | 'CHECK_VALVE_MECHANISM_RESPONSE'
    | 'CHECK_POWER_SUPPLY' | 'CHECK_POWER_SUPPLY_RESPONSE'
    | 'UPDATE_SCHEDULE'
    | 'PI_LOG';

export type OutgoingMessage = { type: SocketType; device_id?: string; data?: unknown };

export interface WelcomeMessage { type: 'WELCOME'; data?: { message?: string } }

export interface GardenSyncMessage {
    type: 'GARDEN_SYNC';
    data?: {
        garden?: { name?: string; invite_code?: string };
        plants?: Array<{
            plant_id: number;
            desiredMoisture?: number;
            waterLimit?: number;
            dripperType?: string;
            sensor_port?: string | number | null;
            valve_id?: number | null;
            lat?: number;
            lon?: number;
            scheduleData?: { irrigation_days?: string[] | null; irrigation_time?: string | null };
        }>;
    }
}

export type IncomingMessage = WelcomeMessage | GardenSyncMessage | { type: SocketType; data?: any };


