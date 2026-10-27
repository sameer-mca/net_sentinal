import os
import math
from PIL import Image, ImageDraw, ImageFont

def get_font(name, size):
    fonts = {
        'bold': 'C:/Windows/Fonts/segoeuib.ttf',
        'regular': 'C:/Windows/Fonts/segoeui.ttf',
        'semibold': 'C:/Windows/Fonts/seguisb.ttf',
    }
    path = fonts.get(name, fonts['regular'])
    if not os.path.exists(path):
        path = 'C:/Windows/Fonts/arial.ttf'
    return ImageFont.truetype(path, size)

def circle_x(cx, cy, pr, y, side='left'):
    dy = abs(y - cy)
    if dy >= pr:
        dx = 0
    else:
        dx = math.sqrt(pr * pr - dy * dy)
    return cx - dx if side == 'left' else cx + dx

def arrow(draw, tip, angle_rad, length=11, w=7):
    bx = tip[0] - length * math.cos(angle_rad)
    by = tip[1] - length * math.sin(angle_rad)
    px = (w / 2.0) * -math.sin(angle_rad)
    py = (w / 2.0) * math.cos(angle_rad)
    draw.polygon([tip, (bx + px, by + py), (bx - px, by - py)], fill='black')

def draw_path(draw, pts, arrow_end=True, arrow_start=False, width=2):
    for i in range(len(pts) - 1):
        draw.line([pts[i], pts[i+1]], fill='black', width=width)
    if arrow_end:
        p_prev = pts[-2]
        p_last = pts[-1]
        ang = math.atan2(p_last[1] - p_prev[1], p_last[0] - p_prev[0])
        arrow(draw, p_last, ang)
    if arrow_start:
        p_first = pts[0]
        p_next = pts[1]
        ang = math.atan2(p_first[1] - p_next[1], p_first[0] - p_next[0])
        arrow(draw, p_first, ang)

def draw_label(draw, text, pos, font, bg=True):
    bbox = draw.textbbox(pos, text, font=font, anchor='mm')
    pad_x = 5
    pad_y = 3
    if bg:
        draw.rectangle([bbox[0] - pad_x, bbox[1] - pad_y, bbox[2] + pad_x, bbox[3] + pad_y], fill='white')
    draw.text(pos, text, fill='black', font=font, anchor='mm')


