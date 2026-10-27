import sys
import time
import signal
from config import API_URL
from engine import Engine

def print_banner(engine):
    print("=" * 64)
    print("   NetSentinel Packet Capture & Intrusion Detection Service")
    print("=" * 64)
    print(f"Ingest Target API : {API_URL}")
    print(f"Available Network Interfaces ({len(engine.interfaces)}):")
    for iface in engine.interfaces[:10]:
        print(f"  * {iface.get('name')}: {iface.get('description')}")
    if len(engine.interfaces) > 10:
        print(f"  ... and {len(engine.interfaces) - 10} more interfaces")
    print("=" * 64)
    print("Service initialized. Listening for backend control commands...")
    print("Press Ctrl+C to terminate cleanly.")
    print("=" * 64)

def main():
    engine = Engine()
    print_banner(engine)

    def handle_signal(sig, frame):
        print("\nShutdown signal received.")
        engine.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    engine.start()

    # Keep main thread alive
    try:
        while True:
            time.sleep(1.0)
    except KeyboardInterrupt:
        handle_signal(None, None)

if __name__ == "__main__":
    main()
