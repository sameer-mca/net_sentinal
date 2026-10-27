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

def arrow(draw, tip, angle_rad, length=16, w=10):
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

def draw_flow_label(draw, text, x, y, font, anchor='mm', bg=True):
    """Draws a label with optional background padding. Default anchor mm (center)."""
    bbox = draw.textbbox((x, y), text, font=font, anchor=anchor, align='center')
    pad_x = 5
    pad_y = 2
    if bg:
        draw.rectangle([bbox[0] - pad_x, bbox[1] - pad_y, bbox[2] + pad_x, bbox[3] + pad_y], fill='white')
    draw.text((x, y), text, fill='black', font=font, anchor=anchor, align='center')


# ==============================================================================
# 1. ADMIN LEVEL 1 DFD GENERATION
# ==============================================================================
def generate_admin_dfd(output_path):
    width = 2000
    height = 1750
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)

    # Large prominent fonts
    font_title = get_font('bold', 34)
    font_entity = get_font('bold', 24)
    font_proc_num = get_font('bold', 22)
    font_proc_name = get_font('bold', 16)
    font_ds_id = get_font('bold', 22)
    font_ds_name = get_font('bold', 16)
    font_flow = get_font('bold', 15)

    # Title
    draw.text((width / 2, 45), "NetSentinel System – Level 1 DFD (Administrator)", fill='black', font=font_title, anchor='mm')

    # External Entity: Administrator (Left side)
    ent_x1, ent_y1, ent_x2, ent_y2 = 40, 730, 250, 970
    draw.rectangle([ent_x1, ent_y1, ent_x2, ent_y2], outline='black', width=3)
    draw.text(((ent_x1 + ent_x2)/2, (ent_y1 + ent_y2)/2), "Administrator", fill='black', font=font_entity, anchor='mm')

    # 7 Processes (Center Column)
    cx = 860
    pr = 85
    processes = [
        {"id": "1.1", "name": "User\nAuthentication", "y": 160},
        {"id": "1.2", "name": "User Account\nAdministration", "y": 390},
        {"id": "1.3", "name": "Capture Engine\nControl", "y": 620},
        {"id": "1.4", "name": "Traffic & Device\nMonitoring", "y": 850},
        {"id": "1.5", "name": "Threat Alert\nTriage", "y": 1080},
        {"id": "1.6", "name": "Detection Rules\nConfiguration", "y": 1310},
        {"id": "1.7", "name": "Security Reports\nManagement", "y": 1540},
    ]

    for p in processes:
        py = p['y']
        draw.ellipse([cx - pr, py - pr, cx + pr, py + pr], outline='black', width=3)
        draw.text((cx, py - 22), p['id'], fill='black', font=font_proc_num, anchor='mm')
        draw.text((cx, py + 16), p['name'], fill='black', font=font_proc_name, anchor='mm', align='center')

    # 7 Data Stores (Right Side)
    ds_x = 1500
    ds_w = 320
    ds_h = 70
    data_stores = {
        "D1": {"name": "Users & Sessions", "y": 275},
        "D6": {"name": "Capture Settings", "y": 620},
        "D2": {"name": "Network Traffic", "y": 780},
        "D4": {"name": "Device Inventory", "y": 920},
        "D3": {"name": "Threat Alerts", "y": 1080},
        "D5": {"name": "Detection Rules", "y": 1310},
        "D7": {"name": "Security Reports", "y": 1580},
    }

    for ds_id, ds in data_stores.items():
        dy = ds['y']
        # Gane & Sarson open-ended rectangle
        draw.line([(ds_x + ds_w, dy - ds_h/2), (ds_x, dy - ds_h/2), (ds_x, dy + ds_h/2), (ds_x + ds_w, dy + ds_h/2)], fill='black', width=3)
        draw.line([(ds_x + 75, dy - ds_h/2), (ds_x + 75, dy + ds_h/2)], fill='black', width=3)
        draw.text((ds_x + 37.5, dy), ds_id, fill='black', font=font_ds_id, anchor='mm')
        draw.text((ds_x + 75 + (ds_w - 75)/2, dy), ds['name'], fill='black', font=font_ds_name, anchor='mm')

    # ==========================================
    # LEFT FLOWS: Administrator <-> Processes
    # ==========================================
    # P1.1: User Authentication
    y_in = 120
    px_in = circle_x(cx, 160, pr, y_in, 'left')
    draw_path(draw, [(220, ent_y1), (220, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Login Credentials (email, password)", (220 + px_in)/2, y_in - 14, font_flow)

    y_out = 200
    px_out = circle_x(cx, 160, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (160, y_out), (160, ent_y1)], arrow_end=True)
    draw_flow_label(draw, "Authentication Response (JWT token, admin role)", (160 + px_out)/2, y_out + 14, font_flow)

    # P1.2: User Account Administration
    y_in = 350
    px_in = circle_x(cx, 390, pr, y_in, 'left')
    draw_path(draw, [(240, ent_y1), (240, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "User Account Requests (create, role update, delete)", (240 + px_in)/2, y_in - 14, font_flow)

    y_out = 430
    px_out = circle_x(cx, 390, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (190, y_out), (190, ent_y1)], arrow_end=True)
    draw_flow_label(draw, "Operation Status & User Catalog Records", (190 + px_out)/2, y_out + 14, font_flow)

    # P1.3: Capture Engine Control
    y_in = 580
    px_in = circle_x(cx, 620, pr, y_in, 'left')
    draw_path(draw, [(ent_x2, 750), (310, 750), (310, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Capture Engine Commands (start/stop, mode, interface)", (310 + px_in)/2, y_in - 14, font_flow)

    y_out = 660
    px_out = circle_x(cx, 620, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (350, y_out), (350, 770), (ent_x2, 770)], arrow_end=True)
    draw_flow_label(draw, "Capture Sensor Status & Network Interfaces List", (350 + px_out)/2, y_out + 14, font_flow)

    # P1.4: Traffic & Device Monitoring (directly horizontal)
    y_in = 825
    px_in = circle_x(cx, 850, pr, y_in, 'left')
    draw_path(draw, [(ent_x2, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Traffic Query Filters & Device Classifications", (ent_x2 + px_in)/2, y_in - 14, font_flow)

    y_out = 875
    px_out = circle_x(cx, 850, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (ent_x2, y_out)], arrow_end=True)
    draw_flow_label(draw, "Live Packet Stream, Traffic Stats & Device Inventory with Risks", (ent_x2 + px_out)/2, y_out + 14, font_flow)

    # P1.5: Threat Alert Triage
    y_in = 1040
    px_in = circle_x(cx, 1080, pr, y_in, 'left')
    draw_path(draw, [(ent_x2, 930), (350, 930), (350, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Threat Alert Query Filters & Triage Updates (ack/resolve)", (350 + px_in)/2, y_in - 14, font_flow)

    y_out = 1120
    px_out = circle_x(cx, 1080, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (310, y_out), (310, 950), (ent_x2, 950)], arrow_end=True)
    draw_flow_label(draw, "Threat Alerts List, Severity Metrics & Triage Confirmation", (310 + px_out)/2, y_out + 14, font_flow)

    # P1.6: Detection Rules Configuration
    y_in = 1270
    px_in = circle_x(cx, 1310, pr, y_in, 'left')
    draw_path(draw, [(240, ent_y2), (240, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Rule Tuning Parameters (threshold, window) & Toggles", (240 + px_in)/2, y_in - 14, font_flow)

    y_out = 1350
    px_out = circle_x(cx, 1310, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (190, y_out), (190, ent_y2)], arrow_end=True)
    draw_flow_label(draw, "Detection Rules Catalog & Rule State Confirmation", (190 + px_out)/2, y_out + 14, font_flow)

    # P1.7: Security Reports Management
    y_in = 1500
    px_in = circle_x(cx, 1540, pr, y_in, 'left')
    draw_path(draw, [(220, ent_y2), (220, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Report Generation Request (type, format, range) & Delete", (220 + px_in)/2, y_in - 14, font_flow)

    y_out = 1580
    px_out = circle_x(cx, 1540, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (160, y_out), (160, ent_y2)], arrow_end=True)
    draw_flow_label(draw, "System Security Reports & Export File Stream (PDF/CSV)", (160 + px_out)/2, y_out + 14, font_flow)

    # ==========================================
    # RIGHT FLOWS: Processes <-> Data Stores
    # ==========================================
    # P1.1 <-> D1 Users & Sessions
    y_p11_to_d1 = 120
    px11_r1 = circle_x(cx, 160, pr, y_p11_to_d1, 'right')
    draw_path(draw, [(px11_r1, y_p11_to_d1), (1250, y_p11_to_d1), (1250, 260), (ds_x, 260)], arrow_end=True)
    draw_flow_label(draw, "Credentials Query & Session Verification", (px11_r1 + 1250)/2, y_p11_to_d1 - 14, font_flow)

    y_d1_to_p11 = 200
    px11_r2 = circle_x(cx, 160, pr, y_d1_to_p11, 'right')
    draw_path(draw, [(ds_x, 290), (1200, 290), (1200, y_d1_to_p11), (px11_r2, y_d1_to_p11)], arrow_end=True)
    draw_flow_label(draw, "User Records, Password Hash & Active Session State", (px11_r2 + 1200)/2, y_d1_to_p11 + 14, font_flow)

    # P1.2 <-> D1 Users & Sessions
    y_p12_to_d1 = 350
    px12_r1 = circle_x(cx, 390, pr, y_p12_to_d1, 'right')
    draw_path(draw, [(px12_r1, y_p12_to_d1), (1300, y_p12_to_d1), (1300, 260), (ds_x, 260)], arrow_end=True)
    draw_flow_label(draw, "User Account Mutations (insert, update, delete)", (px12_r1 + 1300)/2, y_p12_to_d1 - 14, font_flow)

    y_d1_to_p12 = 430
    px12_r2 = circle_x(cx, 390, pr, y_d1_to_p12, 'right')
    draw_path(draw, [(ds_x, 290), (1350, 290), (1350, y_d1_to_p12), (px12_r2, y_d1_to_p12)], arrow_end=True)
    draw_flow_label(draw, "User Profiles & Account Catalog Records", (px12_r2 + 1350)/2, y_d1_to_p12 + 14, font_flow)

    # P1.3 <-> D6 Capture Settings (directly horizontal)
    y_p13_to_d6 = 600
    px13_r1 = circle_x(cx, 620, pr, y_p13_to_d6, 'right')
    draw_path(draw, [(px13_r1, y_p13_to_d6), (ds_x, y_p13_to_d6)], arrow_end=True)
    draw_flow_label(draw, "Capture State Updates (is_running, mode, iface)", (px13_r1 + ds_x)/2, y_p13_to_d6 - 14, font_flow)

    y_d6_to_p13 = 640
    px13_r2 = circle_x(cx, 620, pr, y_d6_to_p13, 'right')
    draw_path(draw, [(ds_x, y_d6_to_p13), (px13_r2, y_d6_to_p13)], arrow_end=True)
    draw_flow_label(draw, "Current Capture Settings & Engine Status", (px13_r2 + ds_x)/2, y_d6_to_p13 + 14, font_flow)

    # P1.4 <-> D2 Network Traffic & D4 Device Inventory
    y_d2_to_p14 = 825
    px14_r1 = circle_x(cx, 850, pr, y_d2_to_p14, 'right')
    draw_path(draw, [(ds_x, data_stores["D2"]["y"]), (1220, data_stores["D2"]["y"]), (1220, y_d2_to_p14), (px14_r1, y_d2_to_p14)], arrow_end=True)
    draw_flow_label(draw, "Captured Packet Records & Protocol Volume Data", (px14_r1 + 1220)/2, y_d2_to_p14 - 14, font_flow)

    y_d4_to_p14 = 855
    px14_r2 = circle_x(cx, 850, pr, y_d4_to_p14, 'right')
    draw_path(draw, [(ds_x, data_stores["D4"]["y"] - 15), (1180, data_stores["D4"]["y"] - 15), (1180, y_d4_to_p14), (px14_r2, y_d4_to_p14)], arrow_end=True)
    draw_flow_label(draw, "Device Inventory Records & Risk Metrics", (px14_r2 + 1180)/2, y_d4_to_p14 - 14, font_flow)

    y_p14_to_d4 = 875
    px14_r3 = circle_x(cx, 850, pr, y_p14_to_d4, 'right')
    draw_path(draw, [(px14_r3, y_p14_to_d4), (1260, y_p14_to_d4), (1260, data_stores["D4"]["y"] + 15), (ds_x, data_stores["D4"]["y"] + 15)], arrow_end=True)
    draw_flow_label(draw, "Device Identity Updates (hostname, device type)", (px14_r3 + 1260)/2, y_p14_to_d4 + 14, font_flow)

    # P1.5 <-> D3 Threat Alerts (directly horizontal)
    y_d3_to_p15 = 1060
    px15_r1 = circle_x(cx, 1080, pr, y_d3_to_p15, 'right')
    draw_path(draw, [(ds_x, y_d3_to_p15), (px15_r1, y_d3_to_p15)], arrow_end=True)
    draw_flow_label(draw, "Threat Alert Incidents & Detection Metadata", (px15_r1 + ds_x)/2, y_d3_to_p15 - 14, font_flow)

    y_p15_to_d3 = 1100
    px15_r2 = circle_x(cx, 1080, pr, y_p15_to_d3, 'right')
    draw_path(draw, [(px15_r2, y_p15_to_d3), (ds_x, y_p15_to_d3)], arrow_end=True)
    draw_flow_label(draw, "Alert Status Changes (acknowledged, resolved)", (px15_r2 + ds_x)/2, y_p15_to_d3 + 14, font_flow)

    # P1.6 <-> D5 Detection Rules (directly horizontal)
    y_p16_to_d5 = 1290
    px16_r1 = circle_x(cx, 1310, pr, y_p16_to_d5, 'right')
    draw_path(draw, [(px16_r1, y_p16_to_d5), (ds_x, y_p16_to_d5)], arrow_end=True)
    draw_flow_label(draw, "Updated Threshold Values, Time Windows & Toggles", (px16_r1 + ds_x)/2, y_p16_to_d5 - 14, font_flow)

    y_d5_to_p16 = 1330
    px16_r2 = circle_x(cx, 1310, pr, y_d5_to_p16, 'right')
    draw_path(draw, [(ds_x, y_d5_to_p16), (px16_r2, y_d5_to_p16)], arrow_end=True)
    draw_flow_label(draw, "Active Detection Rule Rulesets & Configurations", (px16_r2 + ds_x)/2, y_d5_to_p16 + 14, font_flow)

    # P1.7 <-> D7 Security Reports (and bus lines from D2, D3, D4)
    bus_d2 = 1950
    bus_d3 = 1910
    bus_d4 = 1870

    # D2 -> P1.7
    y_d2_rep = 1465
    px17_r1 = circle_x(cx, 1540, pr, y_d2_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D2"]["y"]), (bus_d2, data_stores["D2"]["y"]), (bus_d2, y_d2_rep), (px17_r1, y_d2_rep)], arrow_end=True)
    draw_flow_label(draw, "Traffic Logs (for reports)", (px17_r1 + ds_x)/2, y_d2_rep - 14, font_flow)

    # D3 -> P1.7
    y_d3_rep = 1495
    px17_r2 = circle_x(cx, 1540, pr, y_d3_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D3"]["y"]), (bus_d3, data_stores["D3"]["y"]), (bus_d3, y_d3_rep), (px17_r2, y_d3_rep)], arrow_end=True)
    draw_flow_label(draw, "Alert Records (for reports)", (px17_r2 + ds_x)/2, y_d3_rep - 14, font_flow)

    # D4 -> P1.7
    y_d4_rep = 1525
    px17_r3 = circle_x(cx, 1540, pr, y_d4_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D4"]["y"]), (bus_d4, data_stores["D4"]["y"]), (bus_d4, y_d4_rep), (px17_r3, y_d4_rep)], arrow_end=True)
    draw_flow_label(draw, "Device Stats (for reports)", (px17_r3 + ds_x)/2, y_d4_rep - 14, font_flow)

    # P1.7 -> D7 (insert generated report)
    y_p17_to_d7 = 1560
    px17_r4 = circle_x(cx, 1540, pr, y_p17_to_d7, 'right')
    draw_path(draw, [(px17_r4, y_p17_to_d7), (1250, y_p17_to_d7), (1250, data_stores["D7"]["y"] - 15), (ds_x, data_stores["D7"]["y"] - 15)], arrow_end=True)
    draw_flow_label(draw, "Generated Report File & Metadata (insert)", (px17_r4 + 1250)/2, y_p17_to_d7 - 14, font_flow)

    # D7 -> P1.7 (read report records & file stream)
    y_d7_to_p17 = 1610
    px17_r5 = circle_x(cx, 1540, pr, y_d7_to_p17, 'right')
    draw_path(draw, [(ds_x, data_stores["D7"]["y"] + 15), (1200, data_stores["D7"]["y"] + 15), (1200, y_d7_to_p17), (px17_r5, y_d7_to_p17)], arrow_end=True)
    draw_flow_label(draw, "All System Report Records & File Stream (download/delete)", (px17_r5 + 1200)/2, y_d7_to_p17 + 14, font_flow)

    img.save(output_path)
    print(f"[Admin DFD] Generated at: {output_path}")


# ==============================================================================
# 2. NORMAL USER LEVEL 1 DFD GENERATION
# ==============================================================================
def generate_user_dfd(output_path):
    width = 2000
    height = 1400
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)

    font_title = get_font('bold', 34)
    font_entity = get_font('bold', 24)
    font_proc_num = get_font('bold', 22)
    font_proc_name = get_font('bold', 16)
    font_ds_id = get_font('bold', 22)
    font_ds_name = get_font('bold', 16)
    font_flow = get_font('bold', 15)

    # Title
    draw.text((width / 2, 45), "NetSentinel System – Level 1 DFD (Normal User)", fill='black', font=font_title, anchor='mm')

    # External Entity: Normal User (Security Analyst)
    ent_x1, ent_y1, ent_x2, ent_y2 = 40, 620, 250, 860
    draw.rectangle([ent_x1, ent_y1, ent_x2, ent_y2], outline='black', width=3)
    draw.text(((ent_x1 + ent_x2)/2, (ent_y1 + ent_y2)/2 - 14), "Normal User", fill='black', font=font_entity, anchor='mm')
    draw.text(((ent_x1 + ent_x2)/2, (ent_y1 + ent_y2)/2 + 18), "(Security Analyst)", fill='black', font=get_font('bold', 17), anchor='mm')

    # 5 Processes (Center Column)
    cx = 860
    pr = 85
    processes = [
        {"id": "1.1", "name": "User Registration\n& Authentication", "y": 180},
        {"id": "1.2", "name": "Live Traffic &\nDevice Monitoring", "y": 460},
        {"id": "1.3", "name": "Threat Alerts\nInspection", "y": 740},
        {"id": "1.4", "name": "Detection Rules &\nSensor Viewing", "y": 1020},
        {"id": "1.5", "name": "User Reports\nManagement", "y": 1300},
    ]

    for p in processes:
        py = p['y']
        draw.ellipse([cx - pr, py - pr, cx + pr, py + pr], outline='black', width=3)
        draw.text((cx, py - 22), p['id'], fill='black', font=font_proc_num, anchor='mm')
        draw.text((cx, py + 16), p['name'], fill='black', font=font_proc_name, anchor='mm', align='center')

    # 7 Data Stores (Right Side)
    ds_x = 1500
    ds_w = 320
    ds_h = 70
    data_stores = {
        "D1": {"name": "Users & Sessions", "y": 180},
        "D2": {"name": "Network Traffic", "y": 390},
        "D4": {"name": "Device Inventory", "y": 530},
        "D3": {"name": "Threat Alerts", "y": 740},
        "D5": {"name": "Detection Rules", "y": 950},
        "D6": {"name": "Capture Settings", "y": 1090},
        "D7": {"name": "Security Reports (Owned)", "y": 1320},
    }

    for ds_id, ds in data_stores.items():
        dy = ds['y']
        draw.line([(ds_x + ds_w, dy - ds_h/2), (ds_x, dy - ds_h/2), (ds_x, dy + ds_h/2), (ds_x + ds_w, dy + ds_h/2)], fill='black', width=3)
        draw.line([(ds_x + 75, dy - ds_h/2), (ds_x + 75, dy + ds_h/2)], fill='black', width=3)
        draw.text((ds_x + 37.5, dy), ds_id, fill='black', font=font_ds_id, anchor='mm')
        draw.text((ds_x + 75 + (ds_w - 75)/2, dy), ds['name'], fill='black', font=font_ds_name, anchor='mm')

    # ==========================================
    # LEFT FLOWS: Normal User <-> Processes
    # ==========================================
    # P1.1: Registration & Authentication
    y_in = 140
    px_in = circle_x(cx, 180, pr, y_in, 'left')
    draw_path(draw, [(220, ent_y1), (220, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Registration Details (name, email, pass) / Login Credentials", (220 + px_in)/2, y_in - 14, font_flow)

    y_out = 220
    px_out = circle_x(cx, 180, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (160, y_out), (160, ent_y1)], arrow_end=True)
    draw_flow_label(draw, "Registration Confirmation / Auth Response (JWT, role='user')", (160 + px_out)/2, y_out + 14, font_flow)

    # P1.2: Traffic & Device Monitoring (Read-Only)
    y_in = 420
    px_in = circle_x(cx, 460, pr, y_in, 'left')
    draw_path(draw, [(240, ent_y1), (240, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Traffic Filter Query Criteria & Device Inspection Request", (240 + px_in)/2, y_in - 14, font_flow)

    y_out = 500
    px_out = circle_x(cx, 460, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (190, y_out), (190, ent_y1)], arrow_end=True)
    draw_flow_label(draw, "Live Packet Stream, Protocol Distribution & Device Inventory", (190 + px_out)/2, y_out + 14, font_flow)

    # P1.3: Threat Alerts Inspection (strictly horizontal)
    y_in = 715
    px_in = circle_x(cx, 740, pr, y_in, 'left')
    draw_path(draw, [(ent_x2, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Threat Alert Query Filters (severity, type, IP, date)", (ent_x2 + px_in)/2, y_in - 14, font_flow)

    y_out = 765
    px_out = circle_x(cx, 740, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (ent_x2, y_out)], arrow_end=True)
    draw_flow_label(draw, "Threat Alerts List, Severity Breakdown & Incidents (Read-Only)", (ent_x2 + px_out)/2, y_out + 14, font_flow)

    # P1.4: Detection Rules & Sensor Viewing (Read-Only)
    y_in = 980
    px_in = circle_x(cx, 1020, pr, y_in, 'left')
    draw_path(draw, [(240, ent_y2), (240, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Detection Rules & Capture Sensor Status Queries (Read-Only)", (240 + px_in)/2, y_in - 14, font_flow)

    y_out = 1060
    px_out = circle_x(cx, 1020, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (190, y_out), (190, ent_y2)], arrow_end=True)
    draw_flow_label(draw, "Active Rule Thresholds, Time Windows & Sensor State (Read-Only)", (190 + px_out)/2, y_out + 14, font_flow)

    # P1.5: User Reports Management (User-Owned)
    y_in = 1260
    px_in = circle_x(cx, 1300, pr, y_in, 'left')
    draw_path(draw, [(220, ent_y2), (220, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Report Generation Request & Download/Delete Own Report", (220 + px_in)/2, y_in - 14, font_flow)

    y_out = 1340
    px_out = circle_x(cx, 1300, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (160, y_out), (160, ent_y2)], arrow_end=True)
    draw_flow_label(draw, "User-Owned Reports List, PDF/CSV Export & Deletion Status", (160 + px_out)/2, y_out + 14, font_flow)

    # ==========================================
    # RIGHT FLOWS: Processes <-> Data Stores
    # ==========================================
    # P1.1 <-> D1 Users & Sessions (Horizontal)
    y_p11_to_d1 = 160
    px11_r1 = circle_x(cx, 180, pr, y_p11_to_d1, 'right')
    draw_path(draw, [(px11_r1, y_p11_to_d1), (ds_x, y_p11_to_d1)], arrow_end=True)
    draw_flow_label(draw, "New User Registration (role='user') & Session State", (px11_r1 + ds_x)/2, y_p11_to_d1 - 14, font_flow)

    y_d1_to_p11 = 200
    px11_r2 = circle_x(cx, 180, pr, y_d1_to_p11, 'right')
    draw_path(draw, [(ds_x, y_d1_to_p11), (px11_r2, y_d1_to_p11)], arrow_end=True)
    draw_flow_label(draw, "User Profile Records & Authentication Validation", (px11_r2 + ds_x)/2, y_d1_to_p11 + 14, font_flow)

    # P1.2 <-> D2 Network Traffic & D4 Device Inventory (Read-Only)
    y_d2_to_p12 = 435
    px12_r1 = circle_x(cx, 460, pr, y_d2_to_p12, 'right')
    draw_path(draw, [(ds_x, data_stores["D2"]["y"]), (1200, data_stores["D2"]["y"]), (1200, y_d2_to_p12), (px12_r1, y_d2_to_p12)], arrow_end=True)
    draw_flow_label(draw, "Captured Packet Logs & Traffic Volume Data (Read-Only)", (px12_r1 + 1200)/2, y_d2_to_p12 - 14, font_flow)

    y_d4_to_p12 = 485
    px12_r2 = circle_x(cx, 460, pr, y_d4_to_p12, 'right')
    draw_path(draw, [(ds_x, data_stores["D4"]["y"]), (1200, data_stores["D4"]["y"]), (1200, y_d4_to_p12), (px12_r2, y_d4_to_p12)], arrow_end=True)
    draw_flow_label(draw, "Device Inventory Records & Risk Metrics (Read-Only)", (px12_r2 + 1200)/2, y_d4_to_p12 + 14, font_flow)

    # P1.3 <-> D3 Threat Alerts (directly horizontal, Read-Only)
    y_d3_to_p13 = 740
    px13_r = circle_x(cx, 740, pr, y_d3_to_p13, 'right')
    draw_path(draw, [(ds_x, y_d3_to_p13), (px13_r, y_d3_to_p13)], arrow_end=True)
    draw_flow_label(draw, "Threat Alert Records & Incident Details (Read-Only)", (px13_r + ds_x)/2, y_d3_to_p13 - 14, font_flow)

    # P1.4 <-> D5 Detection Rules & D6 Capture Settings (Read-Only)
    y_d5_to_p14 = 995
    px14_r1 = circle_x(cx, 1020, pr, y_d5_to_p14, 'right')
    draw_path(draw, [(ds_x, data_stores["D5"]["y"]), (1200, data_stores["D5"]["y"]), (1200, y_d5_to_p14), (px14_r1, y_d5_to_p14)], arrow_end=True)
    draw_flow_label(draw, "Active Detection Rule Configs & Thresholds (Read-Only)", (px14_r1 + 1200)/2, y_d5_to_p14 - 14, font_flow)

    y_d6_to_p14 = 1045
    px14_r2 = circle_x(cx, 1020, pr, y_d6_to_p14, 'right')
    draw_path(draw, [(ds_x, data_stores["D6"]["y"]), (1200, data_stores["D6"]["y"]), (1200, y_d6_to_p14), (px14_r2, y_d6_to_p14)], arrow_end=True)
    draw_flow_label(draw, "Capture Engine Status & Interface Settings (Read-Only)", (px14_r2 + 1200)/2, y_d6_to_p14 + 14, font_flow)

    # P1.5 <-> D7 Security Reports (User-Owned) and bus lines from D2, D3, D4
    bus_d2 = 1950
    bus_d3 = 1910
    bus_d4 = 1870

    # D2 -> P1.5
    y_d2_rep = 1225
    px15_r1 = circle_x(cx, 1300, pr, y_d2_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D2"]["y"]), (bus_d2, data_stores["D2"]["y"]), (bus_d2, y_d2_rep), (px15_r1, y_d2_rep)], arrow_end=True)
    draw_flow_label(draw, "Traffic Data (for user report compilation)", (px15_r1 + ds_x)/2, y_d2_rep - 14, font_flow)

    # D3 -> P1.5
    y_d3_rep = 1255
    px15_r2 = circle_x(cx, 1300, pr, y_d3_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D3"]["y"]), (bus_d3, data_stores["D3"]["y"]), (bus_d3, y_d3_rep), (px15_r2, y_d3_rep)], arrow_end=True)
    draw_flow_label(draw, "Alert Records (for user report compilation)", (px15_r2 + ds_x)/2, y_d3_rep - 14, font_flow)

    # D4 -> P1.5
    y_d4_rep = 1285
    px15_r3 = circle_x(cx, 1300, pr, y_d4_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D4"]["y"]), (bus_d4, data_stores["D4"]["y"]), (bus_d4, y_d4_rep), (px15_r3, y_d4_rep)], arrow_end=True)
    draw_flow_label(draw, "Device Metrics (for user report compilation)", (px15_r3 + ds_x)/2, y_d4_rep - 14, font_flow)

    # P1.5 -> D7 (insert user report)
    y_p15_to_d7 = 1320
    px15_r4 = circle_x(cx, 1300, pr, y_p15_to_d7, 'right')
    draw_path(draw, [(px15_r4, y_p15_to_d7), (ds_x, y_p15_to_d7)], arrow_end=True)
    draw_flow_label(draw, "User Report Metadata & Document (WHERE user_id)", (px15_r4 + ds_x)/2, y_p15_to_d7 - 14, font_flow)

    # D7 -> P1.5 (read own reports)
    y_d7_to_p15 = 1355
    px15_r5 = circle_x(cx, 1300, pr, y_d7_to_p15, 'right')
    draw_path(draw, [(ds_x, y_d7_to_p15), (px15_r5, y_d7_to_p15)], arrow_end=True)
    draw_flow_label(draw, "User's Own Report Records & Stored Stream (download)", (px15_r5 + ds_x)/2, y_d7_to_p15 + 14, font_flow)

    img.save(output_path)
    print(f"[User DFD] Generated at: {output_path}")


if __name__ == '__main__':
    admin_large = r'd:\netsentinel\dfd-level-1-admin-large.png'
    user_large = r'd:\netsentinel\dfd-level-1-user-large.png'
    generate_admin_dfd(admin_large)
    generate_user_dfd(user_large)
