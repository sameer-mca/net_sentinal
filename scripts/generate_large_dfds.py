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

def arrow(draw, tip, angle_rad, length=14, w=9):
    bx = tip[0] - length * math.cos(angle_rad)
    by = tip[1] - length * math.sin(angle_rad)
    px = (w / 2.0) * -math.sin(angle_rad)
    py = (w / 2.0) * math.cos(angle_rad)
    draw.polygon([tip, (bx + px, by + py), (bx - px, by - py)], fill='black')

def draw_path(draw, pts, arrow_end=True, arrow_start=False, width=3):
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
    pad_x = 6
    pad_y = 3
    if bg:
        draw.rectangle([bbox[0] - pad_x, bbox[1] - pad_y, bbox[2] + pad_x, bbox[3] + pad_y], fill='white')
    draw.text(pos, text, fill='black', font=font, anchor='mm')


# ==============================================================================
# 1. ADMIN LEVEL 1 DFD GENERATION (LARGE PROMINENT TEXT)
# ==============================================================================
def generate_admin_dfd_large(output_path):
    width = 2400
    height = 1950
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)

    font_title = get_font('bold', 38)
    font_entity = get_font('bold', 26)
    font_proc_num = get_font('bold', 22)
    font_proc_name = get_font('bold', 15)
    font_ds_id = get_font('bold', 22)
    font_ds_name = get_font('semibold', 16)
    font_flow = get_font('semibold', 15)

    # Title
    draw.text((width / 2, 45), "NetSentinel System – Level 1 DFD (Administrator)", fill='black', font=font_title, anchor='mm')

    # External Entity: Administrator
    ent_x1, ent_y1, ent_x2, ent_y2 = 50, 780, 260, 980
    draw.rectangle([ent_x1, ent_y1, ent_x2, ent_y2], outline='black', width=3)
    draw.text(((ent_x1 + ent_x2)/2, (ent_y1 + ent_y2)/2), "Administrator", fill='black', font=font_entity, anchor='mm')

    # Processes (7 Circles)
    cx = 960
    pr = 82
    processes = [
        {"id": "1.1", "name": "User\nAuthentication", "y": 150},
        {"id": "1.2", "name": "User Account\nAdministration", "y": 390},
        {"id": "1.3", "name": "Capture Engine\nControl", "y": 630},
        {"id": "1.4", "name": "Traffic & Device\nMonitoring", "y": 870},
        {"id": "1.5", "name": "Threat Alert\nTriage", "y": 1110},
        {"id": "1.6", "name": "Detection Rules\nConfiguration", "y": 1350},
        {"id": "1.7", "name": "Security Reports\nManagement", "y": 1610},
    ]

    for p in processes:
        py = p['y']
        draw.ellipse([cx - pr, py - pr, cx + pr, py + pr], outline='black', width=3)
        draw.text((cx, py - 20), p['id'], fill='black', font=font_proc_num, anchor='mm')
        draw.text((cx, py + 14), p['name'], fill='black', font=font_proc_name, anchor='mm', align='center')

    # Data Stores (Right Side)
    ds_x = 1840
    ds_w = 280
    ds_h = 72
    data_stores = {
        "D1": {"name": "Users & Sessions", "y": 270},
        "D6": {"name": "Capture Settings", "y": 630},
        "D2": {"name": "Network Traffic", "y": 800},
        "D4": {"name": "Device Inventory", "y": 940},
        "D3": {"name": "Threat Alerts", "y": 1110},
        "D5": {"name": "Detection Rules", "y": 1350},
        "D7": {"name": "Security Reports", "y": 1640},
    }

    for ds_id, ds in data_stores.items():
        dy = ds['y']
        draw.line([(ds_x + ds_w, dy - ds_h/2), (ds_x, dy - ds_h/2), (ds_x, dy + ds_h/2), (ds_x + ds_w, dy + ds_h/2)], fill='black', width=3)
        draw.line([(ds_x + 72, dy - ds_h/2), (ds_x + 72, dy + ds_h/2)], fill='black', width=3)
        draw.text((ds_x + 36, dy), ds_id, fill='black', font=font_ds_id, anchor='mm')
        draw.text((ds_x + 72 + (ds_w - 72)/2, dy), ds['name'], fill='black', font=font_ds_name, anchor='mm')

    # --- LEFT SIDE FLOWS (Administrator <-> Processes) ---
    # P1.1: User Authentication
    y_in = 116
    px_in = circle_x(cx, 150, pr, y_in, 'left')
    draw_path(draw, [(200, ent_y1), (200, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Login Credentials (email, password)", ((200 + px_in)/2, y_in - 14), font_flow)

    y_out = 184
    px_out = circle_x(cx, 150, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (140, y_out), (140, ent_y1)], arrow_end=True)
    draw_label(draw, "Authentication Response (JWT token, admin role)", ((140 + px_out)/2, y_out + 14), font_flow)

    # P1.2: User Management
    y_in = 356
    px_in = circle_x(cx, 390, pr, y_in, 'left')
    draw_path(draw, [(240, ent_y1), (240, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "User Management Details (create, role update, delete)", ((240 + px_in)/2, y_in - 14), font_flow)

    y_out = 424
    px_out = circle_x(cx, 390, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (180, y_out), (180, ent_y1)], arrow_end=True)
    draw_label(draw, "Operation Result & User Catalog", ((180 + px_out)/2, y_out + 14), font_flow)

    # P1.3: Capture Engine Control
    y_in = 596
    px_in = circle_x(cx, 630, pr, y_in, 'left')
    draw_path(draw, [(260, ent_y1), (260, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Capture Commands (start/stop, mode, interface, attack simulation)", ((260 + px_in)/2, y_in - 14), font_flow)

    y_out = 664
    px_out = circle_x(cx, 630, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (320, y_out), (320, 800), (ent_x2, 800)], arrow_end=True)
    draw_label(draw, "Capture Engine Status & Available Interfaces", ((320 + px_out)/2, y_out + 14), font_flow)

    # P1.4: Traffic & Device Monitoring (directly horizontal)
    y_in = 850
    px_in = circle_x(cx, 870, pr, y_in, 'left')
    draw_path(draw, [(ent_x2, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Traffic Query Filters & Device Label Updates (hostname, type)", ((ent_x2 + px_in)/2, y_in - 14), font_flow)

    y_out = 895
    px_out = circle_x(cx, 870, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (ent_x2, y_out)], arrow_end=True)
    draw_label(draw, "Live Packet Stream, Traffic Analytics & Device Inventory with Risk Scores", ((ent_x2 + px_out)/2, y_out + 14), font_flow)

    # P1.5: Threat Alert Triage
    y_in = 1090
    px_in = circle_x(cx, 1110, pr, y_in, 'left')
    draw_path(draw, [(ent_x2, 960), (320, 960), (320, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Alert Query Criteria & Status Updates (acknowledge, resolve)", ((320 + px_in)/2, y_in - 14), font_flow)

    y_out = 1135
    px_out = circle_x(cx, 1110, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (250, y_out), (250, ent_y2)], arrow_end=True)
    draw_label(draw, "Threat Alerts List, Severity Summary & Triage Confirmation", ((250 + px_out)/2, y_out + 14), font_flow)

    # P1.6: Detection Rules Configuration
    y_in = 1330
    px_in = circle_x(cx, 1350, pr, y_in, 'left')
    draw_path(draw, [(220, ent_y2), (220, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Rule Tuning Parameters (threshold, window) & Toggle Commands", ((220 + px_in)/2, y_in - 14), font_flow)

    y_out = 1375
    px_out = circle_x(cx, 1350, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (180, y_out), (180, ent_y2)], arrow_end=True)
    draw_label(draw, "Detection Rules List, Validation Status & Rule State", ((180 + px_out)/2, y_out + 14), font_flow)

    # P1.7: Security Reports Management
    y_in = 1590
    px_in = circle_x(cx, 1610, pr, y_in, 'left')
    draw_path(draw, [(150, ent_y2), (150, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Report Generation Request (type, format, range) & Delete Request", ((150 + px_in)/2, y_in - 14), font_flow)

    y_out = 1635
    px_out = circle_x(cx, 1610, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (110, y_out), (110, ent_y2)], arrow_end=True)
    draw_label(draw, "System-Wide Reports Catalog, File Download (PDF/CSV) & Status", ((110 + px_out)/2, y_out + 14), font_flow)

    # --- RIGHT SIDE FLOWS (Processes <-> Data Stores) ---
    # P1.1 <-> D1 Users & Sessions
    y_p11_to_d1 = 116
    px11_r1 = circle_x(cx, 150, pr, y_p11_to_d1, 'right')
    draw_path(draw, [(px11_r1, y_p11_to_d1), (1450, y_p11_to_d1), (1450, data_stores["D1"]["y"] - 18), (ds_x, data_stores["D1"]["y"] - 18)], arrow_end=True)
    draw_label(draw, "Credentials Query & Session Verification", ((px11_r1 + 1450)/2, y_p11_to_d1 - 14), font_flow)

    y_d1_to_p11 = 184
    px11_r2 = circle_x(cx, 150, pr, y_d1_to_p11, 'right')
    draw_path(draw, [(ds_x, data_stores["D1"]["y"] + 18), (1400, data_stores["D1"]["y"] + 18), (1400, y_d1_to_p11), (px11_r2, y_d1_to_p11)], arrow_end=True)
    draw_label(draw, "User Records, Password Hash & Session State", ((px11_r2 + 1400)/2, y_d1_to_p11 + 14), font_flow)

    # P1.2 <-> D1 Users & Sessions
    y_p12_to_d1 = 356
    px12_r1 = circle_x(cx, 390, pr, y_p12_to_d1, 'right')
    draw_path(draw, [(px12_r1, y_p12_to_d1), (1500, y_p12_to_d1), (1500, data_stores["D1"]["y"] - 6), (ds_x, data_stores["D1"]["y"] - 6)], arrow_end=True)
    draw_label(draw, "User Data Updates (insert, update role, delete)", ((px12_r1 + 1500)/2, y_p12_to_d1 - 14), font_flow)

    y_d1_to_p12 = 424
    px12_r2 = circle_x(cx, 390, pr, y_d1_to_p12, 'right')
    draw_path(draw, [(ds_x, data_stores["D1"]["y"] + 28), (1550, data_stores["D1"]["y"] + 28), (1550, y_d1_to_p12), (px12_r2, y_d1_to_p12)], arrow_end=True)
    draw_label(draw, "User Catalog & Profile Records", ((px12_r2 + 1550)/2, y_d1_to_p12 + 14), font_flow)

    # P1.3 <-> D6 Capture Settings (100% Horizontal)
    y_p13_to_d6 = 615
    px13_r1 = circle_x(cx, 630, pr, y_p13_to_d6, 'right')
    draw_path(draw, [(px13_r1, y_p13_to_d6), (ds_x, y_p13_to_d6)], arrow_end=True)
    draw_label(draw, "Capture State Updates (is_running, mode, interface)", ((px13_r1 + ds_x)/2, y_p13_to_d6 - 14), font_flow)

    y_d6_to_p13 = 650
    px13_r2 = circle_x(cx, 630, pr, y_d6_to_p13, 'right')
    draw_path(draw, [(ds_x, y_d6_to_p13), (px13_r2, y_d6_to_p13)], arrow_end=True)
    draw_label(draw, "Current Capture Configuration & Sensor State", ((px13_r2 + ds_x)/2, y_d6_to_p13 + 14), font_flow)

    # P1.4 <-> D2 Network Traffic & D4 Device Inventory
    # D2 -> P1.4
    y_d2_to_p14 = 845
    px14_r1 = circle_x(cx, 870, pr, y_d2_to_p14, 'right')
    draw_path(draw, [(ds_x, data_stores["D2"]["y"]), (1450, data_stores["D2"]["y"]), (1450, y_d2_to_p14), (px14_r1, y_d2_to_p14)], arrow_end=True)
    draw_label(draw, "Captured Packet Records & Protocol Data", ((px14_r1 + 1450)/2, y_d2_to_p14 - 14), font_flow)

    # D4 -> P1.4
    y_d4_to_p14 = 880
    px14_r2 = circle_x(cx, 870, pr, y_d4_to_p14, 'right')
    draw_path(draw, [(ds_x, data_stores["D4"]["y"] - 14), (1400, data_stores["D4"]["y"] - 14), (1400, y_d4_to_p14), (px14_r2, y_d4_to_p14)], arrow_end=True)
    draw_label(draw, "Device Inventory Records & Risk Metrics", ((px14_r2 + 1400)/2, y_d4_to_p14 - 14), font_flow)

    # P1.4 -> D4
    y_p14_to_d4 = 905
    px14_r3 = circle_x(cx, 870, pr, y_p14_to_d4, 'right')
    draw_path(draw, [(px14_r3, y_p14_to_d4), (1500, y_p14_to_d4), (1500, data_stores["D4"]["y"] + 14), (ds_x, data_stores["D4"]["y"] + 14)], arrow_end=True)
    draw_label(draw, "Updated Hostname & Device Type Classifications", ((px14_r3 + 1500)/2, y_p14_to_d4 + 14), font_flow)

    # P1.5 <-> D3 Threat Alerts (100% Horizontal)
    y_d3_to_p15 = 1095
    px15_r1 = circle_x(cx, 1110, pr, y_d3_to_p15, 'right')
    draw_path(draw, [(ds_x, y_d3_to_p15), (px15_r1, y_d3_to_p15)], arrow_end=True)
    draw_label(draw, "Threat Alert Records & Incident Details", ((px15_r1 + ds_x)/2, y_d3_to_p15 - 14), font_flow)

    y_p15_to_d3 = 1130
    px15_r2 = circle_x(cx, 1110, pr, y_p15_to_d3, 'right')
    draw_path(draw, [(px15_r2, y_p15_to_d3), (ds_x, y_p15_to_d3)], arrow_end=True)
    draw_label(draw, "Alert Status Changes (acknowledged, resolved)", ((px15_r2 + ds_x)/2, y_p15_to_d3 + 14), font_flow)

    # P1.6 <-> D5 Detection Rules (100% Horizontal)
    y_p16_to_d5 = 1335
    px16_r1 = circle_x(cx, 1350, pr, y_p16_to_d5, 'right')
    draw_path(draw, [(px16_r1, y_p16_to_d5), (ds_x, y_p16_to_d5)], arrow_end=True)
    draw_label(draw, "Updated Threshold Values, Time Windows & Active Toggles", ((px16_r1 + ds_x)/2, y_p16_to_d5 - 14), font_flow)

    y_d5_to_p16 = 1370
    px16_r2 = circle_x(cx, 1350, pr, y_d5_to_p16, 'right')
    draw_path(draw, [(ds_x, y_d5_to_p16), (px16_r2, y_d5_to_p16)], arrow_end=True)
    draw_label(draw, "Detection Rule Configurations & Threshold Settings", ((px16_r2 + ds_x)/2, y_d5_to_p16 + 14), font_flow)

    # P1.7 <-> D7 Security Reports
    bus_d2 = 2270
    bus_d3 = 2220
    bus_d4 = 2170

    # D2 -> P1.7
    y_d2_rep = 1550
    px17_r1 = circle_x(cx, 1610, pr, y_d2_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D2"]["y"]), (bus_d2, data_stores["D2"]["y"]), (bus_d2, y_d2_rep), (px17_r1, y_d2_rep)], arrow_end=True)
    draw_label(draw, "Traffic Logs (for reports)", ((px17_r1 + ds_x)/2, y_d2_rep - 14), font_flow)

    # D3 -> P1.7
    y_d3_rep = 1580
    px17_r2 = circle_x(cx, 1610, pr, y_d3_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D3"]["y"]), (bus_d3, data_stores["D3"]["y"]), (bus_d3, y_d3_rep), (px17_r2, y_d3_rep)], arrow_end=True)
    draw_label(draw, "Alert Records (for reports)", ((px17_r2 + ds_x)/2, y_d3_rep - 14), font_flow)

    # D4 -> P1.7
    y_d4_rep = 1605
    px17_r3 = circle_x(cx, 1610, pr, y_d4_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D4"]["y"]), (bus_d4, data_stores["D4"]["y"]), (bus_d4, y_d4_rep), (px17_r3, y_d4_rep)], arrow_end=True)
    draw_label(draw, "Device Stats (for reports)", ((px17_r3 + ds_x)/2, y_d4_rep - 14), font_flow)

    # P1.7 -> D7 (insert report file & metadata)
    y_p17_to_d7 = 1630
    px17_r4 = circle_x(cx, 1610, pr, y_p17_to_d7, 'right')
    draw_path(draw, [(px17_r4, y_p17_to_d7), (ds_x, y_p17_to_d7)], arrow_end=True)
    draw_label(draw, "Generated Report File & Report Metadata (insert)", ((px17_r4 + ds_x)/2, y_p17_to_d7 - 14), font_flow)

    # D7 -> P1.7 (read report records & file stream)
    y_d7_to_p17 = 1665
    px17_r5 = circle_x(cx, 1610, pr, y_d7_to_p17, 'right')
    draw_path(draw, [(ds_x, y_d7_to_p17), (px17_r5, y_d7_to_p17)], arrow_end=True)
    draw_label(draw, "All System Report Records & Stored File Data (download / delete)", ((px17_r5 + ds_x)/2, y_d7_to_p17 + 14), font_flow)

    img.save(output_path)
    print(f"[Admin DFD Large] Generated successfully at: {output_path}")


# ==============================================================================
# 2. NORMAL USER LEVEL 1 DFD GENERATION (LARGE PROMINENT TEXT)
# ==============================================================================
def generate_user_dfd_large(output_path):
    width = 2400
    height = 1600
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)

    font_title = get_font('bold', 38)
    font_entity = get_font('bold', 26)
    font_proc_num = get_font('bold', 22)
    font_proc_name = get_font('bold', 15)
    font_ds_id = get_font('bold', 22)
    font_ds_name = get_font('semibold', 16)
    font_flow = get_font('semibold', 15)

    # Title
    draw.text((width / 2, 45), "NetSentinel System – Level 1 DFD (Normal User)", fill='black', font=font_title, anchor='mm')

    # External Entity: Normal User
    ent_x1, ent_y1, ent_x2, ent_y2 = 50, 630, 260, 830
    draw.rectangle([ent_x1, ent_y1, ent_x2, ent_y2], outline='black', width=3)
    draw.text(((ent_x1 + ent_x2)/2, (ent_y1 + ent_y2)/2 - 14), "Normal User", fill='black', font=font_entity, anchor='mm')
    draw.text(((ent_x1 + ent_x2)/2, (ent_y1 + ent_y2)/2 + 18), "(Security Analyst)", fill='black', font=get_font('semibold', 16), anchor='mm')

    # Processes (5 Circles)
    cx = 960
    pr = 82
    processes = [
        {"id": "1.1", "name": "User Registration\n& Authentication", "y": 160},
        {"id": "1.2", "name": "Live Traffic &\nDevice Monitoring", "y": 440},
        {"id": "1.3", "name": "Threat Alerts\nInspection", "y": 720},
        {"id": "1.4", "name": "Detection Rules &\nSensor Viewing", "y": 1000},
        {"id": "1.5", "name": "User Reports\nManagement", "y": 1290},
    ]

    for p in processes:
        py = p['y']
        draw.ellipse([cx - pr, py - pr, cx + pr, py + pr], outline='black', width=3)
        draw.text((cx, py - 20), p['id'], fill='black', font=font_proc_num, anchor='mm')
        draw.text((cx, py + 14), p['name'], fill='black', font=font_proc_name, anchor='mm', align='center')

    # Data Stores (Right Side)
    ds_x = 1840
    ds_w = 280
    ds_h = 72
    data_stores = {
        "D1": {"name": "Users & Sessions", "y": 160},
        "D2": {"name": "Network Traffic", "y": 400},
        "D4": {"name": "Device Inventory", "y": 490},
        "D3": {"name": "Threat Alerts", "y": 720},
        "D5": {"name": "Detection Rules", "y": 960},
        "D6": {"name": "Capture Settings", "y": 1050},
        "D7": {"name": "Security Reports (Owned)", "y": 1320},
    }

    for ds_id, ds in data_stores.items():
        dy = ds['y']
        draw.line([(ds_x + ds_w, dy - ds_h/2), (ds_x, dy - ds_h/2), (ds_x, dy + ds_h/2), (ds_x + ds_w, dy + ds_h/2)], fill='black', width=3)
        draw.line([(ds_x + 72, dy - ds_h/2), (ds_x + 72, dy + ds_h/2)], fill='black', width=3)
        draw.text((ds_x + 36, dy), ds_id, fill='black', font=font_ds_id, anchor='mm')
        draw.text((ds_x + 72 + (ds_w - 72)/2, dy), ds['name'], fill='black', font=font_ds_name, anchor='mm')

    # --- LEFT SIDE FLOWS (Normal User <-> Processes) ---
    # P1.1: Registration & Authentication
    y_in = 126
    px_in = circle_x(cx, 160, pr, y_in, 'left')
    draw_path(draw, [(200, ent_y1), (200, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Registration Details (name, email, password) / Login Credentials", ((200 + px_in)/2, y_in - 14), font_flow)

    y_out = 194
    px_out = circle_x(cx, 160, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (140, y_out), (140, ent_y1)], arrow_end=True)
    draw_label(draw, "Registration Confirmation / Auth Response (JWT token, user role)", ((140 + px_out)/2, y_out + 14), font_flow)

    # P1.2: Traffic & Device Monitoring (Read-Only)
    y_in = 406
    px_in = circle_x(cx, 440, pr, y_in, 'left')
    draw_path(draw, [(240, ent_y1), (240, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Traffic Filter Criteria (protocol, IP, port, date) & Device Query", ((240 + px_in)/2, y_in - 14), font_flow)

    y_out = 474
    px_out = circle_x(cx, 440, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (180, y_out), (180, ent_y1)], arrow_end=True)
    draw_label(draw, "Live Packet Stream, Protocol Distribution & Device Inventory with Risk Metrics", ((180 + px_out)/2, y_out + 14), font_flow)

    # P1.3: Threat Alerts Inspection (Read-Only, strictly horizontal)
    y_in = 700
    px_in = circle_x(cx, 720, pr, y_in, 'left')
    draw_path(draw, [(ent_x2, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Alert Filter Query (severity, alert type, source IP)", ((ent_x2 + px_in)/2, y_in - 14), font_flow)

    y_out = 745
    px_out = circle_x(cx, 720, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (ent_x2, y_out)], arrow_end=True)
    draw_label(draw, "Threat Alerts List, Severity Breakdown & Incident Details (Read-Only)", ((ent_x2 + px_out)/2, y_out + 14), font_flow)

    # P1.4: Detection Rules & Sensor Viewing (Read-Only)
    y_in = 970
    px_in = circle_x(cx, 1000, pr, y_in, 'left')
    draw_path(draw, [(230, ent_y2), (230, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Rules & Sensor Query Requests (thresholds, status)", ((230 + px_in)/2, y_in - 14), font_flow)

    y_out = 1025
    px_out = circle_x(cx, 1000, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (180, y_out), (180, ent_y2)], arrow_end=True)
    draw_label(draw, "Active Detection Rule Thresholds, Time Windows & Sensor Online State", ((180 + px_out)/2, y_out + 14), font_flow)

    # P1.5: User Reports Management (Ownership-Restricted)
    y_in = 1265
    px_in = circle_x(cx, 1290, pr, y_in, 'left')
    draw_path(draw, [(140, ent_y2), (140, y_in), (px_in, y_in)], arrow_end=True)
    draw_label(draw, "Report Generation Request (type, format, range) & Download/Delete Own Report", ((140 + px_in)/2, y_in - 14), font_flow)

    y_out = 1315
    px_out = circle_x(cx, 1290, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (100, y_out), (100, ent_y2)], arrow_end=True)
    draw_label(draw, "User-Owned Reports List, PDF/CSV File Download & Deletion Status", ((100 + px_out)/2, y_out + 14), font_flow)

    # --- RIGHT SIDE FLOWS (Processes <-> Data Stores) ---
    # P1.1 <-> D1 Users & Sessions (Horizontal)
    y_p11_to_d1 = 145
    px11_r1 = circle_x(cx, 160, pr, y_p11_to_d1, 'right')
    draw_path(draw, [(px11_r1, y_p11_to_d1), (ds_x, y_p11_to_d1)], arrow_end=True)
    draw_label(draw, "New User Account Registration (role='user') & Session Token", ((px11_r1 + ds_x)/2, y_p11_to_d1 - 14), font_flow)

    y_d1_to_p11 = 175
    px11_r2 = circle_x(cx, 160, pr, y_d1_to_p11, 'right')
    draw_path(draw, [(ds_x, y_d1_to_p11), (px11_r2, y_d1_to_p11)], arrow_end=True)
    draw_label(draw, "User Profile & Session Validation Records", ((px11_r2 + ds_x)/2, y_d1_to_p11 + 14), font_flow)

    # P1.2 <-> D2 Network Traffic & D4 Device Inventory (Read-Only)
    y_d2_to_p12 = 425
    px12_r1 = circle_x(cx, 440, pr, y_d2_to_p12, 'right')
    draw_path(draw, [(ds_x, data_stores["D2"]["y"]), (1450, data_stores["D2"]["y"]), (1450, y_d2_to_p12), (px12_r1, y_d2_to_p12)], arrow_end=True)
    draw_label(draw, "Captured Packet Logs & Traffic Volume Data", ((px12_r1 + 1450)/2, y_d2_to_p12 - 14), font_flow)

    y_d4_to_p12 = 455
    px12_r2 = circle_x(cx, 440, pr, y_d4_to_p12, 'right')
    draw_path(draw, [(ds_x, data_stores["D4"]["y"]), (1400, data_stores["D4"]["y"]), (1400, y_d4_to_p12), (px12_r2, y_d4_to_p12)], arrow_end=True)
    draw_label(draw, "Device Inventory Records & Risk Scores (Read-Only)", ((px12_r2 + 1400)/2, y_d4_to_p12 + 14), font_flow)

    # P1.3 <-> D3 Threat Alerts (Read-Only, 100% Horizontal)
    y_d3_to_p13 = 720
    px13_r = circle_x(cx, 720, pr, y_d3_to_p13, 'right')
    draw_path(draw, [(ds_x, y_d3_to_p13), (px13_r, y_d3_to_p13)], arrow_end=True)
    draw_label(draw, "Threat Alert Records & Incident Information (Read-Only)", ((px13_r + ds_x)/2, y_d3_to_p13 - 14), font_flow)

    # P1.4 <-> D5 Detection Rules & D6 Capture Settings (Read-Only)
    y_d5_to_p14 = 985
    px14_r1 = circle_x(cx, 1000, pr, y_d5_to_p14, 'right')
    draw_path(draw, [(ds_x, data_stores["D5"]["y"]), (1450, data_stores["D5"]["y"]), (1450, y_d5_to_p14), (px14_r1, y_d5_to_p14)], arrow_end=True)
    draw_label(draw, "Active Detection Rule Configurations & Threshold Values (Read-Only)", ((px14_r1 + 1450)/2, y_d5_to_p14 - 14), font_flow)

    y_d6_to_p14 = 1015
    px14_r2 = circle_x(cx, 1000, pr, y_d6_to_p14, 'right')
    draw_path(draw, [(ds_x, data_stores["D6"]["y"]), (1400, data_stores["D6"]["y"]), (1400, y_d6_to_p14), (px14_r2, y_d6_to_p14)], arrow_end=True)
    draw_label(draw, "Capture Engine Status & Active Network Interface Info (Read-Only)", ((px14_r2 + 1400)/2, y_d6_to_p14 + 14), font_flow)

    # P1.5 <-> D7 Security Reports (User-Owned)
    bus_d2 = 2270
    bus_d3 = 2220
    bus_d4 = 2170

    # D2 -> P1.5
    y_d2_rep = 1230
    px15_r1 = circle_x(cx, 1290, pr, y_d2_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D2"]["y"]), (bus_d2, data_stores["D2"]["y"]), (bus_d2, y_d2_rep), (px15_r1, y_d2_rep)], arrow_end=True)
    draw_label(draw, "Traffic Data (for user report compilation)", ((px15_r1 + ds_x)/2, y_d2_rep - 14), font_flow)

    # D3 -> P1.5
    y_d3_rep = 1260
    px15_r2 = circle_x(cx, 1290, pr, y_d3_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D3"]["y"]), (bus_d3, data_stores["D3"]["y"]), (bus_d3, y_d3_rep), (px15_r2, y_d3_rep)], arrow_end=True)
    draw_label(draw, "Alert Records (for user report compilation)", ((px15_r2 + ds_x)/2, y_d3_rep - 14), font_flow)

    # D4 -> P1.5
    y_d4_rep = 1285
    px15_r3 = circle_x(cx, 1290, pr, y_d4_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D4"]["y"]), (bus_d4, data_stores["D4"]["y"]), (bus_d4, y_d4_rep), (px15_r3, y_d4_rep)], arrow_end=True)
    draw_label(draw, "Device Metrics (for user report compilation)", ((px15_r3 + ds_x)/2, y_d4_rep - 14), font_flow)

    # P1.5 -> D7 (insert user report file & metadata with user_id)
    y_p15_to_d7 = 1310
    px15_r4 = circle_x(cx, 1290, pr, y_p15_to_d7, 'right')
    draw_path(draw, [(px15_r4, y_p15_to_d7), (ds_x, y_p15_to_d7)], arrow_end=True)
    draw_label(draw, "User-Owned Report Metadata (linked to user_id) & File Storage", ((px15_r4 + ds_x)/2, y_p15_to_d7 - 14), font_flow)

    # D7 -> P1.5 (read user's own reports only)
    y_d7_to_p15 = 1345
    px15_r5 = circle_x(cx, 1290, pr, y_d7_to_p15, 'right')
    draw_path(draw, [(ds_x, y_d7_to_p15), (px15_r5, y_d7_to_p15)], arrow_end=True)
    draw_label(draw, "User Report Records (WHERE user_id = current_user) & File Stream", ((px15_r5 + ds_x)/2, y_d7_to_p15 + 14), font_flow)

    img.save(output_path)
    print(f"[User DFD Large] Generated successfully at: {output_path}")


if __name__ == '__main__':
    admin_large = 'd:/netsentinel/dfd-level-1-admin-large.png'
    user_large = 'd:/netsentinel/dfd-level-1-user-large.png'
    generate_admin_dfd_large(admin_large)
    generate_user_dfd_large(user_large)
