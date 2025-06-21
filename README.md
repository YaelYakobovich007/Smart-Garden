<h1 align="center">
  <br/>
  🌱 Smart Garden Project
   <br/>
   <br/>
  <img src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExOTJ1YjR1amRiYTBmbWVtaDJsajVpb2pjZTg4enZ2aHBka2x4cHA4aSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/dxxoL6BizkG06UMqtK/giphy.gif" width="20%" alt="waveEmoji"/>
</h1>

<h2 align="center">
  An automated system for optimized gardening!
</h2>

<br/>

## 📜 **Project Overview**

The Smart Garden Project is designed to simplify gardening with automated irrigation, real-time monitoring, and AI-powered plant care suggestions. The system ensures plant health while conserving water and providing actionable insights.



## 🎯 **Objectives**

-  Simplify garden maintenance  
-  Enhance water conservation  
-  Promote plant health and growth  



## 🌟 **Key Features**

-  **Real-Time Monitoring**: Track soil moisture, temperature, and more.  
-  **Automated Irrigation**: Smart control based on weather and soil data.  
-  **Weather Integration**: Adjust schedules based on forecasts.  
-  **Mobile App**: Monitor and control your garden from anywhere.  
-  **Historical Data**: Insights into trends and plant health over time.  
-  **AI-Powered Plant Care**: Upload photos for analysis and tailored recommendations.  



## 🛠️ **Technology Stack**

-  **Hardware**: Raspberry Pi, soil sensors, and solenoid valves.  
-  **Backend**: Node.js + Express and Python for sensor integration.  
-  **Database**: MySQL for storing sensor and user data.  
-  **Frontend**: React Native for mobile app development.  
<<<<<<< HEAD
-  **APIs**: OpenWeatherMap and Plant.id for weather and plant analysis.  
=======
-  **APIs**: OpenWeatherMap and Plant.id for weather and plant analysis.

## 🧩 **System Architecture & Components**

This section describes the main components of the Smart Garden system, covering the full software architecture for automated plant monitoring and irrigation control. The system is structured into modular classes for sensors, relays, valves, plant models, resource management, and irrigation logic—with support for both simulation and **real hardware integration**.

### 1. Hardware Abstraction
- **Sensor** (`Sensor`):
    - Async-enabled class supporting both simulation and real Modbus RTU soil/moisture sensor reading.
    - Provides methods for reading and updating simulated sensor values.
- **Relay Controller** (`RelayController`):
    - Abstraction for controlling hardware relays, supporting both simulation and real hardware relay activation/deactivation.
- **Valve** (`Valve`):
    - Represents a water valve (solenoid or similar), with logic for opening, closing, blocking, and timing water flow.
    - Supports both simulation and real hardware control.

### 2. Resource Management
- **SensorManager**:
    - Handles assignment of sensors to plants, tracking available sensors and managing unique assignments.
- **ValvesManager**:
    - Manages allocation and release of valve resources, ensuring each plant is connected to a unique valve.

### 3. Plant & Scheduling Model
- **Plant**:
    - Represents a single plant, storing its target moisture, assigned sensor and valve, coordinates, and irrigation schedule.
    - Supports async moisture reading via its assigned sensor.
- **IrrigationSchedule**:
    - Handles time-based scheduling for plant irrigation, supporting recurring jobs via the `schedule` library.

### 4. Irrigation Logic
- **IrrigationAlgorithm**:
    - Encapsulates the core irrigation decision logic.
    - Checks current soil moisture, consults weather service to skip watering before rain, detects overwatering, and manages the watering cycle in pulses.
    - Fully supports async workflows and proper use of awaited sensor reads.
- **WeatherService**:
    - Interface for checking weather forecasts (e.g., to skip irrigation if rain is predicted).

### 5. System Engine
- **SmartGardenEngine**:
    - Central engine managing plant registration, sensor/valve allocation, and invoking irrigation logic.
    - Exposes methods to add/remove plants, start async watering, update all moisture values, and check available resources.
>>>>>>> 89e73555bb682622347d553d8259c3797bfb36d4



<br/>

# :trophy: **Credits** <a name="credits"/>
> Created by: Yael Yakobovich & Elizabeth Ashurov

<br/>
