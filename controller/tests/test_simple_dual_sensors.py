#!/usr/bin/env python3
"""
Simple Dual Sensor Test for Raspberry Pi

Based exactly on your working code, but adapted for dual sensors
on /dev/ttyUSB0 and /dev/ttyUSB1

Run with: sudo python3 controller/tests/test_simple_dual_sensors.py
"""

import asyncio
from pymodbus.client import AsyncModbusSerialClient
from pymodbus.exceptions import ModbusException

async def read_sensor(port, sensor_name):
    """Read from a single sensor - exact copy of your working code"""
    print(f"\n🧪 Testing {sensor_name} ({port}):")
    
    client = AsyncModbusSerialClient(
        port=port,          # /dev/ttyUSB0 or /dev/ttyUSB1
        baudrate=4800,
        parity='N',
        stopbits=1,
        bytesize=8,
        timeout=2,
    )

    async with client as modbus_client:
        if not modbus_client.connected:
            print(f"   ❌ Failed to connect to {port}")
            return None

        print(f"   ✅ Connected to {port}. Reading sensor data...")

        try:
            # Read 2 registers starting from address 0x0000 (exactly like your working code)
            result = await modbus_client.read_input_registers(address=0x0000, count=2, slave=1)

            if result.isError():
                print(f"   ⚠️ Modbus error: {result}")
                return None
            else:
                # Exactly like your working code
                humidity_raw = result.registers[0]
                temperature_raw = result.registers[1]

                temperature = temperature_raw / 10.0
                humidity = humidity_raw / 10.0

                print(f"   🌡️ Temperature: {temperature:.1f} °C")
                print(f"   💧 Humidity: {humidity:.1f} %")
                print(f"   ✅ {sensor_name} SUCCESS!")
                
                return {
                    "temperature": temperature,
                    "humidity": humidity,
                    "port": port
                }

        except ModbusException as e:
            print(f"   ⚠️ Modbus exception: {e}")
            return None
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return None

async def test_individual_sensors():
    """Test each sensor individually"""
    print("=" * 60)
    print("🌱 Individual Sensor Tests")
    print("=" * 60)
    
    # Test sensor 1
    result1 = await read_sensor("/dev/ttyUSB0", "Sensor 1")
    
    # Test sensor 2  
    result2 = await read_sensor("/dev/ttyUSB1", "Sensor 2")
    
    return result1, result2

async def test_simultaneous_sensors():
    """Test both sensors simultaneously"""
    print("\n" + "=" * 60)
    print("🔄 Simultaneous Sensor Test")
    print("=" * 60)
    
    print("📡 Reading from both sensors simultaneously...")
    
    # Create tasks for both sensors
    task1 = asyncio.create_task(read_sensor("/dev/ttyUSB0", "Sensor 1"))
    task2 = asyncio.create_task(read_sensor("/dev/ttyUSB1", "Sensor 2"))
    
    # Wait for both to complete
    result1, result2 = await asyncio.gather(task1, task2)
    
    print(f"\n📊 Simultaneous Results:")
    if result1:
        print(f"   ✅ Sensor 1: 💧{result1['humidity']:.1f}% 🌡️{result1['temperature']:.1f}°C")
    else:
        print(f"   ❌ Sensor 1: FAILED")
    
    if result2:
        print(f"   ✅ Sensor 2: 💧{result2['humidity']:.1f}% 🌡️{result2['temperature']:.1f}°C")
    else:
        print(f"   ❌ Sensor 2: FAILED")
    
    if result1 and result2:
        print(f"\n🎉 Both sensors working simultaneously!")
        
        # Compare readings
        humidity_diff = abs(result1['humidity'] - result2['humidity'])
        temp_diff = abs(result1['temperature'] - result2['temperature'])
        
        print(f"📈 Comparison:")
        print(f"   Humidity difference: {humidity_diff:.1f}%")
        print(f"   Temperature difference: {temp_diff:.1f}°C")
    else:
        print(f"\n❌ One or both sensors failed")
    
    return result1, result2

