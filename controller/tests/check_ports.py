"""
Check Available USB Ports

This script helps you see what USB ports are available on your system.
"""

import os
import subprocess

def check_available_ports():
    """Check what USB ports are available"""
    print("🔍 Checking Available USB Ports")
    print("=" * 40)
    
    # Common port patterns
    port_patterns = [
        "/dev/ttyUSB*",
        "/dev/ttyACM*", 
        "/dev/ttyS*",
        "/dev/tty*"
    ]
    
    available_ports = []
    
    for pattern in port_patterns:
        try:
            # Use glob to find matching ports
            import glob
            ports = glob.glob(pattern)
            if ports:
                print(f"📋 Found ports matching {pattern}:")
                for port in sorted(ports):
                    print(f"   {port}")
                    available_ports.append(port)
                print()
        except Exception as e:
            print(f"❌ Error checking {pattern}: {e}")
    
    # Also try using ls command
    try:
        print("📋 Using 'ls /dev/tty*' command:")
        result = subprocess.run(['ls', '/dev/tty*'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            ports = result.stdout.strip().split('\n')
            for port in sorted(ports):
                if port:  # Skip empty lines
                    print(f"   {port}")
                    if port not in available_ports:
                        available_ports.append(port)
        else:
            print(f"   Command failed: {result.stderr}")
    except Exception as e:
        print(f"   Error running ls command: {e}")
    
    print(f"\n📊 Summary:")
    print(f"   Total available ports: {len(available_ports)}")
    
    if available_ports:
        print(f"   Available ports: {', '.join(sorted(available_ports))}")
        
        # Categorize ports
        usb_ports = [p for p in available_ports if 'USB' in p]
        acm_ports = [p for p in available_ports if 'ACM' in p]
        serial_ports = [p for p in available_ports if 'ttyS' in p]
        
        if usb_ports:
            print(f"   USB ports: {', '.join(sorted(usb_ports))}")
        if acm_ports:
            print(f"   ACM ports: {', '.join(sorted(acm_ports))}")
        if serial_ports:
            print(f"   Serial ports: {', '.join(sorted(serial_ports))}")
    else:
        print("   ❌ No ports found!")
    
    return available_ports

def check_port_permissions():
    """Check permissions for common ports"""
    print(f"\n🔐 Checking Port Permissions")
    print("=" * 40)
    
    common_ports = [
        "/dev/ttyUSB0",
        "/dev/ttyUSB1", 
        "/dev/ttyACM0",
        "/dev/ttyACM1"
    ]
    
    for port in common_ports:
        if os.path.exists(port):
            try:
                # Get file info
                stat_info = os.stat(port)
                mode = stat_info.st_mode
                
                # Check permissions
                user_read = bool(mode & 0o400)
                user_write = bool(mode & 0o200)
                
                print(f"   {port}:")
                print(f"      Exists: ✅")
                print(f"      User read: {'✅' if user_read else '❌'}")
                print(f"      User write: {'✅' if user_write else '❌'}")
                
                if not user_read or not user_write:
                    print(f"      ⚠️  You may need to add user to dialout group:")
                    print(f"         sudo usermod -a -G dialout $USER")
                    print(f"         Then log out and back in")
                
            except Exception as e:
                print(f"   {port}: ❌ Error checking permissions: {e}")
        else:
            print(f"   {port}: ❌ Does not exist")

def main():
    """Main function"""
    print("🚀 USB Port Detection Tool")
    print("=" * 50)
    
    # Check available ports
    available_ports = check_available_ports()
    
    # Check permissions
    check_port_permissions()
    
    print(f"\n💡 Tips:")
    print(f"   1. Your first sensor works on /dev/ttyUSB0 with Modbus ID 1")
    print(f"   2. Your second sensor might be on a different port or have a different Modbus ID")
    print(f"   3. Common second sensor locations:")
    print(f"      - Same port (/dev/ttyUSB0) but different Modbus ID (0 or 2)")
    print(f"      - Different port (/dev/ttyUSB1, /dev/ttyACM0) with same Modbus ID (1)")
    print(f"   4. Run the find_second_sensor.py script to test all combinations")
    
    print(f"\n🎉 Port detection completed!")
    print(f"\n📝 Next step: Run 'python controller/tests/find_second_sensor.py'")

if __name__ == "__main__":
    main() 