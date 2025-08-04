"""
Test pymodbus parameters to find the correct way to specify slave ID
"""

import asyncio
import sys
import os
import inspect

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pymodbus.client import AsyncModbusSerialClient

async def test_pymodbus_parameters():
    """Test different ways to specify slave ID"""
    print("🔍 Testing pymodbus parameters")
    print("=" * 50)
    
    # Check the function signature
    client = AsyncModbusSerialClient(
        port="/dev/ttyUSB0",
        baudrate=4800,
        parity='N',
        stopbits=1,
        bytesize=8,
        timeout=1,
    )
    
    print("📋 read_input_registers function signature:")
    sig = inspect.signature(client.read_input_registers)
    print(f"   {sig}")
    
    print("\n📋 Available parameters:")
    for param_name, param in sig.parameters.items():
        print(f"   {param_name}: {param.default if param.default != inspect.Parameter.empty else 'required'}")
    
    # Try different approaches
    print("\n🧪 Testing different parameter combinations:")
    
    async with client as modbus_client:
        if not modbus_client.connected:
            print("❌ Could not connect to test client")
            return
        
        try:
            # Method 1: No slave parameter
            print("\n1️⃣  Testing without slave parameter:")
            result1 = await modbus_client.read_input_registers(address=1, count=2)
            print(f"   ✅ Success: {result1}")
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        try:
            # Method 2: With slave parameter
            print("\n2️⃣  Testing with slave parameter:")
            result2 = await modbus_client.read_input_registers(address=1, count=2, slave=1)
            print(f"   ✅ Success: {result2}")
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        try:
            # Method 3: With unit parameter
            print("\n3️⃣  Testing with unit parameter:")
            result3 = await modbus_client.read_input_registers(address=1, count=2, unit=1)
            print(f"   ✅ Success: {result3}")
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        try:
            # Method 4: With kwargs
            print("\n4️⃣  Testing with kwargs:")
            result4 = await modbus_client.read_input_registers(address=1, count=2, **{"slave": 1})
            print(f"   ✅ Success: {result4}")
            
        except Exception as e:
            print(f"   ❌ Error: {e}")

async def main():
    """Main function"""
    print("🚀 pymodbus Parameter Test")
    print("=" * 60)
    
    await test_pymodbus_parameters()
    
    print(f"\n🎉 Parameter test completed!")

if __name__ == "__main__":
    asyncio.run(main()) 