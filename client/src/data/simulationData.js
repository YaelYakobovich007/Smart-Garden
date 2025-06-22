// Simulation data for testing the Smart Garden app
// This data mimics real sensor readings and notifications

export const getSimulatedPlants = () => {
  return [
    {
      id: 1,
      name: 'Beautiful Rose',
      type: 'rose',
      location: 'Garden A',
      moisture: 45,
      temperature: 22,
      lightLevel: 75,
      isHealthy: true,
    },
    {
      id: 2,
      name: 'Fresh Basil',
      type: 'basil',
      location: 'Kitchen Window',
      moisture: 25,
      temperature: 24,
      lightLevel: 90,
      isHealthy: false,
    },
    {
      id: 3,
      name: 'Monstera Deliciosa',
      type: 'monstera',
      location: 'Living Room',
      moisture: 70,
      temperature: 20,
      lightLevel: 60,
      isHealthy: true,
    },
    {
      id: 4,
      name: 'Colorful Petunia',
      type: 'Petunia',
      location: 'Balcony',
      moisture: 35,
      temperature: 25,
      lightLevel: 85,
      isHealthy: true,
    },
  ];
};

export const getSimulatedNotifications = () => {
  return [
    {
      id: 1,
      type: 'watering',
      message: 'Fresh Basil needs watering - moisture level is low',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      isRead: false,
    },
    {
      id: 2,
      type: 'success',
      message: 'Beautiful Rose watered successfully',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      isRead: true,
    },
    {
      id: 3,
      type: 'alert',
      message: 'Temperature alert: Garden A is getting too warm',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      isRead: false,
    },
    {
      id: 4,
      type: 'reminder',
      message: 'Colorful Petunia moisture level is moderate',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
      isRead: true,
    },
    {
      id: 5,
      type: 'success',
      message: 'All plants checked - system running normally',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      isRead: true,
    },
  ];
};

// Helper function to get random sensor data for testing
export const getRandomSensorData = () => {
  return {
    moisture: Math.floor(Math.random() * 100),
    temperature: Math.floor(Math.random() * 15) + 15, // 15-30°C
    lightLevel: Math.floor(Math.random() * 100),
  };
};

// Helper function to generate a new notification
export const generateNotification = (type, message) => {
  return {
    id: Date.now(),
    type,
    message,
    timestamp: new Date(),
  };
};

// Simulation configuration
export const simulationConfig = {
  isEnabled: true,
  updateInterval: 5000, // 5 seconds
  autoWatering: false,
  notificationsEnabled: true,
}; 