async def continuous_monitoring(duration=30):
    """Monitor both sensors continuously"""
    print(f"\n" + "=" * 60)
    print(f"⏱️ Continuous Monitoring ({duration} seconds)")
    print("=" * 60)
    print("Press Ctrl+C to stop early\n")
    
    import time
    from datetime import datetime
    
    start_time = time.time()
    reading_count = 0
    
    try:
        while time.time() - start_time < duration:
            timestamp = datetime.now().strftime("%H:%M:%S")
            
            # Read both sensors simultaneously
            task1 = asyncio.create_task(read_sensor_quick("/dev/ttyUSB0"))
            task2 = asyncio.create_task(read_sensor_quick("/dev/ttyUSB1"))
            
            result1, result2 = await asyncio.gather(task1, task2)
            
            # Format output line
            line = f"[{timestamp}] "
            
            if result1:
                line += f"S1: 💧{result1['humidity']:.1f}% 🌡️{result1['temperature']:.1f}°C  "
            else:
                line += f"S1: ❌FAIL  "
            
            if result2:
                line += f"S2: 💧{result2['humidity']:.1f}% 🌡️{result2['temperature']:.1f}°C"
            else:
                line += f"S2: ❌FAIL"
            
            print(line)
            reading_count += 1
            
            await asyncio.sleep(3)  # 3 seconds between readings
            
    except KeyboardInterrupt:
        print(f"\n⏹️ Monitoring stopped by user")
    
    print(f"\n📈 Monitoring completed: {reading_count} readings taken")

async def read_sensor_quick(port):
    """Quick sensor read without verbose output"""
    client = AsyncModbusSerialClient(
        port=port,
        baudrate=4800,
        parity='N',
        stopbits=1,
        bytesize=8,
        timeout=2,
    )

    try:
        async with client as modbus_client:
            if not modbus_client.connected:
                return None

            result = await modbus_client.read_input_registers(address=0x0000, count=2, slave=1)

            if result.isError():
                return None
            
            humidity_raw = result.registers[0]
            temperature_raw = result.registers[1]
            temperature = temperature_raw / 10.0
            humidity = humidity_raw / 10.0

            return {
                "temperature": temperature,
                "humidity": humidity,
                "port": port
            }

    except Exception:
        return None

async def main():
    """Main test function"""
    print("🚀 Simple Dual Sensor Test for Raspberry Pi")
    print("Based on your working code pattern")
    print(f"📅 Started: {asyncio.get_event_loop().time()}")
    
    # Test 1: Individual sensors
    result1, result2 = await test_individual_sensors()
    
    # Test 2: Simultaneous reading
    sim_result1, sim_result2 = await test_simultaneous_sensors()
    
    # Test 3: Continuous monitoring (shorter duration)
    await continuous_monitoring(duration=20)
    
    # Final summary
    print(f"\n" + "=" * 60)
    print("📋 Final Summary")
    print("=" * 60)
    
    working_sensors = 0
    if result1:
        print(f"✅ Sensor 1 (/dev/ttyUSB0): Working")
        working_sensors += 1
    else:
        print(f"❌ Sensor 1 (/dev/ttyUSB0): Failed")
    
    if result2:
        print(f"✅ Sensor 2 (/dev/ttyUSB1): Working") 
        working_sensors += 1
    else:
        print(f"❌ Sensor 2 (/dev/ttyUSB1): Failed")
    
    print(f"\n🎯 Result: {working_sensors}/2 sensors working")
    
    if working_sensors == 2:
        print(f"🎉 EXCELLENT: Both sensors fully operational!")
        print(f"\n💡 Configuration for your code:")
        print(f"   Sensor 1: port='/dev/ttyUSB0', modbus_id=1, baudrate=4800")
        print(f"   Sensor 2: port='/dev/ttyUSB1', modbus_id=1, baudrate=4800")
    elif working_sensors == 1:
        print(f"⚠️ PARTIAL: One sensor working")
    else:
        print(f"❌ FAILED: No sensors working")
        print(f"💡 Troubleshooting:")
        print(f"   • Check connections to /dev/ttyUSB0 and /dev/ttyUSB1")
        print(f"   • Run: sudo chmod 666 /dev/ttyUSB*")
        print(f"   • Verify sensors are powered")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n\n⏹️ Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test failed: {e}")