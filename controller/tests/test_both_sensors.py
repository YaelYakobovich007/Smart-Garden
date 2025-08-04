#!/usr/bin/env python3
"""
Test Both Sensors - Connection and Reading Test

This script tests both sensors based on your discovered configuration:
- Sensor 1: /dev/ttyUSB0, Modbus ID: 1
- Sensor 2: /dev/ttyUSB1, Modbus ID: 1

Run with: sudo python3 controller/tests/test_both_sensors.py
"""

import asyncio
import time
import os
from datetime import datetime
from controller.hardware.sensors.sensor import Sensor

class DualSensorTester:
    """Test both sensors with comprehensive diagnostics"""
    
    def __init__(self):
        # Your discovered sensor configurations
        self.sensor_1_config = {
            "name": "Sensor 1",
            "modbus_id": 1,
            "port": "/dev/ttyUSB0",
            "baudrate": 4800
        }
        
        self.sensor_2_config = {
            "name": "Sensor 2", 
            "modbus_id": 1,
            "port": "/dev/ttyUSB1",
            "baudrate": 4800
        }
        
        self.sensor_1 = None
        self.sensor_2 = None

    def print_header(self, title):
        """Print formatted header"""
        print(f"\n{'='*60}")
        print(f"🌱 {title}")
        print(f"{'='*60}")

    def print_section(self, title):
        """Print formatted section"""
        print(f"\n{'─'*40}")
        print(f"📋 {title}")
        print(f"{'─'*40}")

    async def check_prerequisites(self):
        """Check if ports exist and have proper permissions"""
        self.print_section("Prerequisites Check")
        
        all_good = True
        
        for config in [self.sensor_1_config, self.sensor_2_config]:
            port = config["port"]
            name = config["name"]
            
            print(f"\n🔌 Checking {name} ({port}):")
            
            # Check if port exists
            if os.path.exists(port):
                print(f"   ✅ Port exists: {port}")
                
                # Check permissions
                try:
                    with open(port, 'r') as f:
                        print(f"   ✅ Port accessible for reading")
                except PermissionError:
                    print(f"   ❌ Permission denied - try: sudo chmod 666 {port}")
                    all_good = False
                except Exception as e:
                    print(f"   ⚠️  Port check warning: {e}")
                    
            else:
                print(f"   ❌ Port does not exist: {port}")
                all_good = False
        
        if all_good:
            print(f"\n✅ All prerequisites passed!")
        else:
            print(f"\n❌ Some prerequisites failed. Fix issues above.")
            
        return all_good

    async def initialize_sensors(self):
        """Initialize both sensor objects"""
        self.print_section("Sensor Initialization")
        
        try:
            # Initialize sensor 1
            self.sensor_1 = Sensor(
                simulation_mode=False,
                modbus_id=self.sensor_1_config["modbus_id"],
                port=self.sensor_1_config["port"],
                baudrate=self.sensor_1_config["baudrate"]
            )
            print(f"✅ {self.sensor_1_config['name']} initialized")
            
            # Initialize sensor 2
            self.sensor_2 = Sensor(
                simulation_mode=False,
                modbus_id=self.sensor_2_config["modbus_id"],
                port=self.sensor_2_config["port"],
                baudrate=self.sensor_2_config["baudrate"]
            )
            print(f"✅ {self.sensor_2_config['name']} initialized")
            
            return True
            
        except Exception as e:
            print(f"❌ Sensor initialization failed: {e}")
            return False

    async def test_individual_sensors(self):
        """Test each sensor individually"""
        self.print_section("Individual Sensor Tests")
        
        results = {}
        
        for sensor, config in [(self.sensor_1, self.sensor_1_config), 
                              (self.sensor_2, self.sensor_2_config)]:
            
            name = config["name"]
            print(f"\n🧪 Testing {name}:")
            print(f"   Port: {config['port']}")
            print(f"   Modbus ID: {config['modbus_id']}")
            print(f"   Baudrate: {config['baudrate']}")
            
            try:
                # Test reading
                print(f"   📡 Reading data...")
                reading = await sensor.read()
                
                if reading is not None:
                    if isinstance(reading, tuple) and len(reading) == 2:
                        moisture, temperature = reading
                        print(f"   ✅ SUCCESS!")
                        print(f"      💧 Moisture: {moisture:.1f}%")
                        print(f"      🌡️  Temperature: {temperature:.1f}°C")
                        
                        results[name] = {
                            "status": "success",
                            "moisture": moisture,
                            "temperature": temperature,
                            "config": config
                        }
                    else:
                        print(f"   ⚠️  Unexpected reading format: {reading}")
                        results[name] = {
                            "status": "warning",
                            "reading": reading,
                            "config": config
                        }
                else:
                    print(f"   ❌ FAILED - No reading received")
                    results[name] = {
                        "status": "failed",
                        "config": config
                    }
                    
            except Exception as e:
                print(f"   ❌ ERROR: {e}")
                results[name] = {
                    "status": "error",
                    "error": str(e),
                    "config": config
                }
        
        return results

    async def test_simultaneous_reading(self):
        """Test reading from both sensors simultaneously"""
        self.print_section("Simultaneous Reading Test")
        
        try:
            print("📡 Reading from both sensors simultaneously...")
            
            # Read from both sensors at the same time
            start_time = time.time()
            
            task1 = asyncio.create_task(self.sensor_1.read())
            task2 = asyncio.create_task(self.sensor_2.read())
            
            reading_1, reading_2 = await asyncio.gather(task1, task2)
            
            end_time = time.time()
            duration = end_time - start_time
            
            print(f"⏱️  Total time: {duration:.2f} seconds")
            
            # Process results
            print(f"\n📊 Results:")
            
            if reading_1 is not None:
                if isinstance(reading_1, tuple):
                    m1, t1 = reading_1
                    print(f"   {self.sensor_1_config['name']}: 💧 {m1:.1f}% 🌡️ {t1:.1f}°C")
                else:
                    print(f"   {self.sensor_1_config['name']}: {reading_1}")
            else:
                print(f"   {self.sensor_1_config['name']}: ❌ FAILED")
            
            if reading_2 is not None:
                if isinstance(reading_2, tuple):
                    m2, t2 = reading_2
                    print(f"   {self.sensor_2_config['name']}: 💧 {m2:.1f}% 🌡️ {t2:.1f}°C")
                else:
                    print(f"   {self.sensor_2_config['name']}: {reading_2}")
            else:
                print(f"   {self.sensor_2_config['name']}: ❌ FAILED")
            
            # Check if both worked
            both_working = reading_1 is not None and reading_2 is not None
            
            if both_working:
                print(f"\n✅ Both sensors working simultaneously!")
                
                # Compare readings if both are tuples
                if isinstance(reading_1, tuple) and isinstance(reading_2, tuple):
                    m1, t1 = reading_1
                    m2, t2 = reading_2
                    
                    moisture_diff = abs(m1 - m2)
                    temp_diff = abs(t1 - t2)
                    
                    print(f"\n📈 Comparison:")
                    print(f"   Moisture difference: {moisture_diff:.1f}%")
                    print(f"   Temperature difference: {temp_diff:.1f}°C")
                    
                    if moisture_diff > 20:
                        print(f"   ⚠️  Large moisture difference - sensors in different conditions")
                    if temp_diff > 5:
                        print(f"   ⚠️  Large temperature difference - check sensor placement")
            else:
                print(f"\n❌ One or both sensors failed")
            
            return both_working, reading_1, reading_2
            
        except Exception as e:
            print(f"❌ Simultaneous reading failed: {e}")
            return False, None, None

    async def continuous_monitoring_test(self, duration_seconds=30, interval_seconds=5):
        """Test continuous monitoring from both sensors"""
        self.print_section(f"Continuous Monitoring Test ({duration_seconds}s)")
        
        print(f"📊 Monitoring both sensors for {duration_seconds} seconds")
        print(f"⏱️  Reading interval: {interval_seconds} seconds")
        print(f"🔄 Starting monitoring...\n")
        
        readings_log = []
        start_time = time.time()
        
        try:
            while time.time() - start_time < duration_seconds:
                timestamp = datetime.now().strftime("%H:%M:%S")
                
                # Read from both sensors
                task1 = asyncio.create_task(self.sensor_1.read())
                task2 = asyncio.create_task(self.sensor_2.read())
                
                reading_1, reading_2 = await asyncio.gather(task1, task2)
                
                # Format output
                line = f"[{timestamp}] "
                
                if reading_1 and isinstance(reading_1, tuple):
                    m1, t1 = reading_1
                    line += f"S1: 💧{m1:.1f}% 🌡️{t1:.1f}°C  "
                else:
                    line += f"S1: ❌FAIL  "
                
                if reading_2 and isinstance(reading_2, tuple):
                    m2, t2 = reading_2
                    line += f"S2: 💧{m2:.1f}% 🌡️{t2:.1f}°C"
                else:
                    line += f"S2: ❌FAIL"
                
                print(line)
                
                # Log the reading
                readings_log.append({
                    "timestamp": timestamp,
                    "sensor_1": reading_1,
                    "sensor_2": reading_2
                })
                
                # Wait for next reading
                await asyncio.sleep(interval_seconds)
                
        except KeyboardInterrupt:
            print(f"\n⏹️  Monitoring stopped by user")
        
        # Summary
        successful_readings = len([r for r in readings_log 
                                 if r["sensor_1"] is not None and r["sensor_2"] is not None])
        total_readings = len(readings_log)
        
        print(f"\n📈 Monitoring Summary:")
        print(f"   Total readings: {total_readings}")
        print(f"   Successful (both sensors): {successful_readings}")
        print(f"   Success rate: {(successful_readings/total_readings*100):.1f}%" if total_readings > 0 else "   Success rate: 0%")
        
        return readings_log

    async def generate_report(self, individual_results, simultaneous_result, continuous_log):
        """Generate final test report"""
        self.print_section("Final Test Report")
        
        print(f"📋 Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        print(f"\n🔧 Configuration:")
        print(f"   {self.sensor_1_config['name']}: {self.sensor_1_config['port']} (ID: {self.sensor_1_config['modbus_id']})")
        print(f"   {self.sensor_2_config['name']}: {self.sensor_2_config['port']} (ID: {self.sensor_2_config['modbus_id']})")
        
        print(f"\n📊 Individual Tests:")
        for name, result in individual_results.items():
            status = result["status"]
            if status == "success":
                print(f"   ✅ {name}: Working (💧{result['moisture']:.1f}% 🌡️{result['temperature']:.1f}°C)")
            else:
                print(f"   ❌ {name}: {status.title()}")
        
        simultaneous_working, _, _ = simultaneous_result
        print(f"\n🔄 Simultaneous Test:")
        print(f"   {'✅ Both sensors work together' if simultaneous_working else '❌ Simultaneous reading failed'}")
        
        if continuous_log:
            successful = len([r for r in continuous_log if r["sensor_1"] and r["sensor_2"]])
            total = len(continuous_log)
            print(f"\n⏱️  Continuous Monitoring:")
            print(f"   Success rate: {(successful/total*100):.1f}% ({successful}/{total})" if total > 0 else "   No readings")
        
        # Overall status
        all_individual_working = all(r["status"] == "success" for r in individual_results.values())
        
        print(f"\n🎯 Overall Status:")
        if all_individual_working and simultaneous_working:
            print(f"   ✅ EXCELLENT: Both sensors fully operational!")
            print(f"   💡 Ready for production use")
        elif all_individual_working:
            print(f"   ⚠️  GOOD: Individual sensors work, check simultaneous operation")
        else:
            print(f"   ❌ ISSUES: Some sensors not working properly")
            print(f"   🔧 Check connections and configurations")

    async def run_full_test(self):
        """Run complete test suite"""
        self.print_header("Dual Sensor Connection & Reading Test")
        
        print(f"🚀 Starting comprehensive sensor test...")
        print(f"📅 Test started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Step 1: Prerequisites
        if not await self.check_prerequisites():
            print(f"\n❌ Prerequisites failed. Please fix issues and try again.")
            return
        
        # Step 2: Initialize sensors
        if not await self.initialize_sensors():
            print(f"\n❌ Sensor initialization failed.")
            return
        
        # Step 3: Individual tests
        individual_results = await self.test_individual_sensors()
        
        # Step 4: Simultaneous test
        simultaneous_result = await self.test_simultaneous_reading()
        
        # Step 5: Continuous monitoring (shorter for testing)
        continuous_log = await self.continuous_monitoring_test(duration_seconds=20, interval_seconds=3)
        
        # Step 6: Generate report
        await self.generate_report(individual_results, simultaneous_result, continuous_log)
        
        self.print_header("Test Completed")
        print(f"🎉 All tests finished!")
        print(f"\n💡 Usage tips:")
        print(f"   • Run with: sudo python3 controller/tests/test_both_sensors.py")
        print(f"   • For continuous monitoring: Ctrl+C to stop")
        print(f"   • Check permissions if sensors fail: sudo chmod 666 /dev/ttyUSB*")

async def main():
    """Main function"""
    tester = DualSensorTester()
    await tester.run_full_test()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n\n⏹️  Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test failed with error: {e}")