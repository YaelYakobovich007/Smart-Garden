#!/usr/bin/env python3
"""
Smart Garden Pi Client Entry Point

This script starts the Smart Garden Pi client with proper Python path setup.
Run this from the project root directory or anywhere on your Pi.
"""

import sys
import os
import asyncio

# Add the project root to Python path so imports work correctly
project_root = os.path.dirname(os.path.abspath(__file__))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Now we can import from the controller package
from controller.run_pi_client import main

if __name__ == "__main__":
    print("🌱 Starting Smart Garden Pi Client...")
    print(f"📂 Project root: {project_root}")
    print(f"🐍 Python path includes: {[p for p in sys.path if 'Smart-Garden' in p]}")
    
    # Run the main client
    asyncio.run(main())