# Non-Blocking Valve Solution

## Problem

The original irrigation system had a critical issue where the entire controller would become unresponsive during valve operations. This was caused by:

1. **Blocking Sleep Operations**: The `SmartGardenEngine.open_valve()` method used `await asyncio.sleep(time_minutes * 60)` which blocked the entire async event loop
2. **Blocking Irrigation Algorithm**: The `IrrigationAlgorithm.perform_irrigation()` method used `time.sleep()` calls that blocked the entire system
3. **No Interruption Handling**: There was no way to cancel or interrupt ongoing valve operations

This meant that when a valve was opened for irrigation, the system could not respond to other requests like `CLOSE_VALVE` until the irrigation was complete.

## Solution

### 1. Non-Blocking Valve Operations

**File: `controller/engine/smart_garden_engine.py`**

The engine now uses a non-blocking approach with background tasks:

```python
async def open_valve(self, plant_id: int, time_minutes: int) -> bool:
    # Open the valve immediately
    plant.valve.request_open()

    # Create background task to close valve after duration
    close_task = asyncio.create_task(self._close_valve_after_duration(plant_id, time_minutes))
    self.valve_tasks[plant_id] = close_task

    return True

async def close_valve(self, plant_id: int) -> bool:
    # Cancel any running background task
    if plant_id in self.valve_tasks and not self.valve_tasks[plant_id].done():
        self.valve_tasks[plant_id].cancel()

    # Close the valve immediately
    plant.valve.request_close()
    return True
```

### 2. Valve State Tracking

The engine now tracks valve states and running tasks:

```python
# Valve state tracking for non-blocking operations
self.valve_tasks: Dict[int, asyncio.Task] = {}  # Track running valve tasks
self.valve_states: Dict[int, Dict] = {}  # Track valve states
self._lock = asyncio.Lock()  # Thread-safe operations
```

### 3. Non-Blocking Irrigation Algorithm

**File: `controller/irrigation/irrigation_algorithm.py`**

Replaced blocking `time.sleep()` calls with non-blocking `asyncio.sleep()`:

```python
# Before (blocking)
time.sleep(pulse_time)
time.sleep(self.pause_between_pulses)

# After (non-blocking)
await asyncio.sleep(pulse_time)
await asyncio.sleep(self.pause_between_pulses)
```

### 4. Updated Close Valve Handler

**File: `controller/handlers/close_valve_handler.py`**

The close valve handler now uses the new non-blocking approach:

```python
async def handle_close_valve_request(self, data: dict) -> CloseValveResponse:
    # Use the new non-blocking close_valve method
    success = await self.smart_engine.close_valve(plant_id)

    if success:
        return CloseValveResponse.success(plant_id, message)
    else:
        return CloseValveResponse.error(plant_id, error_message)
```

## Key Features

### 1. Immediate Response

- Valve operations return immediately instead of blocking
- System can respond to other requests while valves are open
- `CLOSE_VALVE` requests are processed instantly

### 2. Background Task Management

- Valve timing is handled by background `asyncio.Task` objects
- Tasks can be cancelled when `CLOSE_VALVE` is requested
- Proper cleanup of cancelled tasks

### 3. Thread Safety

- Uses `asyncio.Lock()` for thread-safe operations
- Prevents race conditions when multiple operations occur simultaneously

### 4. State Tracking

- Tracks valve states (`is_open`, `start_time`, `duration_minutes`)
- Provides methods to check valve status (`is_valve_open()`, `get_valve_state()`)

## Benefits

1. **Responsive System**: The controller can now respond to `CLOSE_VALVE` requests immediately, even while a valve is open
2. **No Blocking**: The entire system remains responsive during irrigation operations
3. **Cancellable Operations**: Valve operations can be cancelled mid-execution
4. **Better Error Handling**: Proper cleanup of resources when operations are cancelled
5. **Maintainable Code**: Clear separation between valve control and timing logic

## Testing

A test script (`test_non_blocking_valve.py`) demonstrates:

1. Opening a valve for a specified duration
2. Immediately closing the valve while it's open
3. Verifying that close operations complete instantly
4. Checking that background tasks are properly cancelled

## Usage

The system now works as follows:

1. **Open Valve**: `await engine.open_valve(plant_id, time_minutes)` - Returns immediately, valve closes automatically after duration
2. **Close Valve**: `await engine.close_valve(plant_id)` - Closes valve immediately, cancels any pending auto-close task
3. **Check Status**: `engine.is_valve_open(plant_id)` - Check if valve is currently open

This solution ensures that the Smart Garden controller remains fully responsive and can handle multiple concurrent operations without blocking the entire system.
