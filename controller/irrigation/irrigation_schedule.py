import threading
from typing import List, Dict

DAY_NAME_MAP = {
    'sun': 'sunday', 'sunday': 'sunday',
    'mon': 'monday', 'monday': 'monday',
    'tue': 'tuesday', 'tues': 'tuesday', 'tuesday': 'tuesday',
    'wed': 'wednesday', 'weds': 'wednesday', 'wednesday': 'wednesday',
    'thu': 'thursday', 'thur': 'thursday', 'thurs': 'thursday', 'thursday': 'thursday',
    'fri': 'friday', 'friday': 'friday',
    'sat': 'saturday', 'saturday': 'saturday',
}

try:
    import schedule
except ImportError:
    print("The 'schedule' module is not installed. Install it using 'pip install schedule'.")
    raise
def _normalize_day_name(day: str) -> str:
    if not isinstance(day, str):
        return ''
    key = day.strip().lower()
    return DAY_NAME_MAP.get(key, '')

def _normalize_time_str(time_str: str) -> str:
    # Accept HH:MM or HH:MM:SS → convert to HH:MM
    if not isinstance(time_str, str):
        return ''
    parts = time_str.strip().split(':')
    if len(parts) >= 2:
        hh = parts[0].zfill(2)
        mm = parts[1].zfill(2)
        return f"{hh}:{mm}"
    return time_str


class IrrigationSchedule:
    """
    Handles time-based irrigation scheduling for a specific plant using the `schedule` module.
    Schedules are provided as a list of (day, time) entries, and trigger irrigation using
    the given irrigation algorithm.

    Attributes:
        plant (Plant): The plant instance associated with this schedule.
        schedule_data (List[Dict[str, str]]): List of scheduling entries in the format:
            [{"day": "monday", "time": "06:00"}, ...]
        irrigation_algorithm (IrrigationAlgorithm): Algorithm to run when scheduled time is reached.
    """

    def __init__(self, plant: "Plant", schedule_data: List[Dict[str, str]], irrigation_algorithm: "IrrigationAlgorithm", loop=None, engine=None) -> None:
        """
        Initializes the irrigation schedule.

        Args:
            plant (Plant): The plant instance this schedule controls.
            schedule_data (List[Dict[str, str]]): A list of schedule dicts with "day" and "time" keys.
            irrigation_algorithm (IrrigationAlgorithm): The irrigation logic to invoke on schedule.
        """
        from controller.models.plant import Plant

        from controller.irrigation.irrigation_algorithm import IrrigationAlgorithm
        self.plant: Plant = plant
        self.schedule_data: List[Dict[str, str]] = schedule_data
        self.irrigation_algorithm: IrrigationAlgorithm = irrigation_algorithm
        self.loop = loop
        self.engine = engine

        self.jobs = []
        if schedule_data:
            self.setup_schedules()

    def setup_schedules(self) -> None:
        """
        Registers all the scheduled jobs using the `schedule` library.
        Converts each (day, time) pair into a scheduled task.
        """
        # Cancel any existing jobs before re-registering
        self.clear_schedules()

        for schedule_item in self.schedule_data:
            day_raw = schedule_item.get("day")
            time_raw = schedule_item.get("time")

            day_full = _normalize_day_name(day_raw)
            time_str = _normalize_time_str(time_raw)

            if not day_full or not time_str:
                continue

            job_source = getattr(schedule.every(), day_full, None)
            if job_source:
                job = job_source.at(time_str).do(self.start_irrigation_thread)
                self.jobs.append(job)

    def start_irrigation_thread(self) -> None:
        """
        Launches the irrigation algorithm for the assigned plant in a separate thread.
        """
        try:
            import asyncio
            from uuid import uuid4
            if self.loop is not None and self.engine is not None:
                # Route scheduled start through the engine so it registers the task
                session_id = str(uuid4())
                try:
                    if getattr(self.irrigation_algorithm, 'websocket_client', None):
                        self.irrigation_algorithm.websocket_client.logger.info(
                            f"Sending IRRIGATION_STARTED for scheduled run: plant={self.plant.plant_id} session={session_id}")
                        asyncio.run_coroutine_threadsafe(
                            self.irrigation_algorithm.websocket_client.send_message(
                                "IRRIGATION_STARTED",
                                {"plant_id": self.plant.plant_id, "session_id": session_id, "mode": "scheduled"}
                            ),
                            self.loop
                        )
                except Exception as e:
                    print(f"Failed to send IRRIGATION_STARTED: {e}")

                try:
                    # Start via engine on the main event loop so the task registers correctly
                    self.loop.call_soon_threadsafe(self.engine.start_irrigation, self.plant.plant_id, session_id)
                except Exception as e:
                    print(f"ERROR starting scheduled irrigation via engine: {e}")
            else:
                # Fallback: run in a dedicated event loop (may limit WS logging)
                def _runner():
                    import asyncio as _asyncio
                    from uuid import uuid4 as _uuid4
                    sid = str(_uuid4())
                    # Best-effort IRRIGATION_STARTED
                    try:
                        if getattr(self.irrigation_algorithm, 'websocket_client', None):
                            _asyncio.run(self.irrigation_algorithm.websocket_client.send_message(
                                "IRRIGATION_STARTED", {"plant_id": self.plant.plant_id, "session_id": sid, "mode": "scheduled"}
                            ))
                    except Exception:
                        pass
                    result = _asyncio.run(self.irrigation_algorithm.irrigate(self.plant, session_id=sid))
                    try:
                        if getattr(self.irrigation_algorithm, 'websocket_client', None):
                            payload = result.to_websocket_data()
                            _asyncio.run(self.irrigation_algorithm.websocket_client.send_message(
                                "IRRIGATE_PLANT_RESPONSE", payload
                            ))
                    except Exception:
                        pass
                threading.Thread(target=_runner, daemon=True).start()
        except Exception as e:
            print(f"ERROR starting scheduled irrigation: {e}")

    def clear_schedules(self) -> None:
        """Cancel all registered jobs for this schedule instance."""
        try:
            import schedule as _schedule
            for job in getattr(self, 'jobs', []) or []:
                try:
                    _schedule.cancel_job(job)
                except Exception:
                    pass
        finally:
            self.jobs = []

    def update_schedule(self, schedule_data: List[Dict[str, str]]) -> None:
        """Replace existing schedule with a new one."""
        self.schedule_data = schedule_data or []
        self.setup_schedules()