# ==============================================================================
# 1. ADMIN LEVEL 1 DFD GENERATION
# ==============================================================================
def generate_admin_dfd(output_path):
    width = 2750
    height = 1800
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)

    font_title = get_font('bold', 32)
    font_entity = get_font('bold', 22)
    font_proc_num = get_font('bold', 18)
    font_proc_name = get_font('bold', 14)
    font_ds_id = get_font('bold', 17)
    font_ds_name = get_font('regular', 14)
    font_flow = get_font('semibold', 12)

    # Title
    draw.text((width / 2, 45), "NetSentinel System – Level 1 DFD (Administrator)", fill='black', font=font_title, anchor='mm')

    # External Entity: Administrator
    ent_x1, ent_y1, ent_x2, ent_y2 = 70, 710, 270, 890
    draw.rectangle([ent_x1, ent_y1, ent_x2, ent_y2], outline='black', width=2)
    draw.text(((ent_x1 + ent_x2)/2, (ent_y1 + ent_y2)/2), "Administrator", fill='black', font=font_entity, anchor='mm')

    # Processes (7 Circles)
    cx = 1040
    pr = 68
    processes = [
        {"id": "1.1", "name": "User\nAuthentication", "y": 140},
        {"id": "1.2", "name": "User Account\nAdministration", "y": 360},
        {"id": "1.3", "name": "Capture Engine\nControl", "y": 580},
        {"id": "1.4", "name": "Traffic & Device\nMonitoring", "y": 800},
        {"id": "1.5", "name": "Threat Alert\nTriage", "y": 1020},
        {"id": "1.6", "name": "Detection Rules\nConfiguration", "y": 1240},
        {"id": "1.7", "name": "Security Reports\nManagement", "y": 1480},
    ]

    for p in processes:
        py = p['y']
        draw.ellipse([cx - pr, py - pr, cx + pr, py + pr], outline='black', width=2)
        draw.text((cx, py - 18), p['id'], fill='black', font=font_proc_num, anchor='mm')
        draw.text((cx, py + 12), p['name'], fill='black', font=font_proc_name, anchor='mm', align='center')

    # Data Stores (Right Side)
    ds_x = 2080
    ds_w = 260
    ds_h = 60
    data_stores = {
        "D1": {"name": "Users & Sessions", "y": 250},
        "D6": {"name": "Capture Settings", "y": 580},
        "D2": {"name": "Network Traffic", "y": 740},
        "D4": {"name": "Device Inventory", "y": 860},
        "D3": {"name": "Threat Alerts", "y": 1020},
        "D5": {"name": "Detection Rules", "y": 1240},
        "D7": {"name": "Security Reports", "y": 1510},
    }

    for ds_id, ds in data_stores.items():
        dy = ds['y']
        draw.line([(ds_x + ds_w, dy - ds_h/2), (ds_x, dy - ds_h/2), (ds_x, dy + ds_h/2), (ds_x + ds_w, dy + ds_h/2)], fill='black', width=2)
        draw.line([(ds_x + 65, dy - ds_h/2), (ds_x + 65, dy + ds_h/2)], fill='black', width=2)
        draw.text((ds_x + 32, dy), ds_id, fill='black', font=font_ds_id, anchor='mm')
        draw.text((ds_x + 65 + (ds_w - 65)/2, dy), ds['name'], fill='black', font=font_ds_name, anchor='mm')

    # --- LEFT SIDE FLOWS (Administrator <-> Processes) ---
    # P1.1: User Authentication
    y_in = 115
    px_in = circle_x(cx, 140, pr, y_in, 'left')
    draw_path(draw, [(200, ent_y1), (200, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Login Credentials (email, password)", ((200 + px_in)/2, y_in - 10), font_flow)

    y_out = 165
    px_out = circle_x(cx, 140, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (140, y_out), (140, ent_y1)], arrow_end=True)
    draw_label(draw, "Authentication Response (JWT token, admin role)", ((140 + px_out)/2, y_out + 12), font_flow)

    # P1.2: User Management
    y_in = 335
    px_in = circle_x(cx, 360, pr, y_in, 'left')
    draw_path(draw, [(230, ent_y1), (230, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "User Management Details (create, role update, delete)", ((230 + px_in)/2, y_in - 10), font_flow)

    y_out = 385
    px_out = circle_x(cx, 360, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (170, y_out), (170, ent_y1)], arrow_end=True)
    draw_label(draw, "Operation Result & User Catalog", ((170 + px_out)/2, y_out + 12), font_flow)

    # P1.3: Capture Engine Control
    y_in = 555
    px_in = circle_x(cx, 580, pr, y_in, 'left')
    draw_path(draw, [(260, ent_y1), (260, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Capture Commands (start/stop, mode, interface, attack simulation)", ((260 + px_in)/2, y_in - 10), font_flow)

    y_out = 605
    px_out = circle_x(cx, 580, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (320, y_out), (320, 730), (ent_x2, 730)], arrow_end=True)
    draw_label(draw, "Capture Engine Status & Available Interfaces", ((320 + px_out)/2, y_out + 12), font_flow)

    # P1.4: Traffic & Device Monitoring (directly horizontal)
    y_in = 780
    px_in = circle_x(cx, 800, pr, y_in, 'left')
    draw_path(draw, [(ent_x2, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Traffic Query Filters & Device Label Updates (hostname, type)", ((ent_x2 + px_in)/2, y_in - 10), font_flow)

    y_out = 820
    px_out = circle_x(cx, 800, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (ent_x2, y_out)], arrow_end=True)
    draw_label(draw, "Live Packet Stream, Traffic Analytics & Device Inventory with Risk Scores", ((ent_x2 + px_out)/2, y_out + 12), font_flow)

    # P1.5: Threat Alert Triage
    y_in = 1000
    px_in = circle_x(cx, 1020, pr, y_in, 'left')
    draw_path(draw, [(ent_x2, 870), (320, 870), (320, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Alert Query Criteria & Status Updates (acknowledge, resolve)", ((320 + px_in)/2, y_in - 10), font_flow)

    y_out = 1040
    px_out = circle_x(cx, 1020, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (250, y_out), (250, ent_y2)], arrow_end=True)
    draw_label(draw, "Threat Alerts List, Severity Summary & Triage Confirmation", ((250 + px_out)/2, y_out + 12), font_flow)

    # P1.6: Detection Rules Configuration
    y_in = 1220
    px_in = circle_x(cx, 1240, pr, y_in, 'left')
    draw_path(draw, [(220, ent_y2), (220, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Rule Tuning Parameters (threshold, window) & Toggle Commands", ((220 + px_in)/2, y_in - 10), font_flow)

    y_out = 1260
    px_out = circle_x(cx, 1240, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (180, y_out), (180, ent_y2)], arrow_end=True)
    draw_label(draw, "Detection Rules List, Validation Status & Rule State", ((180 + px_out)/2, y_out + 12), font_flow)

    # P1.7: Security Reports Management
    y_in = 1460
    px_in = circle_x(cx, 1480, pr, y_in, 'left')
    draw_path(draw, [(150, ent_y2), (150, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Report Generation Request (type, format, range) & Delete Request", ((150 + px_in)/2, y_in - 10), font_flow)

    y_out = 1500
    px_out = circle_x(cx, 1480, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (110, y_out), (110, ent_y2)], arrow_end=True)
    draw_label(draw, "System-Wide Reports Catalog, File Download (PDF/CSV) & Status", ((110 + px_out)/2, y_out + 12), font_flow)

    # --- RIGHT SIDE FLOWS (Processes <-> Data Stores) ---
    # P1.1 <-> D1 Users & Sessions
    y_p11_to_d1 = 115
    px11_r1 = circle_x(cx, 140, pr, y_p11_to_d1, 'right')
    draw_path(draw, [(px11_r1, y_p11_to_d1), (1600, y_p11_to_d1), (1600, data_stores["D1"]["y"] - 15), (ds_x, data_stores["D1"]["y"] - 15)], arrow_end=True)
    draw_label(draw, "Credentials Query & Session Verification", ((px11_r1 + 1600)/2, y_p11_to_d1 - 10), font_flow)

    y_d1_to_p11 = 165
    px11_r2 = circle_x(cx, 140, pr, y_d1_to_p11, 'right')
    draw_path(draw, [(ds_x, data_stores["D1"]["y"] + 15), (1550, data_stores["D1"]["y"] + 15), (1550, y_d1_to_p11), (px11_r2, y_d1_to_p11)], arrow_end=True)
    draw_label(draw, "User Records, Password Hash & Session State", ((px11_r2 + 1550)/2, y_d1_to_p11 + 12), font_flow)

    # P1.2 <-> D1 Users & Sessions
    y_p12_to_d1 = 335
    px12_r1 = circle_x(cx, 360, pr, y_p12_to_d1, 'right')
    draw_path(draw, [(px12_r1, y_p12_to_d1), (1650, y_p12_to_d1), (1650, data_stores["D1"]["y"] - 5), (ds_x, data_stores["D1"]["y"] - 5)], arrow_end=True)
    draw_label(draw, "User Data Updates (insert, update role, delete)", ((px12_r1 + 1650)/2, y_p12_to_d1 - 10), font_flow)

    y_d1_to_p12 = 385
    px12_r2 = circle_x(cx, 360, pr, y_d1_to_p12, 'right')
    draw_path(draw, [(ds_x, data_stores["D1"]["y"] + 25), (1700, data_stores["D1"]["y"] + 25), (1700, y_d1_to_p12), (px12_r2, y_d1_to_p12)], arrow_end=True)
    draw_label(draw, "User Catalog & Profile Records", ((px12_r2 + 1700)/2, y_d1_to_p12 + 12), font_flow)

    # P1.3 <-> D6 Capture Settings (100% Horizontal)
    y_p13_to_d6 = 565
    px13_r1 = circle_x(cx, 580, pr, y_p13_to_d6, 'right')
    draw_path(draw, [(px13_r1, y_p13_to_d6), (ds_x, y_p13_to_d6)], arrow_end=True)
    draw_label(draw, "Capture State Updates (is_running, mode, interface)", ((px13_r1 + ds_x)/2, y_p13_to_d6 - 10), font_flow)

    y_d6_to_p13 = 595
    px13_r2 = circle_x(cx, 580, pr, y_d6_to_p13, 'right')
    draw_path(draw, [(ds_x, y_d6_to_p13), (px13_r2, y_d6_to_p13)], arrow_end=True)
    draw_label(draw, "Current Capture Configuration & Sensor State", ((px13_r2 + ds_x)/2, y_d6_to_p13 + 12), font_flow)

    # P1.4 <-> D2 Network Traffic & D4 Device Inventory
    # D2 -> P1.4
    y_d2_to_p14 = 780
    px14_r1 = circle_x(cx, 800, pr, y_d2_to_p14, 'right')
    draw_path(draw, [(ds_x, data_stores["D2"]["y"]), (1600, data_stores["D2"]["y"]), (1600, y_d2_to_p14), (px14_r1, y_d2_to_p14)], arrow_end=True)
    draw_label(draw, "Captured Packet Records & Protocol Data", ((px14_r1 + 1600)/2, y_d2_to_p14 - 10), font_flow)

    # D4 -> P1.4
    y_d4_to_p14 = 810
    px14_r2 = circle_x(cx, 800, pr, y_d4_to_p14, 'right')
    draw_path(draw, [(ds_x, data_stores["D4"]["y"] - 12), (1550, data_stores["D4"]["y"] - 12), (1550, y_d4_to_p14), (px14_r2, y_d4_to_p14)], arrow_end=True)
    draw_label(draw, "Device Inventory Records & Risk Metrics", ((px14_r2 + 1550)/2, y_d4_to_p14 - 10), font_flow)

    # P1.4 -> D4
    y_p14_to_d4 = 835
    px14_r3 = circle_x(cx, 800, pr, y_p14_to_d4, 'right')
    draw_path(draw, [(px14_r3, y_p14_to_d4), (1650, y_p14_to_d4), (1650, data_stores["D4"]["y"] + 12), (ds_x, data_stores["D4"]["y"] + 12)], arrow_end=True)
    draw_label(draw, "Updated Hostname & Device Type Classifications", ((px14_r3 + 1650)/2, y_p14_to_d4 + 12), font_flow)

    # P1.5 <-> D3 Threat Alerts (100% Horizontal)
    y_d3_to_p15 = 1005
    px15_r1 = circle_x(cx, 1020, pr, y_d3_to_p15, 'right')
    draw_path(draw, [(ds_x, y_d3_to_p15), (px15_r1, y_d3_to_p15)], arrow_end=True)
    draw_label(draw, "Threat Alert Records & Incident Details", ((px15_r1 + ds_x)/2, y_d3_to_p15 - 10), font_flow)

    y_p15_to_d3 = 1035
    px15_r2 = circle_x(cx, 1020, pr, y_p15_to_d3, 'right')
    draw_path(draw, [(px15_r2, y_p15_to_d3), (ds_x, y_p15_to_d3)], arrow_end=True)
    draw_label(draw, "Alert Status Changes (acknowledged, resolved)", ((px15_r2 + ds_x)/2, y_p15_to_d3 + 12), font_flow)

    # P1.6 <-> D5 Detection Rules (100% Horizontal)
    y_p16_to_d5 = 1225
    px16_r1 = circle_x(cx, 1240, pr, y_p16_to_d5, 'right')
    draw_path(draw, [(px16_r1, y_p16_to_d5), (ds_x, y_p16_to_d5)], arrow_end=True)
    draw_label(draw, "Updated Threshold Values, Time Windows & Active Toggles", ((px16_r1 + ds_x)/2, y_p16_to_d5 - 10), font_flow)

    y_d5_to_p16 = 1255
    px16_r2 = circle_x(cx, 1240, pr, y_d5_to_p16, 'right')
    draw_path(draw, [(ds_x, y_d5_to_p16), (px16_r2, y_d5_to_p16)], arrow_end=True)
    draw_label(draw, "Detection Rule Configurations & Threshold Settings", ((px16_r2 + ds_x)/2, y_d5_to_p16 + 12), font_flow)

    # P1.7 <-> D7 Security Reports
    # Reads from D2, D3, D4 for report compilation via buses outside data stores
    bus_d2 = 2540
    bus_d3 = 2490
    bus_d4 = 2440

    # D2 -> P1.7
    y_d2_rep = 1425
    px17_r1 = circle_x(cx, 1480, pr, y_d2_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D2"]["y"]), (bus_d2, data_stores["D2"]["y"]), (bus_d2, y_d2_rep), (px17_r1, y_d2_rep)], arrow_end=True)
    draw_label(draw, "Traffic Logs (for reports)", ((px17_r1 + ds_x)/2, y_d2_rep - 10), font_flow)

    # D3 -> P1.7
    y_d3_rep = 1450
    px17_r2 = circle_x(cx, 1480, pr, y_d3_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D3"]["y"]), (bus_d3, data_stores["D3"]["y"]), (bus_d3, y_d3_rep), (px17_r2, y_d3_rep)], arrow_end=True)
    draw_label(draw, "Alert Records (for reports)", ((px17_r2 + ds_x)/2, y_d3_rep - 10), font_flow)

    # D4 -> P1.7
    y_d4_rep = 1475
    px17_r3 = circle_x(cx, 1480, pr, y_d4_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D4"]["y"]), (bus_d4, data_stores["D4"]["y"]), (bus_d4, y_d4_rep), (px17_r3, y_d4_rep)], arrow_end=True)
    draw_label(draw, "Device Stats (for reports)", ((px17_r3 + ds_x)/2, y_d4_rep - 10), font_flow)

    # P1.7 -> D7 (insert report file & metadata)
    y_p17_to_d7 = 1500
    px17_r4 = circle_x(cx, 1480, pr, y_p17_to_d7, 'right')
    draw_path(draw, [(px17_r4, y_p17_to_d7), (ds_x, y_p17_to_d7)], arrow_end=True)
    draw_label(draw, "Generated Report File & Report Metadata (insert)", ((px17_r4 + ds_x)/2, y_p17_to_d7 - 10), font_flow)

    # D7 -> P1.7 (read report records & file stream)
    y_d7_to_p17 = 1530
    px17_r5 = circle_x(cx, 1480, pr, y_d7_to_p17, 'right')
    draw_path(draw, [(ds_x, y_d7_to_p17), (px17_r5, y_d7_to_p17)], arrow_end=True)
    draw_label(draw, "All System Report Records & Stored File Data (download / delete)", ((px17_r5 + ds_x)/2, y_d7_to_p17 + 12), font_flow)

    # Save
    img.save(output_path)
    print(f"[Admin DFD] Generated successfully at: {output_path}")


# ==============================================================================
# 2. NORMAL USER LEVEL 1 DFD GENERATION
# ==============================================================================
def generate_user_dfd(output_path):
    width = 2750
    height = 1600
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)

    font_title = get_font('bold', 32)
    font_entity = get_font('bold', 22)
    font_proc_num = get_font('bold', 18)
    font_proc_name = get_font('bold', 14)
    font_ds_id = get_font('bold', 17)
    font_ds_name = get_font('regular', 14)
    font_flow = get_font('semibold', 12)

    # Title
    draw.text((width / 2, 45), "NetSentinel System – Level 1 DFD (Normal User)", fill='black', font=font_title, anchor='mm')

    # External Entity: Normal User
    ent_x1, ent_y1, ent_x2, ent_y2 = 70, 620, 270, 800
    draw.rectangle([ent_x1, ent_y1, ent_x2, ent_y2], outline='black', width=2)
    draw.text(((ent_x1 + ent_x2)/2, (ent_y1 + ent_y2)/2 - 12), "Normal User", fill='black', font=font_entity, anchor='mm')
    draw.text(((ent_x1 + ent_x2)/2, (ent_y1 + ent_y2)/2 + 15), "(Security Analyst)", fill='black', font=get_font('regular', 14), anchor='mm')

    # Processes (5 Circles)
    cx = 1040
    pr = 68
    processes = [
        {"id": "1.1", "name": "User Registration\n& Authentication", "y": 160},
        {"id": "1.2", "name": "Live Traffic &\nDevice Monitoring", "y": 440},
        {"id": "1.3", "name": "Threat Alerts\nInspection", "y": 710},
        {"id": "1.4", "name": "Detection Rules &\nSensor Viewing", "y": 980},
        {"id": "1.5", "name": "User Reports\nManagement", "y": 1270},
    ]

    for p in processes:
        py = p['y']
        draw.ellipse([cx - pr, py - pr, cx + pr, py + pr], outline='black', width=2)
        draw.text((cx, py - 18), p['id'], fill='black', font=font_proc_num, anchor='mm')
        draw.text((cx, py + 12), p['name'], fill='black', font=font_proc_name, anchor='mm', align='center')

    # Data Stores (Right Side)
    ds_x = 2080
    ds_w = 260
    ds_h = 60
    data_stores = {
        "D1": {"name": "Users & Sessions", "y": 160},
        "D2": {"name": "Network Traffic", "y": 400},
        "D4": {"name": "Device Inventory", "y": 500},
        "D3": {"name": "Threat Alerts", "y": 710},
        "D5": {"name": "Detection Rules", "y": 940},
        "D6": {"name": "Capture Settings", "y": 1030},
        "D7": {"name": "Security Reports (Owned)", "y": 1300},
    }

    for ds_id, ds in data_stores.items():
        dy = ds['y']
        draw.line([(ds_x + ds_w, dy - ds_h/2), (ds_x, dy - ds_h/2), (ds_x, dy + ds_h/2), (ds_x + ds_w, dy + ds_h/2)], fill='black', width=2)
        draw.line([(ds_x + 65, dy - ds_h/2), (ds_x + 65, dy + ds_h/2)], fill='black', width=2)
        draw.text((ds_x + 32, dy), ds_id, fill='black', font=font_ds_id, anchor='mm')
        draw.text((ds_x + 65 + (ds_w - 65)/2, dy), ds['name'], fill='black', font=font_ds_name, anchor='mm')

    # --- LEFT SIDE FLOWS (Normal User <-> Processes) ---
    # P1.1: Registration & Authentication
    y_in = 135
    px_in = circle_x(cx, 160, pr, y_in, 'left')
    draw_path(draw, [(200, ent_y1), (200, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Registration Details (name, email, password) / Login Credentials", ((200 + px_in)/2, y_in - 10), font_flow)

    y_out = 185
    px_out = circle_x(cx, 160, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (140, y_out), (140, ent_y1)], arrow_end=True)
    draw_label(draw, "Registration Confirmation / Auth Response (JWT token, user role)", ((140 + px_out)/2, y_out + 12), font_flow)

    # P1.2: Traffic & Device Monitoring (Read-Only)
    y_in = 415
    px_in = circle_x(cx, 440, pr, y_in, 'left')
    draw_path(draw, [(240, ent_y1), (240, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Traffic Filter Criteria (protocol, IP, port, date) & Device Query", ((240 + px_in)/2, y_in - 10), font_flow)

    y_out = 465
    px_out = circle_x(cx, 440, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (180, y_out), (180, ent_y1)], arrow_end=True)
    draw_label(draw, "Live Packet Stream, Protocol Distribution & Device Inventory with Risk Metrics", ((180 + px_out)/2, y_out + 12), font_flow)

    # P1.3: Threat Alerts Inspection (Read-Only, strictly horizontal)
    y_in = 690
    px_in = circle_x(cx, 710, pr, y_in, 'left')
    draw_path(draw, [(ent_x2, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Alert Filter Query (severity, alert type, source IP)", ((ent_x2 + px_in)/2, y_in - 10), font_flow)

    y_out = 730
    px_out = circle_x(cx, 710, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (ent_x2, y_out)], arrow_end=True)
    draw_label(draw, "Threat Alerts List, Severity Breakdown & Incident Details (Read-Only)", ((ent_x2 + px_out)/2, y_out + 12), font_flow)

    # P1.4: Detection Rules & Sensor Viewing (Read-Only)
    y_in = 955
    px_in = circle_x(cx, 980, pr, y_in, 'left')
    draw_path(draw, [(230, ent_y2), (230, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Rules & Sensor Query Requests (thresholds, status)", ((230 + px_in)/2, y_in - 10), font_flow)

    y_out = 1005
    px_out = circle_x(cx, 980, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (180, y_out), (180, ent_y2)], arrow_end=True)
    draw_label(draw, "Active Detection Rule Thresholds, Time Windows & Sensor Online State", ((180 + px_out)/2, y_out + 12), font_flow)

    # P1.5: User Reports Management (Ownership-Restricted)
    y_in = 1245
    px_in = circle_x(cx, 1270, pr, y_in, 'left')
    draw_path(draw, [(140, ent_y2), (140, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Report Generation Request (type, format, range) & Download/Delete Own Report", ((140 + px_in)/2, y_in - 10), font_flow)

    y_out = 1295
    px_out = circle_x(cx, 1270, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (100, y_out), (100, ent_y2)], arrow_end=True)
    draw_label(draw, "User-Owned Reports List, PDF/CSV File Download & Deletion Status", ((100 + px_out)/2, y_out + 12), font_flow)

    # --- RIGHT SIDE FLOWS (Processes <-> Data Stores) ---
    # P1.1 <-> D1 Users & Sessions
    y_p11_to_d1 = 145
    px11_r1 = circle_x(cx, 160, pr, y_p11_to_d1, 'right')
    draw_path(draw, [(px11_r1, y_p11_to_d1), (ds_x, y_p11_to_d1)], arrow_end=True)
    draw_label(draw, "New User Account Registration (role='user') & Session Token", ((px11_r1 + ds_x)/2, y_p11_to_d1 - 10), font_flow)

    y_d1_to_p11 = 175
    px11_r2 = circle_x(cx, 160, pr, y_d1_to_p11, 'right')
    draw_path(draw, [(ds_x, y_d1_to_p11), (px11_r2, y_d1_to_p11)], arrow_end=True)
    draw_label(draw, "User Profile & Session Validation Records", ((px11_r2 + ds_x)/2, y_d1_to_p11 + 12), font_flow)

    # P1.2 <-> D2 Network Traffic & D4 Device Inventory (Read-Only)
    y_d2_to_p12 = 425
    px12_r1 = circle_x(cx, 440, pr, y_d2_to_p12, 'right')
    draw_path(draw, [(ds_x, data_stores["D2"]["y"]), (1600, data_stores["D2"]["y"]), (1600, y_d2_to_p12), (px12_r1, y_d2_to_p12)], arrow_end=True)
    draw_label(draw, "Captured Packet Logs & Traffic Volume Data", ((px12_r1 + 1600)/2, y_d2_to_p12 - 10), font_flow)

    y_d4_to_p12 = 455
    px12_r2 = circle_x(cx, 440, pr, y_d4_to_p12, 'right')
    draw_path(draw, [(ds_x, data_stores["D4"]["y"]), (1550, data_stores["D4"]["y"]), (1550, y_d4_to_p12), (px12_r2, y_d4_to_p12)], arrow_end=True)
    draw_label(draw, "Device Inventory Records & Risk Scores (Read-Only)", ((px12_r2 + 1550)/2, y_d4_to_p12 + 12), font_flow)

    # P1.3 <-> D3 Threat Alerts (Read-Only, 100% Horizontal)
    y_d3_to_p13 = 710
    px13_r = circle_x(cx, 710, pr, y_d3_to_p13, 'right')
    draw_path(draw, [(ds_x, y_d3_to_p13), (px13_r, y_d3_to_p13)], arrow_end=True)
    draw_label(draw, "Threat Alert Records & Incident Information (Read-Only)", ((px13_r + ds_x)/2, y_d3_to_p13 - 10), font_flow)

    # P1.4 <-> D5 Detection Rules & D6 Capture Settings (Read-Only)
    y_d5_to_p14 = 965
    px14_r1 = circle_x(cx, 980, pr, y_d5_to_p14, 'right')
    draw_path(draw, [(ds_x, data_stores["D5"]["y"]), (1600, data_stores["D5"]["y"]), (1600, y_d5_to_p14), (px14_r1, y_d5_to_p14)], arrow_end=True)
    draw_label(draw, "Active Detection Rule Configurations & Threshold Values (Read-Only)", ((px14_r1 + 1600)/2, y_d5_to_p14 - 10), font_flow)

    y_d6_to_p14 = 995
    px14_r2 = circle_x(cx, 980, pr, y_d6_to_p14, 'right')
    draw_path(draw, [(ds_x, data_stores["D6"]["y"]), (1550, data_stores["D6"]["y"]), (1550, y_d6_to_p14), (px14_r2, y_d6_to_p14)], arrow_end=True)
    draw_label(draw, "Capture Engine Status & Active Network Interface Info (Read-Only)", ((px14_r2 + 1550)/2, y_d6_to_p14 + 12), font_flow)

    # P1.5 <-> D7 Security Reports (User-Owned)
    # Reads from D2, D3, D4 for report compilation via buses outside data stores
    bus_d2 = 2540
    bus_d3 = 2490
    bus_d4 = 2440

    # D2 -> P1.5
    y_d2_rep = 1215
    px15_r1 = circle_x(cx, 1270, pr, y_d2_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D2"]["y"]), (bus_d2, data_stores["D2"]["y"]), (bus_d2, y_d2_rep), (px15_r1, y_d2_rep)], arrow_end=True)
    draw_label(draw, "Traffic Data (for user report compilation)", ((px15_r1 + ds_x)/2, y_d2_rep - 10), font_flow)

    # D3 -> P1.5
    y_d3_rep = 1240
    px15_r2 = circle_x(cx, 1270, pr, y_d3_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D3"]["y"]), (bus_d3, data_stores["D3"]["y"]), (bus_d3, y_d3_rep), (px15_r2, y_d3_rep)], arrow_end=True)
    draw_label(draw, "Alert Records (for user report compilation)", ((px15_r2 + ds_x)/2, y_d3_rep - 10), font_flow)

    # D4 -> P1.5
    y_d4_rep = 1265
    px15_r3 = circle_x(cx, 1270, pr, y_d4_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D4"]["y"]), (bus_d4, data_stores["D4"]["y"]), (bus_d4, y_d4_rep), (px15_r3, y_d4_rep)], arrow_end=True)
    draw_label(draw, "Device Metrics (for user report compilation)", ((px15_r3 + ds_x)/2, y_d4_rep - 10), font_flow)

    # P1.5 -> D7 (insert user report file & metadata with user_id)
    y_p15_to_d7 = 1290
    px15_r4 = circle_x(cx, 1270, pr, y_p15_to_d7, 'right')
    draw_path(draw, [(px15_r4, y_p15_to_d7), (ds_x, y_p15_to_d7)], arrow_end=True)
    draw_label(draw, "User-Owned Report Metadata (linked to user_id) & File Storage", ((px15_r4 + ds_x)/2, y_p15_to_d7 - 10), font_flow)

    # D7 -> P1.5 (read user's own reports only)
    y_d7_to_p15 = 1320
    px15_r5 = circle_x(cx, 1270, pr, y_d7_to_p15, 'right')
    draw_path(draw, [(ds_x, y_d7_to_p15), (px15_r5, y_d7_to_p15)], arrow_end=True)
    draw_label(draw, "User Report Records (WHERE user_id = current_user) & File Stream", ((px15_r5 + ds_x)/2, y_d7_to_p15 + 12), font_flow)

    # Save
    img.save(output_path)
    print(f"[User DFD] Generated successfully at: {output_path}")


if __name__ == '__main__':
    admin_png = 'd:/netsentinel/dfd-level-1-admin.png'
    user_png = 'd:/netsentinel/dfd-level-1-user.png'
    generate_admin_dfd(admin_png)
    generate_user_dfd(user_png)
