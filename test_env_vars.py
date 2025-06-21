#!/usr/bin/env python3
"""
Test script to verify environment variable integration
"""
import os
from dotenv import load_dotenv

def test_environment_variables():
    """Test that environment variables are properly loaded"""
    
    # Load environment variables
    load_dotenv()
    
    print("🔍 Testing Environment Variable Integration")
    print("=" * 50)
    
    # Test required environment variables
    required_vars = [
        'AI_AGENT_URL',
        'HOST',
        'PORT'
    ]
    
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: {value}")
        else:
            print(f"❌ {var}: Not set")
    
    # Test derived values
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    agent_url = os.getenv("AI_AGENT_URL", f"http://localhost:{port}")
    
    print("\n🔧 Derived Configuration:")
    print(f"Server will run on: {host}:{port}")
    print(f"Agent URL: {agent_url}")
    print(f"Full API endpoint: {agent_url}/api/chat")
    
    # Test Next.js environment variable
    print("\n🌐 Frontend Configuration:")
    next_public_url = os.getenv("NEXT_PUBLIC_AI_AGENT_URL")
    if next_public_url:
        print(f"✅ NEXT_PUBLIC_AI_AGENT_URL: {next_public_url}")
        print(f"Frontend will connect to: {next_public_url}/api/chat")
    else:
        print("❌ NEXT_PUBLIC_AI_AGENT_URL: Not set")
    
    print("\n" + "=" * 50)
    print("Test completed!")

if __name__ == "__main__":
    test_environment_variables()
