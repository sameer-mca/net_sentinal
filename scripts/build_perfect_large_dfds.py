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

def draw_flow_label(draw, text, x_mid, y_line, side='above', font=None):
    """
    Draws flow label sitting cleanly above or below a horizontal line segment.
    Uses anchor 'mm' with exact vertical offset based on measured text height.
    Guarantees no line crossing and no background box erasing neighboring items.
    """
    bbox0 = draw.textbbox((0, 0), text, font=font, anchor='mm', align='center')
    h = bbox0[3] - bbox0[1]
    margin = 8
    y_pos = y_line - margin - (h / 2.0) if side == 'above' else y_line + margin + (h / 2.0)
    draw.text((x_mid, y_pos), text, fill='black', font=font, anchor='mm', align='center')


# ==============================================================================
# 1. ADMIN LEVEL 1 DFD GENERATION
# ==============================================================================
def generate_admin_dfd(output_path):
    width = 2080
    height = 1960
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)

    # Master large typography
    font_title = get_font('bold', 36)
    font_entity = get_font('bold', 26)
    font_proc_num = get_font('bold', 24)
    font_proc_name = get_font('bold', 17)
    font_ds_id = get_font('bold', 24)
    font_ds_name = get_font('bold', 17)
    font_flow = get_font('bold', 16)

    # Diagram Title
    draw.text((width / 2, 45), "NetSentinel System – Level 1 DFD (Administrator)", fill='black', font=font_title, anchor='mm')

    # External Entity: Administrator (Left side)
    ent_x1, ent_y1, ent_x2, ent_y2 = 40, 820, 270, 1080
    draw.rectangle([ent_x1, ent_y1, ent_x2, ent_y2], outline='black', width=3)
    draw.text(((ent_x1 + ent_x2)/2, (ent_y1 + ent_y2)/2), "Administrator", fill='black', font=font_entity, anchor='mm')

    # 7 Processes (Center Column)
    cx = 870
    pr = 95
    processes = [
        {"id": "1.1", "name": "User\nAuthentication", "y": 170},
        {"id": "1.2", "name": "User Account\nAdministration", "y": 430},
        {"id": "1.3", "name": "Capture Engine\nControl", "y": 690},
        {"id": "1.4", "name": "Traffic & Device\nMonitoring", "y": 950},
        {"id": "1.5", "name": "Threat Alert\nTriage", "y": 1210},
        {"id": "1.6", "name": "Detection Rules\nConfiguration", "y": 1470},
        {"id": "1.7", "name": "Security Reports\nManagement", "y": 1730},
    ]

    for p in processes:
        py = p['y']
        draw.ellipse([cx - pr, py - pr, cx + pr, py + pr], outline='black', width=3)
        draw.text((cx, py - 24), p['id'], fill='black', font=font_proc_num, anchor='mm')
        draw.text((cx, py + 18), p['name'], fill='black', font=font_proc_name, anchor='mm', align='center')

    # 7 Data Stores (Right Side)
    ds_x = 1530
    ds_w = 340
    ds_h = 76
    data_stores = {
        "D1": {"name": "Users & Sessions", "y": 300},
        "D6": {"name": "Capture Settings", "y": 690},
        "D2": {"name": "Network Traffic", "y": 860},
        "D4": {"name": "Device Inventory", "y": 1040},
        "D3": {"name": "Threat Alerts", "y": 1210},
        "D5": {"name": "Detection Rules", "y": 1470},
        "D7": {"name": "Security Reports", "y": 1770},
    }

    for ds_id, ds in data_stores.items():
        dy = ds['y']
        draw.line([(ds_x + ds_w, dy - ds_h/2), (ds_x, dy - ds_h/2), (ds_x, dy + ds_h/2), (ds_x + ds_w, dy + ds_h/2)], fill='black', width=3)
        draw.line([(ds_x + 80, dy - ds_h/2), (ds_x + 80, dy + ds_h/2)], fill='black', width=3)
        draw.text((ds_x + 40, dy), ds_id, fill='black', font=font_ds_id, anchor='mm')
        draw.text((ds_x + 80 + (ds_w - 80)/2, dy), ds['name'], fill='black', font=font_ds_name, anchor='mm')

    # ==========================================
    # LEFT FLOWS: Administrator <-> Processes
    # ==========================================
    # P1.1: User Authentication
    y_in = 125
    px_in = circle_x(cx, 170, pr, y_in, 'left')
    draw_path(draw, [(240, ent_y1), (240, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Login Credentials\n(email, password)", (240 + px_in)/2, y_in, 'above', font_flow)

    y_out = 215
    px_out = circle_x(cx, 170, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (170, y_out), (170, ent_y1)], arrow_end=True)
    draw_flow_label(draw, "Authentication Response\n(JWT token, admin role)", (170 + px_out)/2, y_out, 'below', font_flow)

    # P1.2: User Account Administration
    y_in = 385
    px_in = circle_x(cx, 430, pr, y_in, 'left')
    draw_path(draw, [(270, ent_y1), (270, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "User Account Requests\n(create, role update, delete)", (270 + px_in)/2, y_in, 'above', font_flow)

    y_out = 475
    px_out = circle_x(cx, 430, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (210, y_out), (210, ent_y1)], arrow_end=True)
    draw_flow_label(draw, "Operation Status &\nUser Catalog Records", (210 + px_out)/2, y_out, 'below', font_flow)

    # P1.3: Capture Engine Control
    y_in = 645
    px_in = circle_x(cx, 690, pr, y_in, 'left')
    draw_path(draw, [(ent_x2, 840), (330, 840), (330, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Capture Engine Commands\n(start/stop, mode, interface)", (330 + px_in)/2, y_in, 'above', font_flow)

    y_out = 735
    px_out = circle_x(cx, 690, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (380, y_out), (380, 860), (ent_x2, 860)], arrow_end=True)
    draw_flow_label(draw, "Capture Sensor Status &\nNetwork Interfaces List", (380 + px_out)/2, y_out, 'below', font_flow)

    # P1.4: Traffic & Device Monitoring (directly horizontal)
    y_in = 925
    px_in = circle_x(cx, 950, pr, y_in, 'left')
    draw_path(draw, [(ent_x2, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Traffic Query Filters &\nDevice Classifications", (ent_x2 + px_in)/2, y_in, 'above', font_flow)

    y_out = 975
    px_out = circle_x(cx, 950, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (ent_x2, y_out)], arrow_end=True)
    draw_flow_label(draw, "Live Packet Stream, Traffic Stats\n& Device Inventory with Risks", (ent_x2 + px_out)/2, y_out, 'below', font_flow)

    # P1.5: Threat Alert Triage
    y_in = 1165
    px_in = circle_x(cx, 1210, pr, y_in, 'left')
    draw_path(draw, [(ent_x2, 1040), (380, 1040), (380, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Threat Alert Query Filters &\nTriage Updates (ack/resolve)", (380 + px_in)/2, y_in, 'above', font_flow)

    y_out = 1255
    px_out = circle_x(cx, 1210, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (330, y_out), (330, 1060), (ent_x2, 1060)], arrow_end=True)
    draw_flow_label(draw, "Threat Alerts List, Severity\nMetrics & Triage Confirmation", (330 + px_out)/2, y_out, 'below', font_flow)

    # P1.6: Detection Rules Configuration
    y_in = 1425
    px_in = circle_x(cx, 1470, pr, y_in, 'left')
    draw_path(draw, [(270, ent_y2), (270, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Rule Tuning Parameters\n(threshold, window) & Toggles", (270 + px_in)/2, y_in, 'above', font_flow)

    y_out = 1515
    px_out = circle_x(cx, 1470, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (210, y_out), (210, ent_y2)], arrow_end=True)
    draw_flow_label(draw, "Detection Rules Catalog &\nRule State Confirmation", (210 + px_out)/2, y_out, 'below', font_flow)

    # P1.7: Security Reports Management
    y_in = 1685
    px_in = circle_x(cx, 1730, pr, y_in, 'left')
    draw_path(draw, [(240, ent_y2), (240, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Report Generation Request\n(type, format, range) & Delete", (240 + px_in)/2, y_in, 'above', font_flow)

    y_out = 1775
    px_out = circle_x(cx, 1730, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (170, y_out), (170, ent_y2)], arrow_end=True)
    draw_flow_label(draw, "System Security Reports &\nExport File Stream (PDF/CSV)", (170 + px_out)/2, y_out, 'below', font_flow)

    # ==========================================
    # RIGHT FLOWS: Processes <-> Data Stores
    # ==========================================
    # P1.1 <-> D1 Users & Sessions
    y_p11_to_d1 = 125
    px11_r1 = circle_x(cx, 170, pr, y_p11_to_d1, 'right')
    draw_path(draw, [(px11_r1, y_p11_to_d1), (1450, y_p11_to_d1), (1450, 280), (ds_x, 280)], arrow_end=True)
    draw_flow_label(draw, "Credentials Query &\nSession Verification", (px11_r1 + 1450)/2, y_p11_to_d1, 'above', font_flow)

    y_d1_to_p11 = 215
    px11_r2 = circle_x(cx, 170, pr, y_d1_to_p11, 'right')
    draw_path(draw, [(ds_x, 320), (1400, 320), (1400, y_d1_to_p11), (px11_r2, y_d1_to_p11)], arrow_end=True)
    draw_flow_label(draw, "User Records, Password Hash\n& Active Session State", (px11_r2 + 1400)/2, y_d1_to_p11, 'below', font_flow)

    # P1.2 <-> D1 Users & Sessions
    y_p12_to_d1 = 385
    px12_r1 = circle_x(cx, 430, pr, y_p12_to_d1, 'right')
    draw_path(draw, [(px12_r1, y_p12_to_d1), (1400, y_p12_to_d1), (1400, 280), (ds_x, 280)], arrow_end=True)
    draw_flow_label(draw, "User Account Mutations\n(insert, update, delete)", (px12_r1 + 1400)/2, y_p12_to_d1, 'above', font_flow)

    y_d1_to_p12 = 475
    px12_r2 = circle_x(cx, 430, pr, y_d1_to_p12, 'right')
    draw_path(draw, [(ds_x, 320), (1450, 320), (1450, y_d1_to_p12), (px12_r2, y_d1_to_p12)], arrow_end=True)
    draw_flow_label(draw, "User Profiles &\nAccount Catalog Records", (px12_r2 + 1450)/2, y_d1_to_p12, 'below', font_flow)

    # P1.3 <-> D6 Capture Settings (directly horizontal)
    y_p13_to_d6 = 670
    px13_r1 = circle_x(cx, 690, pr, y_p13_to_d6, 'right')
    draw_path(draw, [(px13_r1, y_p13_to_d6), (ds_x, y_p13_to_d6)], arrow_end=True)
    draw_flow_label(draw, "Capture State Updates\n(is_running, mode, iface)", (px13_r1 + ds_x)/2, y_p13_to_d6, 'above', font_flow)

    y_d6_to_p13 = 710
    px13_r2 = circle_x(cx, 690, pr, y_d6_to_p13, 'right')
    draw_path(draw, [(ds_x, y_d6_to_p13), (px13_r2, y_d6_to_p13)], arrow_end=True)
    draw_flow_label(draw, "Current Capture Settings\n& Engine Status", (px13_r2 + ds_x)/2, y_d6_to_p13, 'below', font_flow)

    # P1.4 <-> D2 Network Traffic & D4 Device Inventory
    # D2 -> P1.4
    y_d2_to_p14 = 890
    px14_r1 = circle_x(cx, 950, pr, y_d2_to_p14, 'right')
    draw_path(draw, [(ds_x, data_stores["D2"]["y"]), (1450, data_stores["D2"]["y"]), (1450, y_d2_to_p14), (px14_r1, y_d2_to_p14)], arrow_end=True)
    draw_flow_label(draw, "Captured Packet Records &\nProtocol Volume Data", (px14_r1 + 1450)/2, y_d2_to_p14, 'above', font_flow)

    # D4 -> P1.4
    y_d4_to_p14 = 950
    px14_r2 = circle_x(cx, 950, pr, y_d4_to_p14, 'right')
    draw_path(draw, [(ds_x, data_stores["D4"]["y"] - 22), (1400, data_stores["D4"]["y"] - 22), (1400, y_d4_to_p14), (px14_r2, y_d4_to_p14)], arrow_end=True)
    draw_flow_label(draw, "Device Inventory Records\n& Risk Metrics", (px14_r2 + 1400)/2, y_d4_to_p14, 'above', font_flow)

    # P1.4 -> D4
    y_p14_to_d4 = 1010
    px14_r3 = circle_x(cx, 950, pr, y_p14_to_d4, 'right')
    draw_path(draw, [(px14_r3, y_p14_to_d4), (1450, y_p14_to_d4), (1450, data_stores["D4"]["y"] + 22), (ds_x, data_stores["D4"]["y"] + 22)], arrow_end=True)
    draw_flow_label(draw, "Device Identity Updates\n(hostname, device type)", (px14_r3 + 1450)/2, y_p14_to_d4, 'below', font_flow)

    # P1.5 <-> D3 Threat Alerts (directly horizontal)
    y_d3_to_p15 = 1190
    px15_r1 = circle_x(cx, 1210, pr, y_d3_to_p15, 'right')
    draw_path(draw, [(ds_x, y_d3_to_p15), (px15_r1, y_d3_to_p15)], arrow_end=True)
    draw_flow_label(draw, "Threat Alert Incidents &\nDetection Metadata", (px15_r1 + ds_x)/2, y_d3_to_p15, 'above', font_flow)

    y_p15_to_d3 = 1230
    px15_r2 = circle_x(cx, 1210, pr, y_p15_to_d3, 'right')
    draw_path(draw, [(px15_r2, y_p15_to_d3), (ds_x, y_p15_to_d3)], arrow_end=True)
    draw_flow_label(draw, "Alert Status Changes\n(acknowledged, resolved)", (px15_r2 + ds_x)/2, y_p15_to_d3, 'below', font_flow)

    # P1.6 <-> D5 Detection Rules (directly horizontal)
    y_p16_to_d5 = 1450
    px16_r1 = circle_x(cx, 1470, pr, y_p16_to_d5, 'right')
    draw_path(draw, [(px16_r1, y_p16_to_d5), (ds_x, y_p16_to_d5)], arrow_end=True)
    draw_flow_label(draw, "Updated Threshold Values,\nTime Windows & Toggles", (px16_r1 + ds_x)/2, y_p16_to_d5, 'above', font_flow)

    y_d5_to_p16 = 1490
    px16_r2 = circle_x(cx, 1470, pr, y_d5_to_p16, 'right')
    draw_path(draw, [(ds_x, y_d5_to_p16), (px16_r2, y_d5_to_p16)], arrow_end=True)
    draw_flow_label(draw, "Active Detection Rule\nRulesets & Configurations", (px16_r2 + ds_x)/2, y_d5_to_p16, 'below', font_flow)

    # P1.7 <-> D7 Security Reports (and bus lines from D2, D3, D4)
    bus_d2 = 2030
    bus_d3 = 1980
    bus_d4 = 1930

    # D2 -> P1.7
    y_d2_rep = 1640
    px17_r1 = circle_x(cx, 1730, pr, y_d2_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D2"]["y"]), (bus_d2, data_stores["D2"]["y"]), (bus_d2, y_d2_rep), (px17_r1, y_d2_rep)], arrow_end=True)
    draw_flow_label(draw, "Traffic Logs (for reports)", (px17_r1 + ds_x)/2, y_d2_rep, 'above', font_flow)

    # D3 -> P1.7
    y_d3_rep = 1675
    px17_r2 = circle_x(cx, 1730, pr, y_d3_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D3"]["y"]), (bus_d3, data_stores["D3"]["y"]), (bus_d3, y_d3_rep), (px17_r2, y_d3_rep)], arrow_end=True)
    draw_flow_label(draw, "Alert Records (for reports)", (px17_r2 + ds_x)/2, y_d3_rep, 'above', font_flow)

    # D4 -> P1.7
    y_d4_rep = 1710
    px17_r3 = circle_x(cx, 1730, pr, y_d4_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D4"]["y"]), (bus_d4, data_stores["D4"]["y"]), (bus_d4, y_d4_rep), (px17_r3, y_d4_rep)], arrow_end=True)
    draw_flow_label(draw, "Device Stats (for reports)", (px17_r3 + ds_x)/2, y_d4_rep, 'above', font_flow)

    # P1.7 -> D7 (insert generated report)
    y_p17_to_d7 = 1750
    px17_r4 = circle_x(cx, 1730, pr, y_p17_to_d7, 'right')
    draw_path(draw, [(px17_r4, y_p17_to_d7), (1450, y_p17_to_d7), (1450, data_stores["D7"]["y"] - 18), (ds_x, data_stores["D7"]["y"] - 18)], arrow_end=True)
    draw_flow_label(draw, "Generated Report File &\nMetadata (insert)", (px17_r4 + 1450)/2, y_p17_to_d7, 'below', font_flow)

    # D7 -> P1.7 (read report records & file stream)
    y_d7_to_p17 = 1815
    px17_r5 = circle_x(cx, 1730, pr, y_d7_to_p17, 'right')
    draw_path(draw, [(ds_x, data_stores["D7"]["y"] + 22), (1400, data_stores["D7"]["y"] + 22), (1400, y_d7_to_p17), (px17_r5, y_d7_to_p17)], arrow_end=True)
    draw_flow_label(draw, "All Stored Report Records &\nFile Stream (download/delete)", (px17_r5 + 1400)/2, y_d7_to_p17, 'below', font_flow)

    img.save(output_path)
    print(f"[Admin DFD] Generated at: {output_path}")


# ==============================================================================
# 2. NORMAL USER LEVEL 1 DFD GENERATION
# ==============================================================================
def generate_user_dfd(output_path):
    width = 2080
    height = 1600
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)

    font_title = get_font('bold', 36)
    font_entity = get_font('bold', 26)
    font_proc_num = get_font('bold', 24)
    font_proc_name = get_font('bold', 17)
    font_ds_id = get_font('bold', 24)
    font_ds_name = get_font('bold', 17)
    font_flow = get_font('bold', 16)

    # Title
    draw.text((width / 2, 45), "NetSentinel System – Level 1 DFD (Normal User)", fill='black', font=font_title, anchor='mm')

    # External Entity: Normal User (Security Analyst)
    ent_x1, ent_y1, ent_x2, ent_y2 = 40, 660, 270, 920
    draw.rectangle([ent_x1, ent_y1, ent_x2, ent_y2], outline='black', width=3)
    draw.text(((ent_x1 + ent_x2)/2, (ent_y1 + ent_y2)/2 - 16), "Normal User", fill='black', font=font_entity, anchor='mm')
    draw.text(((ent_x1 + ent_x2)/2, (ent_y1 + ent_y2)/2 + 20), "(Security Analyst)", fill='black', font=get_font('bold', 18), anchor='mm')

    # 5 Processes (Center Column)
    cx = 870
    pr = 95
    processes = [
        {"id": "1.1", "name": "User Registration\n& Authentication", "y": 190},
        {"id": "1.2", "name": "Live Traffic &\nDevice Monitoring", "y": 490},
        {"id": "1.3", "name": "Threat Alerts\nInspection", "y": 790},
        {"id": "1.4", "name": "Detection Rules &\nSensor Viewing", "y": 1090},
        {"id": "1.5", "name": "User Reports\nManagement", "y": 1390},
    ]

    for p in processes:
        py = p['y']
        draw.ellipse([cx - pr, py - pr, cx + pr, py + pr], outline='black', width=3)
        draw.text((cx, py - 24), p['id'], fill='black', font=font_proc_num, anchor='mm')
        draw.text((cx, py + 18), p['name'], fill='black', font=font_proc_name, anchor='mm', align='center')

    # 7 Data Stores (Right Side)
    ds_x = 1530
    ds_w = 340
    ds_h = 76
    data_stores = {
        "D1": {"name": "Users & Sessions", "y": 190},
        "D2": {"name": "Network Traffic", "y": 410},
        "D4": {"name": "Device Inventory", "y": 570},
        "D3": {"name": "Threat Alerts", "y": 790},
        "D5": {"name": "Detection Rules", "y": 1010},
        "D6": {"name": "Capture Settings", "y": 1170},
        "D7": {"name": "Security Reports (Owned)", "y": 1420},
    }

    for ds_id, ds in data_stores.items():
        dy = ds['y']
        draw.line([(ds_x + ds_w, dy - ds_h/2), (ds_x, dy - ds_h/2), (ds_x, dy + ds_h/2), (ds_x + ds_w, dy + ds_h/2)], fill='black', width=3)
        draw.line([(ds_x + 80, dy - ds_h/2), (ds_x + 80, dy + ds_h/2)], fill='black', width=3)
        draw.text((ds_x + 40, dy), ds_id, fill='black', font=font_ds_id, anchor='mm')
        draw.text((ds_x + 80 + (ds_w - 80)/2, dy), ds['name'], fill='black', font=font_ds_name, anchor='mm')

    # ==========================================
    # LEFT FLOWS: Normal User <-> Processes
    # ==========================================
    # P1.1: Registration & Authentication
    y_in = 145
    px_in = circle_x(cx, 190, pr, y_in, 'left')
    draw_path(draw, [(240, ent_y1), (240, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Registration Details (name, email, pass)\n/ Login Credentials", (240 + px_in)/2, y_in, 'above', font_flow)

    y_out = 235
    px_out = circle_x(cx, 190, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (170, y_out), (170, ent_y1)], arrow_end=True)
    draw_flow_label(draw, "Registration Confirmation /\nAuth Response (JWT, role='user')", (170 + px_out)/2, y_out, 'below', font_flow)

    # P1.2: Traffic & Device Monitoring (Read-Only)
    y_in = 445
    px_in = circle_x(cx, 490, pr, y_in, 'left')
    draw_path(draw, [(270, ent_y1), (270, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Traffic Filter Query Criteria &\nDevice Inspection Request", (270 + px_in)/2, y_in, 'above', font_flow)

    y_out = 535
    px_out = circle_x(cx, 490, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (210, y_out), (210, ent_y1)], arrow_end=True)
    draw_flow_label(draw, "Live Packet Stream, Protocol\nDistribution & Device Inventory", (210 + px_out)/2, y_out, 'below', font_flow)

    # P1.3: Threat Alerts Inspection (strictly horizontal)
    y_in = 765
    px_in = circle_x(cx, 790, pr, y_in, 'left')
    draw_path(draw, [(ent_x2, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Threat Alert Query Filters\n(severity, type, IP, date)", (ent_x2 + px_in)/2, y_in, 'above', font_flow)

    y_out = 815
    px_out = circle_x(cx, 790, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (ent_x2, y_out)], arrow_end=True)
    draw_flow_label(draw, "Threat Alerts List, Severity\nBreakdown & Incidents (Read-Only)", (ent_x2 + px_out)/2, y_out, 'below', font_flow)

    # P1.4: Detection Rules & Sensor Viewing (Read-Only)
    y_in = 1045
    px_in = circle_x(cx, 1090, pr, y_in, 'left')
    draw_path(draw, [(270, ent_y2), (270, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Detection Rules & Capture Sensor\nStatus Queries (Read-Only)", (270 + px_in)/2, y_in, 'above', font_flow)

    y_out = 1135
    px_out = circle_x(cx, 1090, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (210, y_out), (210, ent_y2)], arrow_end=True)
    draw_flow_label(draw, "Active Rule Thresholds, Time\nWindows & Sensor State (Read-Only)", (210 + px_out)/2, y_out, 'below', font_flow)

    # P1.5: User Reports Management (User-Owned)
    y_in = 1345
    px_in = circle_x(cx, 1390, pr, y_in, 'left')
    draw_path(draw, [(240, ent_y2), (240, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Report Generation Request &\nDownload/Delete Own Report", (240 + px_in)/2, y_in, 'above', font_flow)

    y_out = 1435
    px_out = circle_x(cx, 1390, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (170, y_out), (170, ent_y2)], arrow_end=True)
    draw_flow_label(draw, "User-Owned Reports List, PDF/CSV\nExport & Deletion Status", (170 + px_out)/2, y_out, 'below', font_flow)

    # ==========================================
    # RIGHT FLOWS: Processes <-> Data Stores
    # ==========================================
    # P1.1 <-> D1 Users & Sessions (Horizontal)
    y_p11_to_d1 = 170
    px11_r1 = circle_x(cx, 190, pr, y_p11_to_d1, 'right')
    draw_path(draw, [(px11_r1, y_p11_to_d1), (ds_x, y_p11_to_d1)], arrow_end=True)
    draw_flow_label(draw, "New User Registration\n(role='user') & Session State", (px11_r1 + ds_x)/2, y_p11_to_d1, 'above', font_flow)

    y_d1_to_p11 = 210
    px11_r2 = circle_x(cx, 190, pr, y_d1_to_p11, 'right')
    draw_path(draw, [(ds_x, y_d1_to_p11), (px11_r2, y_d1_to_p11)], arrow_end=True)
    draw_flow_label(draw, "User Profile Records &\nAuthentication Validation", (px11_r2 + ds_x)/2, y_d1_to_p11, 'below', font_flow)

    # P1.2 <-> D2 Network Traffic & D4 Device Inventory (Read-Only)
    y_d2_to_p12 = 460
    px12_r1 = circle_x(cx, 490, pr, y_d2_to_p12, 'right')
    draw_path(draw, [(ds_x, data_stores["D2"]["y"]), (1450, data_stores["D2"]["y"]), (1450, y_d2_to_p12), (px12_r1, y_d2_to_p12)], arrow_end=True)
    draw_flow_label(draw, "Captured Packet Logs &\nTraffic Volume Data (Read-Only)", (px12_r1 + 1450)/2, y_d2_to_p12, 'above', font_flow)

    y_d4_to_p12 = 520
    px12_r2 = circle_x(cx, 490, pr, y_d4_to_p12, 'right')
    draw_path(draw, [(ds_x, data_stores["D4"]["y"]), (1450, data_stores["D4"]["y"]), (1450, y_d4_to_p12), (px12_r2, y_d4_to_p12)], arrow_end=True)
    draw_flow_label(draw, "Device Inventory Records &\nRisk Metrics (Read-Only)", (px12_r2 + 1450)/2, y_d4_to_p12, 'below', font_flow)

    # P1.3 <-> D3 Threat Alerts (directly horizontal, Read-Only)
    y_d3_to_p13 = 790
    px13_r = circle_x(cx, 790, pr, y_d3_to_p13, 'right')
    draw_path(draw, [(ds_x, y_d3_to_p13), (px13_r, y_d3_to_p13)], arrow_end=True)
    draw_flow_label(draw, "Threat Alert Records &\nIncident Details (Read-Only)", (px13_r + ds_x)/2, y_d3_to_p13, 'above', font_flow)

    # P1.4 <-> D5 Detection Rules & D6 Capture Settings (Read-Only)
    y_d5_to_p14 = 1060
    px14_r1 = circle_x(cx, 1090, pr, y_d5_to_p14, 'right')
    draw_path(draw, [(ds_x, data_stores["D5"]["y"]), (1450, data_stores["D5"]["y"]), (1450, y_d5_to_p14), (px14_r1, y_d5_to_p14)], arrow_end=True)
    draw_flow_label(draw, "Active Detection Rule Configs\n& Thresholds (Read-Only)", (px14_r1 + 1450)/2, y_d5_to_p14, 'above', font_flow)

    y_d6_to_p14 = 1120
    px14_r2 = circle_x(cx, 1090, pr, y_d6_to_p14, 'right')
    draw_path(draw, [(ds_x, data_stores["D6"]["y"]), (1450, data_stores["D6"]["y"]), (1450, y_d6_to_p14), (px14_r2, y_d6_to_p14)], arrow_end=True)
    draw_flow_label(draw, "Capture Engine Status &\nInterface Settings (Read-Only)", (px14_r2 + 1450)/2, y_d6_to_p14, 'below', font_flow)

    # P1.5 <-> D7 Security Reports (User-Owned) and bus lines from D2, D3, D4
    bus_d2 = 2030
    bus_d3 = 1980
    bus_d4 = 1930

    # D2 -> P1.5
    y_d2_rep = 1315
    px15_r1 = circle_x(cx, 1390, pr, y_d2_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D2"]["y"]), (bus_d2, data_stores["D2"]["y"]), (bus_d2, y_d2_rep), (px15_r1, y_d2_rep)], arrow_end=True)
    draw_flow_label(draw, "Traffic Data (for user report compilation)", (px15_r1 + ds_x)/2, y_d2_rep, 'above', font_flow)

    # D3 -> P1.5
    y_d3_rep = 1345
    px15_r2 = circle_x(cx, 1390, pr, y_d3_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D3"]["y"]), (bus_d3, data_stores["D3"]["y"]), (bus_d3, y_d3_rep), (px15_r2, y_d3_rep)], arrow_end=True)
    draw_flow_label(draw, "Alert Records (for user report compilation)", (px15_r2 + ds_x)/2, y_d3_rep, 'above', font_flow)

    # D4 -> P1.5
    y_d4_rep = 1375
    px15_r3 = circle_x(cx, 1390, pr, y_d4_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D4"]["y"]), (bus_d4, data_stores["D4"]["y"]), (bus_d4, y_d4_rep), (px15_r3, y_d4_rep)], arrow_end=True)
    draw_flow_label(draw, "Device Metrics (for user report compilation)", (px15_r3 + ds_x)/2, y_d4_rep, 'above', font_flow)

    # P1.5 -> D7 (insert user report)
    y_p15_to_d7 = 1405
    px15_r4 = circle_x(cx, 1390, pr, y_p15_to_d7, 'right')
    draw_path(draw, [(px15_r4, y_p15_to_d7), (1450, y_p15_to_d7), (1450, data_stores["D7"]["y"] - 18), (ds_x, data_stores["D7"]["y"] - 18)], arrow_end=True)
    draw_flow_label(draw, "User Report Metadata &\nDocument (WHERE user_id)", (px15_r4 + 1450)/2, y_p15_to_d7, 'below', font_flow)

    # D7 -> P1.5 (read own reports)
    y_d7_to_p15 = 1455
    px15_r5 = circle_x(cx, 1390, pr, y_d7_to_p15, 'right')
    draw_path(draw, [(ds_x, data_stores["D7"]["y"] + 18), (1400, data_stores["D7"]["y"] + 18), (1400, y_d7_to_p15), (px15_r5, y_d7_to_p15)], arrow_end=True)
    draw_flow_label(draw, "User's Own Report Records &\nStored Stream (download)", (px15_r5 + 1400)/2, y_d7_to_p15, 'below', font_flow)

    img.save(output_path)
    print(f"[User DFD] Generated at: {output_path}")


if __name__ == '__main__':
    admin_large = r'd:\netsentinel\dfd-level-1-admin-large.png'
    user_large = r'd:\netsentinel\dfd-level-1-user-large.png'
    generate_admin_dfd(admin_large)
    generate_user_dfd(user_large)
