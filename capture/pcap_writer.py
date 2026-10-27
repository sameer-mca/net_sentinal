import os
import glob
import datetime
import threading
from scapy.utils import PcapWriter
from config import PCAP_DIR, PCAP_MAX_MB, PCAP_MAX_FILES

class RotatingPcap:
    """
    Thread-safe rotating PCAP writer using Scapy PcapWriter.
    Automatically rotates when current file exceeds max_mb and keeps newest max_files.
    """

    def __init__(self, pcap_dir=PCAP_DIR, max_mb=PCAP_MAX_MB, max_files=PCAP_MAX_FILES):
        self.pcap_dir = os.path.abspath(pcap_dir)
        os.makedirs(self.pcap_dir, exist_ok=True)
        self.max_bytes = int(max_mb * 1024 * 1024)
        self.max_files = max_files
        self.writer = None
        self.current_file = None
        self._lock = threading.Lock()

    def _rotate_if_needed(self):
        """
        Creates a new PCAP file if none is open or if current file exceeds max_bytes.
        """
        needs_rotation = False
        if not self.writer or not self.current_file:
            needs_rotation = True
        elif os.path.exists(self.current_file) and os.path.getsize(self.current_file) >= self.max_bytes:
            needs_rotation = True

        if needs_rotation:
            if self.writer:
                try:
                    self.writer.close()
                except Exception:
                    pass

            now_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"capture_{now_str}.pcap"
            self.current_file = os.path.join(self.pcap_dir, filename)

            try:
                self.writer = PcapWriter(self.current_file, append=True, sync=False)
            except Exception as e:
                print(f"[RotatingPcap] Failed to open PCAP file {self.current_file}: {e}")
                self.writer = None
                return

            self._clean_old_files()

    def _clean_old_files(self):
        """
        Keeps only the newest max_files PCAP files in the pcap directory.
        """
        try:
            pattern = os.path.join(self.pcap_dir, "capture_*.pcap")
            files = glob.glob(pattern)
            # Sort newest first
            files.sort(key=os.path.getmtime, reverse=True)

            if len(files) > self.max_files:
                for old_file in files[self.max_files:]:
                    try:
                        os.remove(old_file)
                    except Exception as e:
                        print(f"[RotatingPcap] Could not delete old pcap {old_file}: {e}")
        except Exception as e:
            print(f"[RotatingPcap] Error during PCAP cleanup: {e}")

    def write(self, packet):
        """
        Writes a single raw packet to the active PCAP file.
        """
        with self._lock:
            try:
                self._rotate_if_needed()
                if self.writer:
                    self.writer.write(packet)
            except Exception as e:
                print(f"[RotatingPcap] Write error: {e}")

    def close(self):
        """
        Closes the active PCAP writer.
        """
        with self._lock:
            if self.writer:
                try:
                    self.writer.close()
                except Exception:
                    pass
                self.writer = None
