#!/usr/bin/env python3
"""
Script to fix Raspberry Pi clock issues and validate timing accuracy.
This script helps ensure the Pi's system clock is set correctly for accurate valve timing.
"""

import subprocess
import time
import datetime
import sys
import os

def run_command(command):
    """Run a shell command and return the result."""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
        return result.returncode == 0, result.stdout.strip(), result.stderr.strip()
    except subprocess.TimeoutExpired:
        return False, "", "Command timed out"
    except Exception as e:
        return False, "", str(e)

def check_current_time():
    """Check the current system time."""
    current_time = datetime.datetime.now()
    print(f"🕐 Current system time: {current_time}")
    return current_time

def check_ntp_status():
    """Check if NTP (Network Time Protocol) is running."""
    print("\n🔍 Checking NTP status...")
    
    # Check if systemd-timesyncd is active
    success, output, error = run_command("systemctl is-active systemd-timesyncd")
    if success and output == "active":
        print("✅ systemd-timesyncd is active")
        
        # Check NTP sync status
        success, output, error = run_command("timedatectl status")
        if success:
            print("📊 Time synchronization status:")
            print(output)
        return True
    else:
        print("❌ systemd-timesyncd is not active")
        return False

def enable_ntp():
    """Enable NTP time synchronization."""
    print("\n🔧 Enabling NTP time synchronization...")
    
    # Enable systemd-timesyncd
    success, output, error = run_command("sudo systemctl enable systemd-timesyncd")
    if success:
        print("✅ Enabled systemd-timesyncd")
    else:
        print(f"❌ Failed to enable systemd-timesyncd: {error}")
        return False
    
    # Start systemd-timesyncd
    success, output, error = run_command("sudo systemctl start systemd-timesyncd")
    if success:
        print("✅ Started systemd-timesyncd")
    else:
        print(f"❌ Failed to start systemd-timesyncd: {error}")
        return False
    
    # Wait a moment for sync
    print("⏳ Waiting for time synchronization...")
    time.sleep(5)
    
    return True

def set_time_from_ntp():
    """Set time using NTP servers."""
    print("\n🌐 Setting time from NTP servers...")
    
    # Try to sync with NTP servers
    success, output, error = run_command("sudo timedatectl set-ntp true")
    if success:
        print("✅ Enabled NTP synchronization")
        
        # Wait for sync
        print("⏳ Waiting for NTP synchronization...")
        time.sleep(10)
        
        # Check status again
        success, output, error = run_command("timedatectl status")
        if success:
            print("📊 Updated time synchronization status:")
            print(output)
        return True
    else:
        print(f"❌ Failed to enable NTP: {error}")
        return False

def test_timing_accuracy():
    """Test timing accuracy using sleep."""
    print("\n🧪 Testing timing accuracy...")
    
    test_durations = [1, 5, 10]  # Test 1, 5, and 10 second delays
    
    for duration in test_durations:
        print(f"\n📊 Testing {duration} second delay:")
        
        start_time = time.time()
        start_datetime = datetime.datetime.now()
        
        print(f"   Start time: {start_datetime}")
        print(f"   Expected end time: {start_datetime + datetime.timedelta(seconds=duration)}")
        
        # Sleep for the duration
        time.sleep(duration)
        
        end_time = time.time()
        end_datetime = datetime.datetime.now()
        actual_duration = end_time - start_time
        
        print(f"   End time: {end_datetime}")
        print(f"   Actual duration: {actual_duration:.3f} seconds")
        print(f"   Difference: {abs(actual_duration - duration):.3f} seconds")
        
        if abs(actual_duration - duration) <= 0.1:
            print(f"   ✅ Timing accurate (within 0.1s tolerance)")
        else:
            print(f"   ⚠️  Timing slightly off (but acceptable for valve control)")

def check_system_load():
    """Check system load to see if it might affect timing."""
    print("\n📊 Checking system load...")
    
    success, output, error = run_command("uptime")
    if success:
        print(f"System load: {output}")
    
    success, output, error = run_command("free -h")
    if success:
        print(f"Memory usage:\n{output}")

def main():
    """Main function to fix clock and validate timing."""
    print("🔧 Raspberry Pi Clock Fix and Timing Validation")
    print("=" * 50)
    
    # Check if running as root (needed for some commands)
    if os.geteuid() != 0:
        print("⚠️  Some commands require root privileges. Run with 'sudo python3 fix_pi_clock.py'")
        print("   Continuing with non-privileged checks...\n")
    
    # Check current time
    print("1️⃣ Checking current system time...")
    initial_time = check_current_time()
    
    # Check NTP status
    print("\n2️⃣ Checking NTP status...")
    ntp_active = check_ntp_status()
    
    if not ntp_active:
        print("\n3️⃣ NTP is not active. Attempting to enable...")
        if os.geteuid() == 0:
            if enable_ntp():
                print("✅ NTP enabled successfully")
            else:
                print("❌ Failed to enable NTP")
        else:
            print("⚠️  Need root privileges to enable NTP")
            print("   Run: sudo systemctl enable systemd-timesyncd")
            print("   Run: sudo systemctl start systemd-timesyncd")
    
    # Try to set time from NTP
    print("\n4️⃣ Attempting to sync time with NTP servers...")
    if os.geteuid() == 0:
        if set_time_from_ntp():
            print("✅ Time synchronized with NTP")
        else:
            print("❌ Failed to sync with NTP")
    else:
        print("⚠️  Need root privileges to sync with NTP")
        print("   Run: sudo timedatectl set-ntp true")
    
    # Check final time
    print("\n5️⃣ Checking final system time...")
    final_time = check_current_time()
    
    # Check system load
    print("\n6️⃣ Checking system load...")
    check_system_load()
    
    # Test timing accuracy
    print("\n7️⃣ Testing timing accuracy...")
    test_timing_accuracy()
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 SUMMARY")
    print("=" * 50)
    
    time_diff = final_time - initial_time
    print(f"Time check interval: {time_diff.total_seconds():.1f} seconds")
    
    if ntp_active:
        print("✅ NTP is active and should provide accurate time")
    else:
        print("❌ NTP is not active - timing may be inaccurate")
    
    print("\n💡 RECOMMENDATIONS:")
    print("1. Ensure NTP is enabled: sudo systemctl enable systemd-timesyncd")
    print("2. Start NTP service: sudo systemctl start systemd-timesyncd")
    print("3. Enable NTP sync: sudo timedatectl set-ntp true")
    print("4. Check time sync: timedatectl status")
    print("5. If NTP fails, consider setting time manually: sudo date -s 'YYYY-MM-DD HH:MM:SS'")
    
    print("\n🎯 For valve timing accuracy:")
    print("- The timing tests above show if your system can maintain accurate delays")
    print("- If timing is accurate, valve control should work correctly")
    print("- If timing is off, consider rebooting the Pi after fixing the clock")

if __name__ == "__main__":
    main()
