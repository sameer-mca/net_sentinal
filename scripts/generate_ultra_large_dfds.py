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

def arrow(draw, tip, angle_rad, length=20, w=14):
    bx = tip[0] - length * math.cos(angle_rad)
    by = tip[1] - length * math.sin(angle_rad)
    px = (w / 2.0) * -math.sin(angle_rad)
    py = (w / 2.0) * math.cos(angle_rad)
    draw.polygon([tip, (bx + px, by + py), (bx - px, by - py)], fill='black')

def draw_path(draw, pts, arrow_end=True, arrow_start=False, width=4):
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
    margin = 10
    y_pos = y_line - margin - (h / 2.0) if side == 'above' else y_line + margin + (h / 2.0)
    draw.text((x_mid, y_pos), text, fill='black', font=font, anchor='mm', align='center')


# ==============================================================================
# 1. ADMIN LEVEL 1 DFD GENERATION (ULTRA LARGE READABLE TEXT - SMALLEST >= 14px)
# ==============================================================================
def generate_admin_dfd(output_path):
    width = 2520
    height = 2440
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)

    # Master typography - smallest text is font_flow at size 26 (rendered glyphs >= 14px)
    font_title = get_font('bold', 46)
    font_entity = get_font('bold', 36)
    font_proc_num = get_font('bold', 36)
    font_proc_name = get_font('bold', 24)
    font_ds_id = get_font('bold', 34)
    font_ds_name = get_font('bold', 24)
    font_flow = get_font('bold', 26)

    # Diagram Title
    draw.text((width / 2, 55), "NetSentinel System – Level 1 DFD (Administrator)", fill='black', font=font_title, anchor='mm')

    # External Entity: Administrator (Left side)
    ent_x1, ent_y1, ent_x2, ent_y2 = 50, 980, 370, 1340
    draw.rectangle([ent_x1, ent_y1, ent_x2, ent_y2], outline='black', width=4)
    draw.text(((ent_x1 + ent_x2)/2, (ent_y1 + ent_y2)/2), "Administrator", fill='black', font=font_entity, anchor='mm')

    # 7 Processes (Center Column)
    cx = 1100
    pr = 125
    processes = [
        {"id": "1.1", "name": "User\nAuthentication", "y": 200},
        {"id": "1.2", "name": "User Account\nAdministration", "y": 520},
        {"id": "1.3", "name": "Capture Engine\nControl", "y": 840},
        {"id": "1.4", "name": "Traffic & Device\nMonitoring", "y": 1160},
        {"id": "1.5", "name": "Threat Alert\nTriage", "y": 1480},
        {"id": "1.6", "name": "Detection Rules\nConfiguration", "y": 1800},
        {"id": "1.7", "name": "Security Reports\nManagement", "y": 2120},
    ]

    for p in processes:
        py = p['y']
        draw.ellipse([cx - pr, py - pr, cx + pr, py + pr], outline='black', width=4)
        draw.text((cx, py - 32), p['id'], fill='black', font=font_proc_num, anchor='mm')
        draw.text((cx, py + 24), p['name'], fill='black', font=font_proc_name, anchor='mm', align='center')

    # 7 Data Stores (Right Side)
    ds_x = 1850
    ds_w = 420
    ds_h = 95
    data_stores = {
        "D1": {"name": "Users & Sessions", "y": 360},
        "D6": {"name": "Capture Settings", "y": 840},
        "D2": {"name": "Network Traffic", "y": 1050},
        "D4": {"name": "Device Inventory", "y": 1270},
        "D3": {"name": "Threat Alerts", "y": 1480},
        "D5": {"name": "Detection Rules", "y": 1800},
        "D7": {"name": "Security Reports", "y": 2210},
    }

    for ds_id, ds in data_stores.items():
        dy = ds['y']
        draw.line([(ds_x + ds_w, dy - ds_h/2), (ds_x, dy - ds_h/2), (ds_x, dy + ds_h/2), (ds_x + ds_w, dy + ds_h/2)], fill='black', width=4)
        draw.line([(ds_x + 100, dy - ds_h/2), (ds_x + 100, dy + ds_h/2)], fill='black', width=4)
        draw.text((ds_x + 50, dy), ds_id, fill='black', font=font_ds_id, anchor='mm')
        draw.text((ds_x + 100 + (ds_w - 100)/2, dy), ds['name'], fill='black', font=font_ds_name, anchor='mm')

    # ==========================================
    # LEFT FLOWS: Administrator <-> Processes
    # ==========================================
    # P1.1: User Authentication
    y_in = 145
    px_in = circle_x(cx, 200, pr, y_in, 'left')
    draw_path(draw, [(320, ent_y1), (320, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Login Credentials\n(email, password)", (320 + px_in)/2, y_in, 'above', font_flow)

    y_out = 255
    px_out = circle_x(cx, 200, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (220, y_out), (220, ent_y1)], arrow_end=True)
    draw_flow_label(draw, "Authentication Response\n(JWT token, admin role)", (220 + px_out)/2, y_out, 'below', font_flow)

    # P1.2: User Account Administration
    y_in = 465
    px_in = circle_x(cx, 520, pr, y_in, 'left')
    draw_path(draw, [(360, ent_y1), (360, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "User Account Requests\n(create, role update, delete)", (360 + px_in)/2, y_in, 'above', font_flow)

    y_out = 575
    px_out = circle_x(cx, 520, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (270, y_out), (270, ent_y1)], arrow_end=True)
    draw_flow_label(draw, "Operation Status &\nUser Catalog Records", (270 + px_out)/2, y_out, 'below', font_flow)

    # P1.3: Capture Engine Control
    y_in = 785
    px_in = circle_x(cx, 840, pr, y_in, 'left')
    draw_path(draw, [(ent_x2, 1000), (450, 1000), (450, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Capture Engine Commands\n(start/stop, mode, interface)", (450 + px_in)/2, y_in, 'above', font_flow)

    y_out = 895
    px_out = circle_x(cx, 840, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (510, y_out), (510, 1030), (ent_x2, 1030)], arrow_end=True)
    draw_flow_label(draw, "Capture Sensor Status &\nNetwork Interfaces List", (510 + px_out)/2, y_out, 'below', font_flow)

    # P1.4: Traffic & Device Monitoring (directly horizontal)
    y_in = 1125
    px_in = circle_x(cx, 1160, pr, y_in, 'left')
    draw_path(draw, [(ent_x2, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Traffic Query Filters &\nDevice Classifications", (ent_x2 + px_in)/2, y_in, 'above', font_flow)

    y_out = 1195
    px_out = circle_x(cx, 1160, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (ent_x2, y_out)], arrow_end=True)
    draw_flow_label(draw, "Live Packet Stream, Traffic Stats\n& Device Inventory with Risks", (ent_x2 + px_out)/2, y_out, 'below', font_flow)

    # P1.5: Threat Alert Triage
    y_in = 1425
    px_in = circle_x(cx, 1480, pr, y_in, 'left')
    draw_path(draw, [(ent_x2, 1290), (510, 1290), (510, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Threat Alert Query Filters &\nTriage Updates (ack/resolve)", (510 + px_in)/2, y_in, 'above', font_flow)

    y_out = 1535
    px_out = circle_x(cx, 1480, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (450, y_out), (450, 1320), (ent_x2, 1320)], arrow_end=True)
    draw_flow_label(draw, "Threat Alerts List, Severity\nMetrics & Triage Confirmation", (450 + px_out)/2, y_out, 'below', font_flow)

    # P1.6: Detection Rules Configuration
    y_in = 1745
    px_in = circle_x(cx, 1800, pr, y_in, 'left')
    draw_path(draw, [(360, ent_y2), (360, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Rule Tuning Parameters\n(threshold, window) & Toggles", (360 + px_in)/2, y_in, 'above', font_flow)

    y_out = 1855
    px_out = circle_x(cx, 1800, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (270, y_out), (270, ent_y2)], arrow_end=True)
    draw_flow_label(draw, "Detection Rules Catalog &\nRule State Confirmation", (270 + px_out)/2, y_out, 'below', font_flow)

    # P1.7: Security Reports Management
    y_in = 2065
    px_in = circle_x(cx, 2120, pr, y_in, 'left')
    draw_path(draw, [(320, ent_y2), (320, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Report Generation Request\n(type, format, range) & Delete", (320 + px_in)/2, y_in, 'above', font_flow)

    y_out = 2175
    px_out = circle_x(cx, 2120, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (220, y_out), (220, ent_y2)], arrow_end=True)
    draw_flow_label(draw, "System Security Reports &\nExport File Stream (PDF/CSV)", (220 + px_out)/2, y_out, 'below', font_flow)

    # ==========================================
    # RIGHT FLOWS: Processes <-> Data Stores
    # ==========================================
    # P1.1 <-> D1 Users & Sessions
    y_p11_to_d1 = 145
    px11_r1 = circle_x(cx, 200, pr, y_p11_to_d1, 'right')
    draw_path(draw, [(px11_r1, y_p11_to_d1), (1750, y_p11_to_d1), (1750, 335), (ds_x, 335)], arrow_end=True)
    draw_flow_label(draw, "Credentials Query &\nSession Verification", (px11_r1 + 1750)/2, y_p11_to_d1, 'above', font_flow)

    y_d1_to_p11 = 255
    px11_r2 = circle_x(cx, 200, pr, y_d1_to_p11, 'right')
    draw_path(draw, [(ds_x, 385), (1690, 385), (1690, y_d1_to_p11), (px11_r2, y_d1_to_p11)], arrow_end=True)
    draw_flow_label(draw, "User Records, Password Hash\n& Active Session State", (px11_r2 + 1690)/2, y_d1_to_p11, 'below', font_flow)

    # P1.2 <-> D1 Users & Sessions
    y_p12_to_d1 = 465
    px12_r1 = circle_x(cx, 520, pr, y_p12_to_d1, 'right')
    draw_path(draw, [(px12_r1, y_p12_to_d1), (1690, y_p12_to_d1), (1690, 335), (ds_x, 335)], arrow_end=True)
    draw_flow_label(draw, "User Account Mutations\n(insert, update, delete)", (px12_r1 + 1690)/2, y_p12_to_d1, 'above', font_flow)

    y_d1_to_p12 = 575
    px12_r2 = circle_x(cx, 520, pr, y_d1_to_p12, 'right')
    draw_path(draw, [(ds_x, 385), (1750, 385), (1750, y_d1_to_p12), (px12_r2, y_d1_to_p12)], arrow_end=True)
    draw_flow_label(draw, "User Profiles &\nAccount Catalog Records", (px12_r2 + 1750)/2, y_d1_to_p12, 'below', font_flow)

    # P1.3 <-> D6 Capture Settings (directly horizontal)
    y_p13_to_d6 = 815
    px13_r1 = circle_x(cx, 840, pr, y_p13_to_d6, 'right')
    draw_path(draw, [(px13_r1, y_p13_to_d6), (ds_x, y_p13_to_d6)], arrow_end=True)
    draw_flow_label(draw, "Capture State Updates\n(is_running, mode, iface)", (px13_r1 + ds_x)/2, y_p13_to_d6, 'above', font_flow)

    y_d6_to_p13 = 865
    px13_r2 = circle_x(cx, 840, pr, y_d6_to_p13, 'right')
    draw_path(draw, [(ds_x, y_d6_to_p13), (px13_r2, y_d6_to_p13)], arrow_end=True)
    draw_flow_label(draw, "Current Capture Settings\n& Engine Status", (px13_r2 + ds_x)/2, y_d6_to_p13, 'below', font_flow)

    # P1.4 <-> D2 Network Traffic & D4 Device Inventory
    # D2 -> P1.4
    y_d2_to_p14 = 1085
    px14_r1 = circle_x(cx, 1160, pr, y_d2_to_p14, 'right')
    draw_path(draw, [(ds_x, data_stores["D2"]["y"]), (1750, data_stores["D2"]["y"]), (1750, y_d2_to_p14), (px14_r1, y_d2_to_p14)], arrow_end=True)
    draw_flow_label(draw, "Captured Packet Records &\nProtocol Volume Data", (px14_r1 + 1750)/2, y_d2_to_p14, 'above', font_flow)

    # D4 -> P1.4
    y_d4_to_p14 = 1160
    px14_r2 = circle_x(cx, 1160, pr, y_d4_to_p14, 'right')
    draw_path(draw, [(ds_x, data_stores["D4"]["y"] - 25), (1690, data_stores["D4"]["y"] - 25), (1690, y_d4_to_p14), (px14_r2, y_d4_to_p14)], arrow_end=True)
    draw_flow_label(draw, "Device Inventory Records\n& Risk Metrics", (px14_r2 + 1690)/2, y_d4_to_p14, 'above', font_flow)

    # P1.4 -> D4
    y_p14_to_d4 = 1235
    px14_r3 = circle_x(cx, 1160, pr, y_p14_to_d4, 'right')
    draw_path(draw, [(px14_r3, y_p14_to_d4), (1750, y_p14_to_d4), (1750, data_stores["D4"]["y"] + 25), (ds_x, data_stores["D4"]["y"] + 25)], arrow_end=True)
    draw_flow_label(draw, "Device Identity Updates\n(hostname, device type)", (px14_r3 + 1750)/2, y_p14_to_d4, 'below', font_flow)

    # P1.5 <-> D3 Threat Alerts (directly horizontal)
    y_d3_to_p15 = 1455
    px15_r1 = circle_x(cx, 1480, pr, y_d3_to_p15, 'right')
    draw_path(draw, [(ds_x, y_d3_to_p15), (px15_r1, y_d3_to_p15)], arrow_end=True)
    draw_flow_label(draw, "Threat Alert Incidents &\nDetection Metadata", (px15_r1 + ds_x)/2, y_d3_to_p15, 'above', font_flow)

    y_p15_to_d3 = 1505
    px15_r2 = circle_x(cx, 1480, pr, y_p15_to_d3, 'right')
    draw_path(draw, [(px15_r2, y_p15_to_d3), (ds_x, y_p15_to_d3)], arrow_end=True)
    draw_flow_label(draw, "Alert Status Changes\n(acknowledged, resolved)", (px15_r2 + ds_x)/2, y_p15_to_d3, 'below', font_flow)

    # P1.6 <-> D5 Detection Rules (directly horizontal)
    y_p16_to_d5 = 1775
    px16_r1 = circle_x(cx, 1800, pr, y_p16_to_d5, 'right')
    draw_path(draw, [(px16_r1, y_p16_to_d5), (ds_x, y_p16_to_d5)], arrow_end=True)
    draw_flow_label(draw, "Updated Threshold Values,\nTime Windows & Toggles", (px16_r1 + ds_x)/2, y_p16_to_d5, 'above', font_flow)

    y_d5_to_p16 = 1825
    px16_r2 = circle_x(cx, 1800, pr, y_d5_to_p16, 'right')
    draw_path(draw, [(ds_x, y_d5_to_p16), (px16_r2, y_d5_to_p16)], arrow_end=True)
    draw_flow_label(draw, "Active Detection Rule\nRulesets & Configurations", (px16_r2 + ds_x)/2, y_d5_to_p16, 'below', font_flow)

    # P1.7 <-> D7 Security Reports (and bus lines from D2, D3, D4)
    bus_d2 = 2450
    bus_d3 = 2390
    bus_d4 = 2330

    # D2 -> P1.7
    y_d2_rep = 1990
    px17_r1 = circle_x(cx, 2120, pr, y_d2_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D2"]["y"]), (bus_d2, data_stores["D2"]["y"]), (bus_d2, y_d2_rep), (px17_r1, y_d2_rep)], arrow_end=True)
    draw_flow_label(draw, "Traffic Logs (for reports)", (px17_r1 + ds_x)/2, y_d2_rep, 'above', font_flow)

    # D3 -> P1.7
    y_d3_rep = 2040
    px17_r2 = circle_x(cx, 2120, pr, y_d3_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D3"]["y"]), (bus_d3, data_stores["D3"]["y"]), (bus_d3, y_d3_rep), (px17_r2, y_d3_rep)], arrow_end=True)
    draw_flow_label(draw, "Alert Records (for reports)", (px17_r2 + ds_x)/2, y_d3_rep, 'above', font_flow)

    # D4 -> P1.7
    y_d4_rep = 2090
    px17_r3 = circle_x(cx, 2120, pr, y_d4_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D4"]["y"]), (bus_d4, data_stores["D4"]["y"]), (bus_d4, y_d4_rep), (px17_r3, y_d4_rep)], arrow_end=True)
    draw_flow_label(draw, "Device Stats (for reports)", (px17_r3 + ds_x)/2, y_d4_rep, 'above', font_flow)

    # P1.7 -> D7 (insert generated report)
    y_p17_to_d7 = 2150
    px17_r4 = circle_x(cx, 2120, pr, y_p17_to_d7, 'right')
    draw_path(draw, [(px17_r4, y_p17_to_d7), (1750, y_p17_to_d7), (1750, data_stores["D7"]["y"] - 25), (ds_x, data_stores["D7"]["y"] - 25)], arrow_end=True)
    draw_flow_label(draw, "Generated Report File &\nMetadata (insert)", (px17_r4 + 1750)/2, y_p17_to_d7, 'below', font_flow)

    # D7 -> P1.7 (read report records & file stream)
    y_d7_to_p17 = 2270
    px17_r5 = circle_x(cx, 2120, pr, y_d7_to_p17, 'right')
    draw_path(draw, [(ds_x, data_stores["D7"]["y"] + 25), (1690, data_stores["D7"]["y"] + 25), (1690, y_d7_to_p17), (px17_r5, y_d7_to_p17)], arrow_end=True)
    draw_flow_label(draw, "All Stored Report Records &\nFile Stream (download/delete)", (px17_r5 + 1690)/2, y_d7_to_p17, 'below', font_flow)

    img.save(output_path)
    print(f"[Admin DFD] Generated at: {output_path}")


# ==============================================================================
# 2. NORMAL USER LEVEL 1 DFD GENERATION (ULTRA LARGE READABLE TEXT - SMALLEST >= 14px)
# ==============================================================================
def generate_user_dfd(output_path):
    width = 2520
    height = 1960
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)

    font_title = get_font('bold', 46)
    font_entity = get_font('bold', 36)
    font_proc_num = get_font('bold', 36)
    font_proc_name = get_font('bold', 24)
    font_ds_id = get_font('bold', 34)
    font_ds_name = get_font('bold', 24)
    font_flow = get_font('bold', 26)

    # Title
    draw.text((width / 2, 55), "NetSentinel System – Level 1 DFD (Normal User)", fill='black', font=font_title, anchor='mm')

    # External Entity: Normal User (Security Analyst)
    ent_x1, ent_y1, ent_x2, ent_y2 = 50, 780, 370, 1140
    draw.rectangle([ent_x1, ent_y1, ent_x2, ent_y2], outline='black', width=4)
    draw.text(((ent_x1 + ent_x2)/2, (ent_y1 + ent_y2)/2 - 20), "Normal User", fill='black', font=font_entity, anchor='mm')
    draw.text(((ent_x1 + ent_x2)/2, (ent_y1 + ent_y2)/2 + 25), "(Security Analyst)", fill='black', font=get_font('bold', 26), anchor='mm')

    # 5 Processes (Center Column)
    cx = 1100
    pr = 125
    processes = [
        {"id": "1.1", "name": "User Registration\n& Authentication", "y": 220},
        {"id": "1.2", "name": "Live Traffic &\nDevice Monitoring", "y": 580},
        {"id": "1.3", "name": "Threat Alerts\nInspection", "y": 940},
        {"id": "1.4", "name": "Detection Rules &\nSensor Viewing", "y": 1300},
        {"id": "1.5", "name": "User Reports\nManagement", "y": 1660},
    ]

    for p in processes:
        py = p['y']
        draw.ellipse([cx - pr, py - pr, cx + pr, py + pr], outline='black', width=4)
        draw.text((cx, py - 32), p['id'], fill='black', font=font_proc_num, anchor='mm')
        draw.text((cx, py + 24), p['name'], fill='black', font=font_proc_name, anchor='mm', align='center')

    # 7 Data Stores (Right Side)
    ds_x = 1850
    ds_w = 420
    ds_h = 95
    data_stores = {
        "D1": {"name": "Users & Sessions", "y": 220},
        "D2": {"name": "Network Traffic", "y": 480},
        "D4": {"name": "Device Inventory", "y": 680},
        "D3": {"name": "Threat Alerts", "y": 940},
        "D5": {"name": "Detection Rules", "y": 1200},
        "D6": {"name": "Capture Settings", "y": 1400},
        "D7": {"name": "Security Reports (Owned)", "y": 1730},
    }

    for ds_id, ds in data_stores.items():
        dy = ds['y']
        draw.line([(ds_x + ds_w, dy - ds_h/2), (ds_x, dy - ds_h/2), (ds_x, dy + ds_h/2), (ds_x + ds_w, dy + ds_h/2)], fill='black', width=4)
        draw.line([(ds_x + 100, dy - ds_h/2), (ds_x + 100, dy + ds_h/2)], fill='black', width=4)
        draw.text((ds_x + 50, dy), ds_id, fill='black', font=font_ds_id, anchor='mm')
        draw.text((ds_x + 100 + (ds_w - 100)/2, dy), ds['name'], fill='black', font=font_ds_name, anchor='mm')

    # ==========================================
    # LEFT FLOWS: Normal User <-> Processes
    # ==========================================
    # P1.1: Registration & Authentication
    y_in = 165
    px_in = circle_x(cx, 220, pr, y_in, 'left')
    draw_path(draw, [(320, ent_y1), (320, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Registration Details (name, email, pass)\n/ Login Credentials", (320 + px_in)/2, y_in, 'above', font_flow)

    y_out = 275
    px_out = circle_x(cx, 220, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (220, y_out), (220, ent_y1)], arrow_end=True)
    draw_flow_label(draw, "Registration Confirmation /\nAuth Response (JWT, role='user')", (220 + px_out)/2, y_out, 'below', font_flow)

    # P1.2: Traffic & Device Monitoring (Read-Only)
    y_in = 525
    px_in = circle_x(cx, 580, pr, y_in, 'left')
    draw_path(draw, [(360, ent_y1), (360, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Traffic Filter Query Criteria &\nDevice Inspection Request", (360 + px_in)/2, y_in, 'above', font_flow)

    y_out = 635
    px_out = circle_x(cx, 580, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (270, y_out), (270, ent_y1)], arrow_end=True)
    draw_flow_label(draw, "Live Packet Stream, Protocol\nDistribution & Device Inventory", (270 + px_out)/2, y_out, 'below', font_flow)

    # P1.3: Threat Alerts Inspection (strictly horizontal)
    y_in = 910
    px_in = circle_x(cx, 940, pr, y_in, 'left')
    draw_path(draw, [(ent_x2, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Threat Alert Query Filters\n(severity, type, IP, date)", (ent_x2 + px_in)/2, y_in, 'above', font_flow)

    y_out = 970
    px_out = circle_x(cx, 940, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (ent_x2, y_out)], arrow_end=True)
    draw_flow_label(draw, "Threat Alerts List, Severity\nBreakdown & Incidents (Read-Only)", (ent_x2 + px_out)/2, y_out, 'below', font_flow)

    # P1.4: Detection Rules & Sensor Viewing (Read-Only)
    y_in = 1245
    px_in = circle_x(cx, 1300, pr, y_in, 'left')
    draw_path(draw, [(360, ent_y2), (360, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Detection Rules & Capture Sensor\nStatus Queries (Read-Only)", (360 + px_in)/2, y_in, 'above', font_flow)

    y_out = 1355
    px_out = circle_x(cx, 1300, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (270, y_out), (270, ent_y2)], arrow_end=True)
    draw_flow_label(draw, "Active Rule Thresholds, Time\nWindows & Sensor State (Read-Only)", (270 + px_out)/2, y_out, 'below', font_flow)

    # P1.5: User Reports Management (User-Owned)
    y_in = 1605
    px_in = circle_x(cx, 1660, pr, y_in, 'left')
    draw_path(draw, [(320, ent_y2), (320, y_in), (px_in, y_in)], arrow_end=True)
    draw_flow_label(draw, "Report Generation Request &\nDownload/Delete Own Report", (320 + px_in)/2, y_in, 'above', font_flow)

    y_out = 1715
    px_out = circle_x(cx, 1660, pr, y_out, 'left')
    draw_path(draw, [(px_out, y_out), (220, y_out), (220, ent_y2)], arrow_end=True)
    draw_flow_label(draw, "User-Owned Reports List, PDF/CSV\nExport & Deletion Status", (220 + px_out)/2, y_out, 'below', font_flow)

    # ==========================================
    # RIGHT FLOWS: Processes <-> Data Stores
    # ==========================================
    # P1.1 <-> D1 Users & Sessions (Horizontal)
    y_p11_to_d1 = 195
    px11_r1 = circle_x(cx, 220, pr, y_p11_to_d1, 'right')
    draw_path(draw, [(px11_r1, y_p11_to_d1), (ds_x, y_p11_to_d1)], arrow_end=True)
    draw_flow_label(draw, "New User Registration\n(role='user') & Session State", (px11_r1 + ds_x)/2, y_p11_to_d1, 'above', font_flow)

    y_d1_to_p11 = 245
    px11_r2 = circle_x(cx, 220, pr, y_d1_to_p11, 'right')
    draw_path(draw, [(ds_x, y_d1_to_p11), (px11_r2, y_d1_to_p11)], arrow_end=True)
    draw_flow_label(draw, "User Profile Records &\nAuthentication Validation", (px11_r2 + ds_x)/2, y_d1_to_p11, 'below', font_flow)

    # P1.2 <-> D2 Network Traffic & D4 Device Inventory (Read-Only)
    y_d2_to_p12 = 545
    px12_r1 = circle_x(cx, 580, pr, y_d2_to_p12, 'right')
    draw_path(draw, [(ds_x, data_stores["D2"]["y"]), (1750, data_stores["D2"]["y"]), (1750, y_d2_to_p12), (px12_r1, y_d2_to_p12)], arrow_end=True)
    draw_flow_label(draw, "Captured Packet Logs &\nTraffic Volume Data (Read-Only)", (px12_r1 + 1750)/2, y_d2_to_p12, 'above', font_flow)

    y_d4_to_p12 = 615
    px12_r2 = circle_x(cx, 580, pr, y_d4_to_p12, 'right')
    draw_path(draw, [(ds_x, data_stores["D4"]["y"]), (1750, data_stores["D4"]["y"]), (1750, y_d4_to_p12), (px12_r2, y_d4_to_p12)], arrow_end=True)
    draw_flow_label(draw, "Device Inventory Records &\nRisk Metrics (Read-Only)", (px12_r2 + 1750)/2, y_d4_to_p12, 'below', font_flow)

    # P1.3 <-> D3 Threat Alerts (directly horizontal, Read-Only)
    y_d3_to_p13 = 940
    px13_r = circle_x(cx, 940, pr, y_d3_to_p13, 'right')
    draw_path(draw, [(ds_x, y_d3_to_p13), (px13_r, y_d3_to_p13)], arrow_end=True)
    draw_flow_label(draw, "Threat Alert Records &\nIncident Details (Read-Only)", (px13_r + ds_x)/2, y_d3_to_p13, 'above', font_flow)

    # P1.4 <-> D5 Detection Rules & D6 Capture Settings (Read-Only)
    y_d5_to_p14 = 1265
    px14_r1 = circle_x(cx, 1300, pr, y_d5_to_p14, 'right')
    draw_path(draw, [(ds_x, data_stores["D5"]["y"]), (1750, data_stores["D5"]["y"]), (1750, y_d5_to_p14), (px14_r1, y_d5_to_p14)], arrow_end=True)
    draw_flow_label(draw, "Active Detection Rule Configs\n& Thresholds (Read-Only)", (px14_r1 + 1750)/2, y_d5_to_p14, 'above', font_flow)

    y_d6_to_p14 = 1335
    px14_r2 = circle_x(cx, 1300, pr, y_d6_to_p14, 'right')
    draw_path(draw, [(ds_x, data_stores["D6"]["y"]), (1750, data_stores["D6"]["y"]), (1750, y_d6_to_p14), (px14_r2, y_d6_to_p14)], arrow_end=True)
    draw_flow_label(draw, "Capture Engine Status &\nInterface Settings (Read-Only)", (px14_r2 + 1750)/2, y_d6_to_p14, 'below', font_flow)

    # P1.5 <-> D7 Security Reports (User-Owned) and bus lines from D2, D3, D4
    bus_d2 = 2450
    bus_d3 = 2390
    bus_d4 = 2330

    # D2 -> P1.5
    y_d2_rep = 1510
    px15_r1 = circle_x(cx, 1660, pr, y_d2_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D2"]["y"]), (bus_d2, data_stores["D2"]["y"]), (bus_d2, y_d2_rep), (px15_r1, y_d2_rep)], arrow_end=True)
    draw_flow_label(draw, "Traffic Data (for user report compilation)", (px15_r1 + ds_x)/2, y_d2_rep, 'above', font_flow)

    # D3 -> P1.5
    y_d3_rep = 1560
    px15_r2 = circle_x(cx, 1660, pr, y_d3_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D3"]["y"]), (bus_d3, data_stores["D3"]["y"]), (bus_d3, y_d3_rep), (px15_r2, y_d3_rep)], arrow_end=True)
    draw_flow_label(draw, "Alert Records (for user report compilation)", (px15_r2 + ds_x)/2, y_d3_rep, 'above', font_flow)

    # D4 -> P1.5
    y_d4_rep = 1610
    px15_r3 = circle_x(cx, 1660, pr, y_d4_rep, 'right')
    draw_path(draw, [(ds_x + ds_w, data_stores["D4"]["y"]), (bus_d4, data_stores["D4"]["y"]), (bus_d4, y_d4_rep), (px15_r3, y_d4_rep)], arrow_end=True)
    draw_flow_label(draw, "Device Metrics (for user report compilation)", (px15_r3 + ds_x)/2, y_d4_rep, 'above', font_flow)

    # P1.5 -> D7 (insert user report)
    y_p15_to_d7 = 1670
    px15_r4 = circle_x(cx, 1660, pr, y_p15_to_d7, 'right')
    draw_path(draw, [(px15_r4, y_p15_to_d7), (1750, y_p15_to_d7), (1750, data_stores["D7"]["y"] - 25), (ds_x, data_stores["D7"]["y"] - 25)], arrow_end=True)
    draw_flow_label(draw, "User Report Metadata &\nDocument (WHERE user_id)", (px15_r4 + 1750)/2, y_p15_to_d7, 'below', font_flow)

    # D7 -> P1.5 (read own reports)
    y_d7_to_p15 = 1790
    px15_r5 = circle_x(cx, 1660, pr, y_d7_to_p15, 'right')
    draw_path(draw, [(ds_x, data_stores["D7"]["y"] + 25), (1690, data_stores["D7"]["y"] + 25), (1690, y_d7_to_p15), (px15_r5, y_d7_to_p15)], arrow_end=True)
    draw_flow_label(draw, "User's Own Report Records &\nStored Stream (download)", (px15_r5 + 1690)/2, y_d7_to_p15, 'below', font_flow)

    img.save(output_path)
    print(f"[User DFD] Generated at: {output_path}")


if __name__ == '__main__':
    admin_large = r'd:\netsentinel\dfd-level-1-admin-large.png'
    user_large = r'd:\netsentinel\dfd-level-1-user-large.png'
    generate_admin_dfd(admin_large)
    generate_user_dfd(user_large)
