def handle(data, ws, smart_engine):
    try:
        plant_id = data["plantId"]
        desired_moisture = data["desiredMoisture"]
        schedule_data = data["scheduleData"]

        smart_engine.add_plant(
            plant_id,
            desired_moisture,
            schedule_data
        )

        print(f"🪴 Plant '{plant_id}' added successfully.")

    except Exception as e:
        print(f"❌ Failed to add plant: {e}")
