const { sendSuccess, sendError } = require('../utils/wsResponses');
const { handleSensorAssigned, handleValveAssigned } = require('../controllers/plantAssignmentController');
const { completePendingPlant } = require('../services/pendingPlantsTracker');
const { completePendingIrrigation } = require('../services/pendingIrrigationTracker');
const { completePendingMoistureRequest } = require('../services/pendingMoistureTracker');
const { broadcastPlantAdded, broadcastMoistureUpdate } = require('../services/gardenBroadcaster');

let piSocket = null;

function handlePiSocket(ws) {
  piSocket = ws;
  console.log('Pi connected: raspberrypi_main_controller');
  sendSuccess(ws, 'WELCOME', { message: 'Hello Pi' });

  ws.on('message', async (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
      console.log(`Pi message: ${data.type}`);
    } catch {
      console.error('Invalid JSON from Pi:', msg);
      return sendError(ws, 'INVALID_JSON', 'Invalid JSON format');
    }

    if (data.type === 'SENSOR_ASSIGNED') {
      console.log(`Received sensor assignment: ${data.data?.sensor_port} for ${data.data?.plant_id}`);
      return handleSensorAssigned(data, ws);
    }

    if (data.type === 'VALVE_ASSIGNED') {
      console.log(`Received valve assignment: ${data.data?.valve_id} for ${data.data?.plant_id}`);
      return handleValveAssigned(data, ws);
    }

    // Handle ADD_PLANT_RESPONSE from Pi
    if (data.type === 'ADD_PLANT_RESPONSE') {
      const responseData = data.data || {};
      const plantId = responseData.plant_id; // This is the real database plant_id

      // Get pending plant info (websocket + plant data)
      const pendingInfo = completePendingPlant(plantId);

      if (responseData.status === 'success') {
        console.log(`Plant ${plantId}: assigned sensor_port=${responseData.sensor_port}, valve=${responseData.assigned_valve}`);

        // Update plant in database with hardware IDs
        const { updatePlantHardware } = require('../models/plantModel');

        try {
          await updatePlantHardware(plantId, responseData.sensor_port, responseData.assigned_valve);
          console.log(`Plant ${plantId} database updated with hardware assignments`);

          // Notify client of successful plant creation with hardware assignment
          if (pendingInfo) {
            const { ws, email, plantData } = pendingInfo;
            sendSuccess(ws, 'ADD_PLANT_SUCCESS', {
              plant: {
                ...plantData,
                sensor_port: responseData.sensor_port,
                valve_id: responseData.assigned_valve
              },
              message: `Plant "${plantData.name}" created successfully with hardware assignment`
            });

            // Broadcast plant addition to other garden members
            try {
              const gardenId = await require('../models/plantModel').getUserGardenId(pendingInfo.userId);
              if (gardenId) {
                await broadcastPlantAdded(gardenId, {
                  ...plantData,
                  sensor_port: responseData.sensor_port,
                  valve_id: responseData.assigned_valve
                }, email);
              }
            } catch (broadcastError) {
              console.error('Error broadcasting plant addition:', broadcastError);
            }
          }
        } catch (dbError) {
          console.error(`Failed to update plant ${plantId} in database:`, dbError);
          // Notify client of database error
          if (pendingInfo) {
            sendError(pendingInfo.ws, 'ADD_PLANT_FAIL', 'Failed to save hardware assignment to database');
          }
        }
      } else {
        console.log(`Plant ${plantId}: hardware assignment failed - ${responseData.error_message}`);
        // Notify client of hardware assignment failure
        if (pendingInfo) {
          sendError(pendingInfo.ws, 'ADD_PLANT_FAIL', `Hardware assignment failed: ${responseData.error_message}`);
        }
      }
    }

    // Handle UPDATE_PLANT_RESPONSE from Pi
    if (data.type === 'UPDATE_PLANT_RESPONSE') {
      const responseData = data.data || {};
      const plantId = responseData.plant_id;

      // Get pending update info
      const { getPendingUpdate } = require('../services/pendingUpdateTracker');
      const pendingInfo = getPendingUpdate(plantId);

      if (responseData.success) {
        console.log(`Plant ${plantId} updated successfully on Pi: ${responseData.message}`);
        
        // Send success response to frontend
        if (pendingInfo) {
          const { sendSuccess } = require('../utils/wsResponses');
          // Get the updated plant data from the database
          const { getPlantById } = require('../models/plantModel');
          try {
            const updatedPlant = await getPlantById(plantId);
            sendSuccess(pendingInfo.ws, 'UPDATE_PLANT_DETAILS_SUCCESS', {
              plant: updatedPlant,
              message: `Plant updated successfully on hardware: ${responseData.message}`
            });
          } catch (error) {
            console.error('Error getting updated plant data:', error);
            sendSuccess(pendingInfo.ws, 'UPDATE_PLANT_DETAILS_SUCCESS', {
              message: `Plant updated successfully on hardware: ${responseData.message}`
            });
          }
        }
      } else {
        console.warn(`Failed to update plant ${plantId} on Pi: ${responseData.message}`);
        
        // Send error response to frontend
        if (pendingInfo) {
          const { sendError } = require('../utils/wsResponses');
          // Get the updated plant data from the database even on error (in case the update was partially successful)
          const { getPlantById } = require('../models/plantModel']);
          try {
            const updatedPlant = await getPlantById(plantId);
            sendError(pendingInfo.ws, 'UPDATE_PLANT_DETAILS_FAIL', {
              plant: updatedPlant,
              message: `Hardware update failed: ${responseData.message}`
            });
          } catch (error) {
            console.error('Error getting updated plant data:', error);
            sendError(pendingInfo.ws, 'UPDATE_PLANT_DETAILS_FAIL', `Hardware update failed: ${responseData.message}`);
          }
        }
      }
    }

    // Handle PI_LOG messages from Pi
    if (data.type === 'PI_LOG') {
      console.log('🔍 DEBUG - Received PI_LOG message:');
      console.log('   - Full data:', JSON.stringify(data));
      console.log('   - data.data:', data.data);
      console.log('   - data.data.message:', data.data?.message);
      
      const logData = data.data || {};
      const timestamp = logData.timestamp || new Date().toISOString();
      const message = logData.message || 'No message';
      
      console.log(`🌱 [PI LOG - ${timestamp}] ${message}`);
      
      // You could also broadcast this to connected clients if needed
      // For now, just log to server console
      return;
    }


    // Handle IRRIGATION_DECISION messages from Pi
    if (data.type === 'IRRIGATION_DECISION') {
      const decisionData = data.data || {};
      const plantId = decisionData.plant_id;
      
      console.log(`[IRRIGATION DECISION] Plant ${plantId}`);
      console.log(`Current Moisture: ${decisionData.current_moisture}%`);
      console.log(`Target Moisture: ${decisionData.target_moisture}%`);
      console.log(`Moisture Gap: ${decisionData.moisture_gap}%`);
      console.log(`Will Irrigate: ${decisionData.will_irrigate}`);
      console.log(`Reason: ${decisionData.reason}`);
      
      // Get pending irrigation info to send notification
      const { getPendingIrrigation } = require('../services/pendingIrrigationTracker');
      const pendingInfo = getPendingIrrigation(plantId);
      
      if (pendingInfo) {
        // If irrigation will start, notify the client
        if (decisionData.will_irrigate) {
          if (pendingInfo.ws) {
            sendSuccess(pendingInfo.ws, 'IRRIGATION_STARTED', {
              message: `Starting irrigation for plant "${pendingInfo.plantData.plant_name}"`,
              plantName: pendingInfo.plantData.plant_name,
              plantId: plantId,
              currentMoisture: decisionData.current_moisture,
              targetMoisture: decisionData.target_moisture
            });
          }
        } else {
          // If irrigation will be skipped, notify the client
          if (pendingInfo.ws) {
            sendSuccess(pendingInfo.ws, 'IRRIGATE_SKIPPED', {
              message: `Irrigation skipped for plant "${pendingInfo.plantData.plant_name}": ${decisionData.reason}`,
              plantName: pendingInfo.plantData.plant_name,
              plantId: plantId,
              reason: decisionData.reason
            });
          }
        }
        
        // Send email notification if available
        if (pendingInfo.email) {
          const { notifyUserOfIrrigationStart } = require('../services/userNotifier');
          notifyUserOfIrrigationStart({
            plantName: pendingInfo.plantData.plant_name,
            email: pendingInfo.email,
            initialMoisture: decisionData.current_moisture,
            targetMoisture: decisionData.target_moisture
          });
          console.log(`Sent irrigation start notification to user ${pendingInfo.email} for plant ${pendingInfo.plantData.plant_name}`);
        }
      }
      
      return;
    }

    // Handle IRRIGATION_PROGRESS messages from Pi
    if (data.type === 'IRRIGATION_PROGRESS') {
      const progressData = data.data || {};
      const plantId = progressData.plant_id;
      const stage = progressData.stage;
      const timestamp = progressData.timestamp || new Date().toISOString();
      
      console.log(`🚰 [IRRIGATION PROGRESS - ${timestamp}] Plant ${plantId} - ${stage.toUpperCase()}`);
      console.log(`   📊 Current Moisture: ${progressData.current_moisture}%`);
      console.log(`   🎯 Target Moisture: ${progressData.target_moisture}%`);
      console.log(`   💧 Moisture Gap: ${progressData.moisture_gap}%`);
      console.log(`   💦 Total Water Used: ${progressData.total_water_used}L`);
      console.log(`   📈 Pulse Number: ${progressData.pulse_number || 'N/A'}`);
      console.log(`   🚰 Water Limit: ${progressData.water_limit || 'N/A'}L`);
      console.log(`   📋 Status: ${progressData.status}`);
      console.log(`   📝 Message: ${progressData.message}`);
      
      // Display details object if it exists
      if (progressData.details) {
        console.log(`   🔍 Details:`);
        Object.entries(progressData.details).forEach(([key, value]) => {
          console.log(`      ${key}: ${value}`);
        });
      }
      
      // Check if this is the first pulse (irrigation actually starting)
      if (stage === 'pulse' && progressData.pulse_number === 1) {
        console.log(`🚀 First pulse detected - irrigation actually started for plant ${plantId}`);
        
        // Get pending irrigation info to send notification
        const { getPendingIrrigation } = require('../services/pendingIrrigationTracker');
        const pendingInfo = getPendingIrrigation(plantId);
        
        if (pendingInfo && pendingInfo.email) {
          const { notifyUserOfIrrigationStart } = require('../services/userNotifier');
          notifyUserOfIrrigationStart({
            plantName: pendingInfo.plantData.plant_name,
            email: pendingInfo.email,
            initialMoisture: progressData.current_moisture || 0,
            targetMoisture: progressData.target_moisture || pendingInfo.plantData.ideal_moisture
          });
          console.log(`📱 Sent irrigation start notification to user ${pendingInfo.email} for plant ${pendingInfo.plantData.plant_name}`);
        } else {
          console.log(`⚠️ No pending irrigation found for plant ${plantId} - cannot send start notification`);
        }
      }
      
      return;
    }

    // Handle IRRIGATE_PLANT_RESPONSE from Pi
    if (data.type === 'IRRIGATE_PLANT_RESPONSE') {
      const responseData = data.data || {};
      const plantId = responseData.plant_id;

      // Get pending irrigation info (websocket + plant data)
      const pendingInfo = completePendingIrrigation(plantId);

      if (responseData.status === 'success') {
        console.log(`Plant ${plantId} irrigation completed successfully`);
        console.log(`   - Water added: ${responseData.water_added_liters}L`);
        console.log(`   - Final moisture: ${responseData.final_moisture}%`);

        // Save irrigation result to database
        const irrigationModel = require('../models/irrigationModel');

        try {
          const irrigationResult = await irrigationModel.addIrrigationResult({
            plant_id: plantId,
            status: responseData.status,
            reason: responseData.reason || 'Pi irrigation completed',
            moisture: responseData.moisture,
            final_moisture: responseData.final_moisture,
            water_added_liters: responseData.water_added_liters,
            irrigation_time: responseData.irrigation_time ? new Date(responseData.irrigation_time) : new Date(),
            event_data: responseData.event_data || {}
          });

          console.log(`Irrigation result saved to database for plant ${plantId}`);

          // Notify client of successful irrigation
          if (pendingInfo && pendingInfo.ws) {
            sendSuccess(pendingInfo.ws, 'IRRIGATE_SUCCESS', {
              message: `Plant "${pendingInfo.plantData.plant_name}" irrigated successfully! Added ${responseData.water_added_liters}L of water.`,
              result: irrigationResult,
              irrigation_data: {
                water_added_liters: responseData.water_added_liters,
                final_moisture: responseData.final_moisture,
                initial_moisture: responseData.moisture
              }
            });
            console.log(`Notified client: Plant ${pendingInfo.plantData.plant_name} irrigation successful!`);
          } else {
            console.log(`No pending client found for plant ${plantId} irrigation - result saved but client not notified`);
          }

          // Send user notification about irrigation completion
          if (pendingInfo && pendingInfo.email) {
            const { notifyUserOfIrrigationComplete } = require('../services/userNotifier');
            notifyUserOfIrrigationComplete({
              plantName: pendingInfo.plantData.plant_name,
              email: pendingInfo.email,
              irrigationData: {
                water_added_liters: responseData.water_added_liters,
                final_moisture: responseData.final_moisture,
                initial_moisture: responseData.moisture
              }
            });
            console.log(`📱 Sent irrigation completion notification to user ${pendingInfo.email}`);
          }

        } catch (err) {
          console.error(`Failed to save irrigation result for plant ${plantId}:`, err);

          if (pendingInfo && pendingInfo.ws) {
            sendError(pendingInfo.ws, 'IRRIGATE_FAIL',
              `Irrigation completed but failed to save result: ${err.message}`);
          }
        }

      } else if (responseData.status === 'cancelled') {
        console.log(` Plant ${plantId} irrigation cancelled by user`);

        // Save cancelled result to database
        const irrigationModel = require('../models/irrigationModel');

        try {
          const irrigationResult = await irrigationModel.addIrrigationResult({
            plant_id: plantId,
            status: 'cancelled',
            reason: responseData.reason || 'Smart irrigation cancelled by user',
            moisture: responseData.moisture || null,
            final_moisture: responseData.final_moisture || responseData.moisture || null,
            water_added_liters: responseData.water_added_liters || 0,
            irrigation_time: new Date(),
            event_data: responseData.event_data || {}
          });

          if (pendingInfo && pendingInfo.ws) {
            sendSuccess(pendingInfo.ws, 'IRRIGATION_CANCELLED', {
              message: `Smart irrigation for "${pendingInfo.plantData.plant_name}" was cancelled by user.`,
              result: irrigationResult,
              plantName: pendingInfo.plantData.plant_name,
              plantId: plantId
            });
            console.log(` Notified client: Plant ${pendingInfo.plantData.plant_name} irrigation cancelled`);
          }
        } catch (err) {
          console.error(` Failed to save cancelled irrigation result for plant ${plantId}:`, err);
        }

      } else       if (responseData.status === 'skipped') {
        console.log(`Plant ${plantId} irrigation skipped: ${responseData.reason}`);

        // Save skipped result to database
        const irrigationModel = require('../models/irrigationModel');

        try {
          const irrigationResult = await irrigationModel.addIrrigationResult({
            plant_id: plantId,
            status: 'skipped',
            reason: responseData.reason || 'Pi skipped irrigation',
            moisture: responseData.moisture,
            final_moisture: responseData.moisture, // Same as initial for skipped
            water_added_liters: 0,
            irrigation_time: new Date(),
            event_data: responseData.event_data || {}
          });

          // Notify client that irrigation was skipped
          if (pendingInfo && pendingInfo.ws) {
            // First send IRRIGATION_DECISION to clear the checking screen
            sendSuccess(pendingInfo.ws, 'IRRIGATION_DECISION', {
              plant_id: plantId,
              current_moisture: responseData.moisture,
              target_moisture: pendingInfo.plantData.ideal_moisture,
              moisture_gap: pendingInfo.plantData.ideal_moisture - responseData.moisture,
              will_irrigate: false,
              reason: responseData.reason
            });

            // Then send IRRIGATE_SKIPPED for the final status
            setTimeout(() => {
              sendSuccess(pendingInfo.ws, 'IRRIGATE_SKIPPED', {
                message: `Plant "${pendingInfo.plantData.plant_name}" irrigation skipped: ${responseData.reason}`,
                result: irrigationResult,
                reason: responseData.reason,
                plantName: pendingInfo.plantData.plant_name,
                plantId: plantId
              });
            }, 500);
            
            console.log(`ℹ️ Notified client: Plant ${pendingInfo.plantData.plant_name} irrigation skipped`);
          }

          // Send user notification about irrigation being skipped
          if (pendingInfo && pendingInfo.email) {
            const { notifyUserOfIrrigationSkipped } = require('../services/userNotifier');
            notifyUserOfIrrigationSkipped({
              plantName: pendingInfo.plantData.plant_name,
              email: pendingInfo.email,
              reason: responseData.reason
            });
            console.log(`📱 Sent irrigation skipped notification to user ${pendingInfo.email}`);
          }

        } catch (err) {
          console.error(`❌ Failed to save skipped irrigation result for plant ${plantId}:`, err);
        }

      } else {
        // Irrigation failed
        console.error(`❌ Plant ${plantId} irrigation failed: ${responseData.error_message}`);

        // Check if it's a valve blocking error - more specific detection
        const isValveBlocked = responseData.error_message && 
          (responseData.error_message.toLowerCase().includes('valve is blocked') || 
           responseData.error_message.toLowerCase().includes('blocked') ||
           responseData.error_message.toLowerCase().includes('overwatered') ||
           responseData.error_message.toLowerCase().includes('water limit reached'));

        // Save error result to database
        const irrigationModel = require('../models/irrigationModel');

        try {
          const irrigationResult = await irrigationModel.addIrrigationResult({
            plant_id: plantId,
            status: 'error',
            reason: responseData.error_message || 'Pi irrigation failed',
            moisture: responseData.moisture || null,
            final_moisture: responseData.moisture || null,
            water_added_liters: 0,
            irrigation_time: new Date(),
            event_data: responseData
          });

          // Notify client of irrigation failure with appropriate message
          if (pendingInfo && pendingInfo.ws) {
            if (isValveBlocked) {
              // For valve blocking, send a more specific message
              let userMessage = responseData.error_message;
              if (responseData.error_message.includes('Water limit reached')) {
                userMessage = `Irrigation completed but the water limit was reached before achieving the desired moisture level. The plant received ${responseData.water_added_liters || 0}L of water but the soil moisture only increased from ${responseData.moisture}% to ${responseData.final_moisture}%. The valve has been blocked to prevent overwatering.`;
              } else if (responseData.error_message.includes('overwatered')) {
                userMessage = `Irrigation blocked: The plant is already overwatered with ${responseData.moisture}% moisture. The valve has been blocked to prevent further damage.`;
              } else if (responseData.error_message.includes('valve is blocked')) {
                userMessage = `Irrigation failed: The valve is physically blocked and cannot be opened. Please check the valve manually and unblock it if needed.`;
              }
              
              sendError(pendingInfo.ws, 'VALVE_BLOCKED', userMessage);
            } else {
              sendError(pendingInfo.ws, 'IRRIGATE_FAIL',
                `Plant "${pendingInfo.plantData.plant_name}" irrigation failed: ${responseData.error_message || 'Unknown error'}`);
            }
          }

          // Send user notification about irrigation error
          if (pendingInfo && pendingInfo.email) {
            const { notifyUserOfIrrigationError } = require('../services/userNotifier');
            notifyUserOfIrrigationError({
              plantName: pendingInfo.plantData.plant_name,
              email: pendingInfo.email,
              errorMessage: responseData.error_message || 'Unknown error'
            });
            console.log(`📱 Sent irrigation error notification to user ${pendingInfo.email}`);
          }

          // Update valve status in database if it's a valve blocking error
          if (isValveBlocked) {
            const { updateValveStatus } = require('../models/plantModel');
            try {
              await updateValveStatus(plantId, true);
              console.log(`📊 Updated plant ${plantId} valve status to BLOCKED in database`);
            } catch (err) {
              console.error(`Failed to update valve status for plant ${plantId}:`, err);
            }
          }

        } catch (err) {
          console.error(`Failed to save error irrigation result for plant ${plantId}:`, err);
        }
      }
      return;
    }

    // Handle STOP_IRRIGATION_RESPONSE from Pi
    if (data.type === 'STOP_IRRIGATION_RESPONSE') {
      const responseData = data.data || {};
      const plantId = responseData.plant_id;

      // Get pending irrigation info (websocket + plant data)
      const pendingInfo = completePendingIrrigation(plantId);

      if (responseData.status === 'success') {
        console.log(`🛑 Plant ${plantId} irrigation stopped successfully`);
        console.log(`   - Reason: ${responseData.reason}`);

        // Save stop irrigation result to database
        const irrigationModel = require('../models/irrigationModel');

        try {
          const irrigationResult = await irrigationModel.addIrrigationResult({
            plant_id: plantId,
            status: 'stopped',
            reason: responseData.reason || 'Smart irrigation stopped by user',
            moisture: responseData.moisture,
            final_moisture: responseData.final_moisture || responseData.moisture,
            water_added_liters: responseData.water_added_liters || 0,
            irrigation_time: new Date(),
            event_data: responseData.event_data || {}
          });

          console.log(`Stop irrigation result saved to database for plant ${plantId}`);

          // Notify client of successful irrigation stop
          if (pendingInfo?.ws) {
            sendSuccess(pendingInfo.ws, 'STOP_IRRIGATION_SUCCESS', {
              plantId: plantId,
              plantName: pendingInfo?.plantData?.plant_name,
              moisture: responseData.moisture,
              final_moisture: responseData.final_moisture,
              water_added_liters: responseData.water_added_liters,
              message: `Plant "${pendingInfo?.plantData?.plant_name || plantId}" irrigation stopped successfully!`,
              result: irrigationResult
            });
            console.log(`🛑 Notified client: Plant ${pendingInfo?.plantData?.plant_name || plantId} irrigation stopped!`);
          } else {
            console.log(`No pending client found for plant ${plantId} stop irrigation - result saved but client not notified`);
          }

        } catch (err) {
          console.error(`Failed to save stop irrigation result for plant ${plantId}:`, err);

          if (pendingInfo && pendingInfo.ws) {
            sendError(pendingInfo.ws, 'STOP_IRRIGATION_FAIL',
              `Irrigation stopped but failed to save result: ${err.message}`);
          }
        }

      } else {
        // Stop irrigation failed
        console.error(`❌ Plant ${plantId} stop irrigation failed: ${responseData.error_message}`);

        // Notify client of stop irrigation failure
        if (pendingInfo && pendingInfo.ws) {
          sendError(pendingInfo.ws, 'STOP_IRRIGATION_FAIL',
            `Failed to stop irrigation: ${responseData.error_message || 'Unknown error'}`);
        }
      }
      return;
    }

    // Handle OPEN_VALVE_RESPONSE from Pi
    if (data.type === 'OPEN_VALVE_RESPONSE') {
      console.log('🔍 DEBUG - Received OPEN_VALVE_RESPONSE from Pi:');
      console.log('   - Full data:', JSON.stringify(data));

      const responseData = data.data || {};
      const plantId = responseData.plant_id;
      const timeMinutes = responseData.time_minutes;

      console.log(' DEBUG - Extracted response data:');
      console.log('   - plantId:', plantId, '(type:', typeof plantId, ')');
      console.log('   - timeMinutes:', timeMinutes, '(type:', typeof timeMinutes, ')');
      console.log('   - status:', responseData.status);

      // Get pending irrigation info (websocket + plant data)
      console.log(' DEBUG - Getting pending irrigation info for plantId:', plantId);
      const pendingInfo = completePendingIrrigation(plantId);
      console.log(' DEBUG - Pending info result:', pendingInfo ? 'Found' : 'Not found');

      if (responseData.status === 'success') {
        console.log(` DEBUG - Plant ${plantId} valve opened successfully for ${timeMinutes} minutes`);
        console.log(`   - Duration: ${timeMinutes} minutes`);
        console.log(`   - Reason: ${responseData.reason}`);

        // Save valve operation result to database
        const irrigationModel = require('../models/irrigationModel');

        try {
          const irrigationResult = await irrigationModel.addIrrigationResult({
            plant_id: plantId,
            status: 'valve_opened',
            reason: responseData.reason || 'Pi valve opened',
            moisture: responseData.moisture || null,
            final_moisture: responseData.moisture || null,
            water_added_liters: 0, // No water added during valve opening
            irrigation_time: new Date(),
            event_data: {
              ...responseData.event_data || {},
              valve_operation: 'open',
              duration_minutes: timeMinutes
            }
          });

          console.log(`Valve operation result saved to database for plant ${plantId}`);

          // Notify client of successful valve opening
          if (pendingInfo && pendingInfo.ws) {
            sendSuccess(pendingInfo.ws, 'OPEN_VALVE_SUCCESS', {
              message: `Plant "${pendingInfo.plantData.plant_name}" valve opened successfully for ${timeMinutes} minutes!`,
              result: irrigationResult,
              valve_data: {
                duration_minutes: timeMinutes,
                operation: 'open'
              }
            });
            console.log(`Notified client: Plant ${pendingInfo.plantData.plant_name} valve opened successfully!`);
          } else {
            console.log(`No pending client found for plant ${plantId} valve operation - result saved but client not notified`);
          }

        } catch (err) {
          console.error(` Failed to save valve operation result for plant ${plantId}:`, err);

          if (pendingInfo && pendingInfo.ws) {
            sendError(pendingInfo.ws, 'OPEN_VALVE_FAIL',
              `Valve opened but failed to save result: ${err.message}`);
          }
        }

      } else {
        // Valve opening failed
        console.error(` Plant ${plantId} valve opening failed: ${responseData.error_message}`);

        // Save error result to database
        const irrigationModel = require('../models/irrigationModel');

        try {
          const irrigationResult = await irrigationModel.addIrrigationResult({
            plant_id: plantId,
            status: 'error',
            reason: responseData.error_message || 'Pi valve opening failed',
            moisture: responseData.moisture || null,
            final_moisture: responseData.moisture || null,
            water_added_liters: 0,
            irrigation_time: new Date(),
            event_data: {
              ...responseData.event_data || {},
              valve_operation: 'open_failed',
              duration_minutes: timeMinutes
            }
          });

          // Notify client of valve opening failure
          if (pendingInfo && pendingInfo.ws) {
            sendError(pendingInfo.ws, 'OPEN_VALVE_FAIL',
              `Valve opening failed: ${responseData.error_message || 'Unknown error'}`);
          }

        } catch (err) {
          console.error(` Failed to save valve operation error result for plant ${plantId}:`, err);
        }
      }
      return;
    }

    // Handle CLOSE_VALVE_RESPONSE from Pi
    if (data.type === 'CLOSE_VALVE_RESPONSE') {
      console.log(' DEBUG - Received CLOSE_VALVE_RESPONSE from Pi:');
      console.log('   - Full data:', JSON.stringify(data));

      const responseData = data.data || {};
      const plantId = responseData.plant_id;

      console.log(' DEBUG - Extracted response data:');
      console.log('   - plantId:', plantId, '(type:', typeof plantId, ')');
      console.log('   - status:', responseData.status);

      // Get pending irrigation info (websocket + plant data)
      console.log(' DEBUG - Getting pending irrigation info for plantId:', plantId);
      const pendingInfo = completePendingIrrigation(plantId);
      console.log(' DEBUG - Pending info result:', pendingInfo ? 'Found' : 'Not found');

      if (responseData.status === 'success') {
        console.log(` DEBUG - Plant ${plantId} valve closed successfully`);
        console.log(`   - Reason: ${responseData.reason}`);

        // Save valve operation result to database
        const irrigationModel = require('../models/irrigationModel');

        try {
          const irrigationResult = await irrigationModel.addIrrigationResult({
            plant_id: plantId,
            status: 'valve_closed',
            reason: responseData.reason || 'Pi valve closed',
            moisture: responseData.moisture || null,
            final_moisture: responseData.moisture || null,
            water_added_liters: 0, // No water added during valve closing
            irrigation_time: new Date(),
            event_data: {
              ...responseData.event_data || {},
              valve_operation: 'close'
            }
          });

          console.log(`Valve operation result saved to database for plant ${plantId}`);

          // Notify client of successful valve closing
          if (pendingInfo && pendingInfo.ws) {
            sendSuccess(pendingInfo.ws, 'CLOSE_VALVE_SUCCESS', {
              message: `Plant "${pendingInfo.plantData.plant_name}" valve closed successfully!`,
              result: irrigationResult,
              valve_data: {
                operation: 'close'
              }
            });
            console.log(`Notified client: Plant ${pendingInfo.plantData.plant_name} valve closed successfully!`);
          } else {
            console.log(`No pending client found for plant ${plantId} valve operation - result saved but client not notified`);
          }

        } catch (err) {
          console.error(` Failed to save valve operation result for plant ${plantId}:`, err);

          if (pendingInfo && pendingInfo.ws) {
            sendError(pendingInfo.ws, 'CLOSE_VALVE_FAIL',
              `Valve closed but failed to save result: ${err.message}`);
          }
        }

      } else {
        // Valve closing failed
        console.error(` Plant ${plantId} valve closing failed: ${responseData.error_message}`);

        // Save error result to database
        const irrigationModel = require('../models/irrigationModel');

        try {
          const irrigationResult = await irrigationModel.addIrrigationResult({
            plant_id: plantId,
            status: 'error',
            reason: responseData.error_message || 'Pi valve closing failed',
            moisture: responseData.moisture || null,
            final_moisture: responseData.moisture || null,
            water_added_liters: 0,
            irrigation_time: new Date(),
            event_data: {
              ...responseData.event_data || {},
              valve_operation: 'close_failed'
            }
          });

          // Notify client of valve closing failure
          if (pendingInfo && pendingInfo.ws) {
            sendError(pendingInfo.ws, 'CLOSE_VALVE_FAIL',
              `Valve closing failed: ${responseData.error_message || 'Unknown error'}`);
          }

        } catch (err) {
          console.error(`❌ Failed to save valve operation error result for plant ${plantId}:`, err);
        }
      }
      return;
    }

    // Handle PLANT_MOISTURE_RESPONSE from Pi
    if (data.type === 'PLANT_MOISTURE_RESPONSE') {
      const responseData = data.data || {};

      if (responseData.status === 'success') {
        console.log(`🌿 Plant ${responseData.plant_id}: moisture=${responseData.moisture}%, temperature=${responseData.temperature}°C`);

        // Get pending moisture request info
        const pendingInfo = completePendingMoistureRequest(responseData.plant_id);

        if (pendingInfo && pendingInfo.ws) {
          const moistureData = {
            plant_id: responseData.plant_id,
            moisture: responseData.moisture,
            temperature: responseData.temperature,
            status: 'success',
            message: `Moisture data received for plant ${responseData.plant_id}`
          };

          // Send moisture data to requesting client
          sendSuccess(pendingInfo.ws, 'PLANT_MOISTURE_RESPONSE', moistureData);
          console.log(`📊 Sent moisture data to client for plant ${responseData.plant_id}`);

          // Broadcast moisture update to other garden members
          try {
            const { getPlantById } = require('../models/plantModel');
            const plant = await getPlantById(responseData.plant_id);
            if (plant && plant.garden_id) {
              await broadcastMoistureUpdate(plant.garden_id, moistureData, pendingInfo.email);
            }
          } catch (broadcastError) {
            console.error('Error broadcasting moisture update:', broadcastError);
          }
        } else {
          console.log(`⚠️ No pending client found for plant ${responseData.plant_id} moisture request`);
        }
      } else {
        console.error(`❌ Plant ${responseData.plant_id} moisture read failed: ${responseData.error_message}`);

        // Get pending moisture request info
        const pendingInfo = completePendingMoistureRequest(responseData.plant_id);

        if (pendingInfo && pendingInfo.ws) {
          // Send error to requesting client
          sendError(pendingInfo.ws, 'PLANT_MOISTURE_FAIL', {
            plant_id: responseData.plant_id,
            error_message: responseData.error_message || 'Failed to read moisture data'
          });
          console.log(`❌ Sent moisture error to client for plant ${responseData.plant_id}`);
        }
      }
      return;
    }

    // Handle ALL_MOISTURE_RESPONSE from Pi
    if (data.type === 'ALL_MOISTURE_RESPONSE') {
      const responseData = data.data || {};

      if (responseData.status === 'success') {
        console.log(`🌿 All plants moisture: ${responseData.total_plants} plants received`);
        responseData.plants?.forEach(plant => {
          console.log(`   Plant ${plant.plant_id}: moisture=${plant.moisture}%, temperature=${plant.temperature}°C`);
        });
        
        // Broadcast to all connected clients
        const { getAllUserSockets } = require('../models/userSessions');
        const userSockets = getAllUserSockets();
        
        userSockets.forEach(userSocket => {
          try {
            sendSuccess(userSocket, 'ALL_PLANTS_MOISTURE_RESPONSE', responseData);
          } catch (error) {
            console.error('Error sending moisture data to client:', error);
          }
        });
        
        console.log(`📊 Broadcasted moisture data to ${userSockets.length} connected clients`);
      } else {
        console.error(`❌ All plants moisture request failed: ${responseData.error_message}`);
      }
      return;
    }

    // Handle VALVE_STATUS_RESPONSE from Pi
    if (data.type === 'VALVE_STATUS_RESPONSE') {
      const responseData = data.data || {};
      const plantId = responseData.plant_id;

      if (responseData.error) {
        console.error(`❌ Valve status request failed for plant ${plantId}: ${responseData.error_message}`);
      } else {
        console.log(`🚰 Valve status for plant ${plantId}:`);
        console.log(`   Valve ID: ${responseData.valve_id}`);
        console.log(`   Is Blocked: ${responseData.is_blocked ? 'YES' : 'NO'}`);
        console.log(`   Is Open: ${responseData.is_open ? 'YES' : 'NO'}`);
        console.log(`   Can Irrigate: ${responseData.can_irrigate ? 'YES' : 'NO'}`);
        console.log(`   User Message: ${responseData.user_message}`);
        
        // Get pending irrigation info to notify client
        const pendingInfo = completePendingIrrigation(plantId);
        
        if (pendingInfo && pendingInfo.ws) {
          if (responseData.is_blocked) {
            sendError(pendingInfo.ws, 'VALVE_BLOCKED', {
              plant_id: plantId,
              valve_id: responseData.valve_id,
              message: responseData.user_message,
              can_irrigate: false
            });
          } else {
            sendSuccess(pendingInfo.ws, 'VALVE_STATUS', {
              plant_id: plantId,
              valve_id: responseData.valve_id,
              message: responseData.user_message,
              can_irrigate: true,
              status: responseData.status
            });
          }
        }
      }
      return;
    }

    sendError(ws, 'UNKNOWN_TYPE', `Unknown message type: ${data.type}`);
  });

  ws.on('close', () => {
    console.log('Pi disconnected: raspberrypi_main_controller');
    piSocket = null;
  });
}

function getPiSocket() {
  return piSocket;
}

module.exports = {
  getPiSocket,
  handlePiSocket
}