import os
import math
from PIL import Image, ImageDraw, ImageFont

def generate_admin_dfd():
    width = 2650
    height = 1750
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)

    # Fonts
    font_title = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 30)
    font_entity = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 22)
    font_proc_num = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 17)
    font_proc_name = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 14)
    font_ds_id = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 17)
    font_ds_name = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 14)
    font_flow = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 12)

    # 1. Title
    draw.text((width / 2, 45), "NetSentinel System – Level 1 DFD (Administrator)", fill='black', font=font_title, anchor='mm')

    # Arrowhead helper
    def arrow(tip, angle_rad, length=12, w=8):
        bx = tip[0] - length * math.cos(angle_rad)
        by = tip[1] - length * math.sin(angle_rad)
        px = (w / 2.0) * -math.sin(angle_rad)
        py = (w / 2.0) * math.cos(angle_rad)
        draw.polygon([tip, (bx + px, by + py), (bx - px, by - py)], fill='black')

    # Path helper with orthogonal lines
    def draw_path(pts, arrow_end=True, arrow_start=False, width=2):
        for i in range(len(pts) - 1):
            draw.line([pts[i], pts[i+1]], fill='black', width=width)
        if arrow_end:
            p_prev = pts[-2]
            p_last = pts[-1]
            ang = math.atan2(p_last[1] - p_prev[1], p_last[0] - p_prev[0])
            arrow(p_last, ang)
        if arrow_start:
            p_first = pts[0]
            p_next = pts[1]
            ang = math.atan2(p_first[1] - p_next[1], p_first[0] - p_next[0])
            arrow(p_first, ang)

    # Label helper
    def draw_label(text, pos, bg=True):
        bbox = draw.textbbox(pos, text, font=font_flow, anchor='mm')
        pad = 3
        if bg:
            draw.rectangle([bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad], fill='white')
        draw.text(pos, text, fill='black', font=font_flow, anchor='mm')

    # 2. External Entity: Administrator
    ent_x1, ent_y1, ent_x2, ent_y2 = 70, 700, 270, 880
    draw.rectangle([ent_x1, ent_y1, ent_x2, ent_y2], outline='black', width=2)
    draw.text(((ent_x1 + ent_x2)/2, (ent_y1 + ent_y2)/2), "Administrator", fill='black', font=font_entity, anchor='mm')

    # 3. Processes (7 circles)
    cx = 1020
    pr = 62  # radius
    processes = [
        {"id": "1.1", "name": "User\nAuthentication", "y": 140},
        {"id": "1.2", "name": "User\nManagement", "y": 360},
        {"id": "1.3", "name": "Capture Engine\nControl", "y": 580},
        {"id": "1.4", "name": "Traffic & Device\nMonitoring", "y": 800},
        {"id": "1.5", "name": "Threat Alert\nTriage", "y": 1020},
        {"id": "1.6", "name": "Detection Rules\nConfiguration", "y": 1240},
        {"id": "1.7", "name": "Security Reports\nManagement", "y": 1460},
    ]

    for p in processes:
        py = p['y']
        draw.ellipse([cx - pr, py - pr, cx + pr, py + pr], outline='black', width=2)
        draw.text((cx, py - 16), p['id'], fill='black', font=font_proc_num, anchor='mm')
        draw.text((cx, py + 12), p['name'], fill='black', font=font_proc_name, anchor='mm', align='center')

    # 4. Data Stores (Right Side)
    ds_x = 2050
    ds_w = 300
    ds_h = 60

    data_stores = {
        "D1": {"name": "Users & Sessions", "y": 250},
        "D6": {"name": "Capture Settings", "y": 580},
        "D2": {"name": "Network Traffic", "y": 740},
        "D4": {"name": "Device Inventory", "y": 860},
        "D3": {"name": "Threat Alerts", "y": 1020},
        "D5": {"name": "Detection Rules", "y": 1240},
        "D7": {"name": "Security Reports", "y": 1500},
    }

    for ds_id, ds in data_stores.items():
        dy = ds['y']
        # Gane & Sarson open-ended box (top, left, bottom lines; right open)
        draw.line([(ds_x + ds_w, dy - ds_h/2), (ds_x, dy - ds_h/2), (ds_x, dy + ds_h/2), (ds_x + ds_w, dy + ds_h/2)], fill='black', width=2)
        # Vertical divider inside box
        draw.line([(ds_x + 65, dy - ds_h/2), (ds_x + 65, dy + ds_h/2)], fill='black', width=2)
        draw.text((ds_x + 32, dy), ds_id, fill='black', font=font_ds_id, anchor='mm')
        draw.text((ds_x + 65 + (ds_w - 65)/2, dy), ds['name'], fill='black', font=font_ds_name, anchor='mm')

    # 5. Connectors & Flows: Left Side (Administrator <-> Processes)
    # P1.1: User Authentication
    draw_path([(200, ent_y1), (200, 120), (cx - pr, 120)], arrow_end=True)
    draw_label("Login Credentials (email, password)", ((200 + cx - pr)/2, 108))

    draw_path([(cx - pr, 160), (140, 160), (140, ent_y1)], arrow_end=True)
    draw_label("Authentication Response (JWT token, admin role)", ((140 + cx - pr)/2, 172))

    # P1.2: User Management
    draw_path([(230, ent_y1), (230, 340), (cx - pr, 340)], arrow_end=True)
    draw_label("User Management Details (create, role update, delete)", ((230 + cx - pr)/2, 328))

    draw_path([(cx - pr, 380), (170, 380), (170, ent_y1)], arrow_end=True)
    draw_label("Operation Result & User Catalog", ((170 + cx - pr)/2, 392))

    # P1.3: Capture Engine Control
    draw_path([(260, ent_y1), (260, 560), (cx - pr, 560)], arrow_end=True)
    draw_label("Capture Commands (start/stop, mode, interface, attack simulation)", ((260 + cx - pr)/2, 548))

    draw_path([(cx - pr, 600), (320, 600), (320, 720), (ent_x2, 720)], arrow_end=True)
    draw_label("Capture Engine Status & Available Interfaces", ((320 + cx - pr)/2, 612))

    # P1.4: Traffic & Device Monitoring (directly horizontal)
    draw_path([(ent_x2, 780), (cx - pr, 780)], arrow_end=True)
    draw_label("Traffic Query Filters & Device Label Updates (hostname, type)", ((ent_x2 + cx - pr)/2, 768))

    draw_path([(cx - pr, 820), (ent_x2, 820)], arrow_end=True)
    draw_label("Live Packet Stream, Traffic Analytics & Device Inventory with Risk Scores", ((ent_x2 + cx - pr)/2, 832))

    # P1.5: Threat Alert Triage
    draw_path([(ent_x2, 860), (320, 860), (320, 1000), (cx - pr, 1000)], arrow_end=True)
    draw_label("Alert Query Criteria & Status Updates (acknowledge, resolve)", ((320 + cx - pr)/2, 988))

    draw_path([(cx - pr, 1040), (250, 1040), (250, ent_y2)], arrow_end=True)
    draw_label("Threat Alerts List, Severity Summary & Triage Confirmation", ((250 + cx - pr)/2, 1052))

    # P1.6: Detection Rules Configuration
    draw_path([(220, ent_y2), (220, 1220), (cx - pr, 1220)], arrow_end=True)
    draw_label("Rule Tuning Parameters (threshold, window) & Toggle Commands", ((220 + cx - pr)/2, 1208))

    draw_path([(cx - pr, 1260), (180, 1260), (180, ent_y2)], arrow_end=True)
    draw_label("Detection Rules List, Validation Status & Rule State", ((180 + cx - pr)/2, 1272))

    # P1.7: Security Reports Management
    draw_path([(150, ent_y2), (150, 1440), (cx - pr, 1440)], arrow_end=True)
    draw_label("Report Generation Request (type, format, range) & Delete Request", ((150 + cx - pr)/2, 1428))

    draw_path([(cx - pr, 1480), (110, 1480), (110, ent_y2)], arrow_end=True)
    draw_label("System-Wide Reports Catalog, File Download (PDF/CSV) & Status", ((110 + cx - pr)/2, 1492))

    # 6. Connectors & Flows: Right Side (Processes <-> Data Stores)
    # P1.1 <-> D1 Users & Sessions
    draw_path([(cx + pr, 120), (1600, 120), (1600, data_stores["D1"]["y"] - 15), (ds_x, data_stores["D1"]["y"] - 15)], arrow_end=True)
    draw_label("Credentials Query & Session Verification", (1500, 108))

    draw_path([(ds_x, data_stores["D1"]["y"] + 15), (1550, data_stores["D1"]["y"] + 15), (1550, 160), (cx + pr, 160)], arrow_end=True)
    draw_label("User Records, Password Hash & Session State", (1500, 172))

    # P1.2 <-> D1 Users & Sessions
    draw_path([(cx + pr, 340), (1650, 340), (1650, data_stores["D1"]["y"] - 5), (ds_x, data_stores["D1"]["y"] - 5)], arrow_end=True)
    draw_label("User Data Updates (insert, update role, delete)", (1500, 328))

    draw_path([(ds_x, data_stores["D1"]["y"] + 25), (1700, data_stores["D1"]["y"] + 25), (1700, 380), (cx + pr, 380)], arrow_end=True)
    draw_label("User Catalog & Profile Records", (1500, 392))

    # P1.3 <-> D6 Capture Settings (100% strictly horizontal)
    draw_path([(cx + pr, 565), (ds_x, 565)], arrow_end=True)
    draw_label("Capture State Updates (is_running, mode, interface)", ((cx + pr + ds_x)/2, 553))

    draw_path([(ds_x, 595), (cx + pr, 595)], arrow_end=True)
    draw_label("Current Capture Configuration & Sensor State", ((cx + pr + ds_x)/2, 607))

    # P1.4 <-> D2 Network Traffic & D4 Device Inventory (Orthogonal)
    # D2 -> P1.4 (Traffic)
    draw_path([(ds_x, data_stores["D2"]["y"]), (1600, data_stores["D2"]["y"]), (1600, 780), (cx + pr, 780)], arrow_end=True)
    draw_label("Captured Packet Records & Protocol Data", (1500, 768))

    # D4 -> P1.4 (Device read)
    draw_path([(ds_x, data_stores["D4"]["y"] - 12), (1550, data_stores["D4"]["y"] - 12), (1550, 810), (cx + pr, 810)], arrow_end=True)
    draw_label("Device Inventory Records & Risk Metrics", (1500, 822))

    # P1.4 -> D4 (Device label update)
    draw_path([(cx + pr, 830), (1650, 830), (1650, data_stores["D4"]["y"] + 12), (ds_x, data_stores["D4"]["y"] + 12)], arrow_end=True)
    draw_label("Updated Hostname & Device Type Classifications", (1500, 842))

    # P1.5 <-> D3 Threat Alerts (100% strictly horizontal)
    draw_path([(ds_x, 1005), (cx + pr, 1005)], arrow_end=True)
    draw_label("Threat Alert Records & Incident Details", ((cx + pr + ds_x)/2, 993))

    draw_path([(cx + pr, 1035), (ds_x, 1035)], arrow_end=True)
    draw_label("Alert Status Changes (acknowledged, resolved)", ((cx + pr + ds_x)/2, 1047))

    # P1.6 <-> D5 Detection Rules (100% strictly horizontal)
    draw_path([(cx + pr, 1225), (ds_x, 1225)], arrow_end=True)
    draw_label("Updated Threshold Values, Time Windows & Active Toggles", ((cx + pr + ds_x)/2, 1213))

    draw_path([(ds_x, 1255), (cx + pr, 1255)], arrow_end=True)
    draw_label("Detection Rule Configurations & Threshold Settings", ((cx + pr + ds_x)/2, 1267))

    # P1.7 <-> D7 Security Reports
    # Reads from D2, D3, D4 for report compilation via clean bus on the right
    # D2 -> P1.7
    draw_path([(ds_x + ds_w, data_stores["D2"]["y"]), (2440, data_stores["D2"]["y"]), (2440, 1380), (cx + pr, 1380)], arrow_end=True)
    draw_label("Traffic Logs (for reports)", (1700, 1368))

    # D3 -> P1.7
    draw_path([(ds_x + ds_w, data_stores["D3"]["y"]), (2410, data_stores["D3"]["y"]), (2410, 1405), (cx + pr, 1405)], arrow_end=True)
    draw_label("Alert Records (for reports)", (1750, 1393))

    # D4 -> P1.7
    draw_path([(ds_x + ds_w, data_stores["D4"]["y"]), (2380, data_stores["D4"]["y"]), (2380, 1430), (cx + pr, 1430)], arrow_end=True)
    draw_label("Device Stats (for reports)", (1800, 1418))

    # P1.7 -> D7 (insert report file & metadata)
    draw_path([(cx + pr, 1475), (ds_x, data_stores["D7"]["y"] - 12)], arrow_end=True)
    draw_label("Generated Report File & Report Metadata (insert)", ((cx + pr + ds_x)/2, 1463))

    # D7 -> P1.7 (read report records & file stream)
    draw_path([(ds_x, data_stores["D7"]["y"] + 12), (cx + pr, 1515)], arrow_end=True)
    draw_label("All System Report Records & Stored File Data (download / delete)", ((cx + pr + ds_x)/2, 1527))

    # Save PNG
    out_path = 'd:/netsentinel/dfd-level-1-admin.png'
    img.save(out_path)
    print(f"Admin DFD generated at: {out_path}")

if __name__ == '__main__':
    generate_admin_dfd()
