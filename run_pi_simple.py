#!/usr/bin/env python3
"""
Simple wrapper to run the Pi client with proper path setup
"""

import sys
import os

# Add project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# Import and run the main function
from controller.run_pi_client import main

if __name__ == "__main__":
    import asyncio
    asyncio.run(main()) 