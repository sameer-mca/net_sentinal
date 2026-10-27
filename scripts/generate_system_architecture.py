import os
import shutil
import math
from PIL import Image, ImageDraw, ImageFont

def draw_arrowhead(draw, tip, direction, color=(0, 0, 0), arrow_len=13, arrow_w=8):
    """Draws an arrowhead pointing in 'direction' ('left', 'right', 'up', 'down')."""
    tx, ty = tip
    if direction == 'right':
        p1 = (tx - arrow_len, ty - arrow_w / 2.0)
        p2 = (tx - arrow_len, ty + arrow_w / 2.0)
    elif direction == 'left':
        p1 = (tx + arrow_len, ty - arrow_w / 2.0)
        p2 = (tx + arrow_len, ty + arrow_w / 2.0)
    elif direction == 'up':
        p1 = (tx - arrow_w / 2.0, ty + arrow_len)
        p2 = (tx + arrow_w / 2.0, ty + arrow_len)
    elif direction == 'down':
        p1 = (tx - arrow_w / 2.0, ty - arrow_len)
        p2 = (tx + arrow_w / 2.0, ty - arrow_len)
    draw.polygon([tip, p1, p2], fill=color)

def draw_bidirectional_v_arrow(draw, x, y_top, y_bot, color=(0, 0, 0), stroke=2, arrow_len=13, arrow_w=8):
    """Draws a vertical line with arrowheads at both top and bottom."""
    draw.line([(x, y_top), (x, y_bot)], fill=color, width=stroke)
    draw_arrowhead(draw, (x, y_top), 'up', color, arrow_len, arrow_w)
    draw_arrowhead(draw, (x, y_bot), 'down', color, arrow_len, arrow_w)

def draw_person_icon(draw, cx, cy, color, scale=1.0):
    hr = 13 * scale
    draw.ellipse([cx - hr, cy - 15 * scale - hr, cx + hr, cy - 15 * scale + hr], fill=color)
    br_x = 21 * scale
    draw.chord([cx - br_x, cy - 2 * scale, cx + br_x, cy + 25 * scale], start=180, end=0, fill=color)

def draw_admin_icon(draw, cx, cy, color, scale=1.0):
    draw_person_icon(draw, cx, cy, color, scale)
    draw.polygon([(cx, cy + 4 * scale), (cx - 4 * scale, cy + 14 * scale), 
                  (cx, cy + 22 * scale), (cx + 4 * scale, cy + 14 * scale)], fill=(255, 255, 255))

def draw_monitor_icon(draw, cx, cy, color, scale=1.0):
    w, h = 34 * scale, 24 * scale
    draw.rounded_rectangle([cx - w / 2, cy - h / 2 - 6 * scale, cx + w / 2, cy + h / 2 - 6 * scale], 
                           radius=4 * scale, outline=color, width=int(3.5 * scale))
    draw.line([(cx, cy + h / 2 - 6 * scale), (cx, cy + h / 2 + 3 * scale)], fill=color, width=int(3.5 * scale))
    draw.line([(cx - 12 * scale, cy + h / 2 + 3 * scale), (cx + 12 * scale, cy + h / 2 + 3 * scale)], fill=color, width=int(3.5 * scale))

def draw_db_icon(draw, cx, cy, color, scale=1.0):
    w, h = 34 * scale, 11 * scale
    for dy in [-11 * scale, 0, 11 * scale]:
        draw.ellipse([cx - w / 2, cy + dy - h / 2, cx + w / 2, cy + dy + h / 2], fill=color)
        draw.ellipse([cx - w / 2, cy + dy - h / 2, cx + w / 2, cy + dy + h / 2], outline=(255, 255, 255), width=int(1.5 * scale))

def generate_architecture():
    # Perfectly proportioned 1500 x 800 canvas
    width = 1500
    height = 800
    
    img = Image.new("RGB", (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Fonts
    font_bold = "C:/Windows/Fonts/segoeuib.ttf"
    font_reg = "C:/Windows/Fonts/segoeui.ttf"
    
    font_box_title = ImageFont.truetype(font_bold, 21)
    font_box_sub = ImageFont.truetype(font_reg, 16)
    
    font_app_title = ImageFont.truetype(font_bold, 25)
    font_bullet = ImageFont.truetype(font_bold, 17)
    
    font_db_title = ImageFont.truetype(font_bold, 22)
    font_db_sub = ImageFont.truetype(font_reg, 16)
    
    font_arrow = ImageFont.truetype(font_bold, 15)
    
    # Colors matching reference image
    blue_fill = (227, 241, 253)
    blue_border = (100, 175, 240)
    blue_text = (25, 90, 170)
    
    green_fill = (222, 244, 229)
    green_border = (80, 180, 105)
    green_text = (20, 100, 45)
    
    purple_fill = (240, 236, 252)
    purple_border = (165, 145, 225)
    purple_text = (60, 40, 100)
    
    gold_fill = (254, 246, 229)
    gold_border = (225, 185, 110)
    gold_text = (140, 95, 25)
    
    # ----------------------------------------------------
    # Coordinates of Boxes
    # ----------------------------------------------------
    top_y1 = 45
    top_h = 145
    top_y2 = top_y1 + top_h
    
    # 1. Left Box: Security Analyst
    left_w = 340
    left_x1 = 120
    left_x2 = left_x1 + left_w
    
    # 2. Right Box: Administrator
    right_w = 340
    right_x2 = width - 120
    right_x1 = right_x2 - right_w
    
    # Central Box: NetSentinel Application (cleaner, 2 main functions)
    app_w = 640
    app_h = 210
    app_x1 = (width - app_w) // 2
    app_x2 = app_x1 + app_w
    app_y1 = 300
    app_y2 = app_y1 + app_h
    
    # Bottom Box: MySQL Database
    db_w = 540
    db_h = 130
    db_x1 = (width - db_w) // 2
    db_x2 = db_x1 + db_w
    db_y1 = 610
    db_y2 = db_y1 + db_h
    
    radius = 16
    
    # ----------------------------------------------------
    # Draw Boxes
    # ----------------------------------------------------
    
    # 1. Security Analyst Box (Blue)
    draw.rounded_rectangle([left_x1, top_y1, left_x2, top_y2], radius=radius, fill=blue_fill, outline=blue_border, width=2)
    draw_person_icon(draw, (left_x1 + left_x2) // 2, top_y1 + 40, blue_text, scale=1.0)
    t1 = "Security Analyst"
    b1 = font_box_title.getbbox(t1)
    draw.text(((left_x1 + left_x2 - (b1[2] - b1[0])) // 2, top_y1 + 72), t1, fill=blue_text, font=font_box_title)
    sub1 = ["Monitor live traffic telemetry", "View threat alerts & export reports"]
    for i, line in enumerate(sub1):
        bs = font_box_sub.getbbox(line)
        draw.text(((left_x1 + left_x2 - (bs[2] - bs[0])) // 2, top_y1 + 98 + i * 20), line, fill=(50, 50, 50), font=font_box_sub)
        
    # 2. Administrator Box (Green)
    draw.rounded_rectangle([right_x1, top_y1, right_x2, top_y2], radius=radius, fill=green_fill, outline=green_border, width=2)
    draw_admin_icon(draw, (right_x1 + right_x2) // 2, top_y1 + 40, green_text, scale=1.0)
    t2 = "Administrator"
    b2 = font_box_title.getbbox(t2)
    draw.text(((right_x1 + right_x2 - (b2[2] - b2[0])) // 2, top_y1 + 72), t2, fill=green_text, font=font_box_title)
    sub2 = ["Configure detection rules & thresholds", "Manage users & capture interfaces"]
    for i, line in enumerate(sub2):
        bs = font_box_sub.getbbox(line)
        draw.text(((right_x1 + right_x2 - (bs[2] - bs[0])) // 2, top_y1 + 98 + i * 20), line, fill=(50, 50, 50), font=font_box_sub)
        
    # 3. Central Box: NetSentinel Application (Purple) - Exactly 2 Main Functions
    draw.rounded_rectangle([app_x1, app_y1, app_x2, app_y2], radius=22, fill=purple_fill, outline=purple_border, width=2)
    draw_monitor_icon(draw, app_x1 + 130, app_y1 + 45, purple_text, scale=1.1)
    app_title = "NetSentinel Application"
    draw.text((app_x1 + 165, app_y1 + 31), app_title, fill=purple_text, font=font_app_title)
    
    app_bullets = [
        "Real-Time Network Traffic Monitoring & Packet Analysis",
        "Automated Intrusion Detection & Threat Alerting"
    ]
    cur_y = app_y1 + 95
    for bullet in app_bullets:
        draw.ellipse([app_x1 + 65, cur_y + 6, app_x1 + 73, cur_y + 14], fill=(40, 40, 40))
        draw.text((app_x1 + 86, cur_y), bullet, fill=(40, 40, 40), font=font_bullet)
        cur_y += 42
        
    # 4. Bottom Box: MySQL Database (Gold)
    draw.rounded_rectangle([db_x1, db_y1, db_x2, db_y2], radius=18, fill=gold_fill, outline=gold_border, width=2)
    draw_db_icon(draw, db_x1 + 65, (db_y1 + db_y2) // 2, gold_text, scale=1.1)
    db_title = "MySQL Database"
    draw.text((db_x1 + 105, db_y1 + 24), db_title, fill=gold_text, font=font_db_title)
    db_sub = [
        "Store users, sessions, devices, network traffic telemetry,",
        "detection rules, threat alerts, and capture settings"
    ]
    for i, line in enumerate(db_sub):
        draw.text((db_x1 + 105, db_y1 + 60 + i * 22), line, fill=(60, 60, 60), font=font_db_sub)
        
    # ----------------------------------------------------
    # Arrows and Flow Annotations
    # ----------------------------------------------------
    
    # 1. Left Arrow (Blue): Analyst -> Application
    an_cx = (left_x1 + left_x2) // 2   # 290
    an_elbow_y = app_y1 + 75          # 375
    draw.line([(an_cx, top_y2), (an_cx, an_elbow_y)], fill=blue_text, width=2)
    draw.line([(an_cx, an_elbow_y), (app_x1, an_elbow_y)], fill=blue_text, width=2)
    draw_arrowhead(draw, (app_x1, an_elbow_y), 'right', color=blue_text, arrow_len=13, arrow_w=8)
    
    # Label centered above horizontal segment: between an_cx (290) and app_x1 (430)
    an_labels = ["REST API Queries & Auth", "Socket.io Telemetry Stream"]
    mid_left_seg = (an_cx + app_x1) // 2
    for i, line in enumerate(an_labels):
        bbox = font_arrow.getbbox(line)
        lw = bbox[2] - bbox[0]
        draw.text((mid_left_seg - lw // 2, an_elbow_y - 52 + i * 22), line, fill=(30, 30, 30), font=font_arrow)
        
    # 2. Right Arrow (Green): Administrator -> Application
    admin_cx = (right_x1 + right_x2) // 2  # 1210
    draw.line([(admin_cx, top_y2), (admin_cx, an_elbow_y)], fill=green_text, width=2)
    draw.line([(admin_cx, an_elbow_y), (app_x2, an_elbow_y)], fill=green_text, width=2)
    draw_arrowhead(draw, (app_x2, an_elbow_y), 'left', color=green_text, arrow_len=13, arrow_w=8)
    
    # Label centered above horizontal segment: between app_x2 (1070) and admin_cx (1210)
    admin_labels = ["Manage Rules & Users", "Capture & Triage Control"]
    mid_right_seg = (app_x2 + admin_cx) // 2
    for i, line in enumerate(admin_labels):
        bbox = font_arrow.getbbox(line)
        lw = bbox[2] - bbox[0]
        draw.text((mid_right_seg - lw // 2, an_elbow_y - 52 + i * 22), line, fill=(30, 30, 30), font=font_arrow)
        
    # 3. Bottom Arrow (Charcoal): Application <-> Database
    db_cx = (app_x1 + app_x2) // 2   # 750
    draw_bidirectional_v_arrow(draw, db_cx, app_y2, db_y1, color=(50, 50, 50), stroke=2, arrow_len=13, arrow_w=8)
    
    db_arrow_label = "Read / Write Data (InnoDB Pool)"
    draw.text((db_cx + 18, (app_y2 + db_y1) // 2 - 10), db_arrow_label, fill=(30, 30, 30), font=font_arrow)

    # ----------------------------------------------------
    # Save Image
    # ----------------------------------------------------
    target_path = r"d:\netsentinel\SystemArchitecture.png"
    img.save(target_path, "PNG", dpi=(300, 300))
    print(f"Generated: {target_path}")
    
    artifact_dir = r"C:\Users\Acer\.gemini\antigravity\brain\cdaa320d-a919-49d2-be92-9d81ace6b701"
    if os.path.exists(artifact_dir):
        artifact_target = os.path.join(artifact_dir, "SystemArchitecture.png")
        shutil.copy2(target_path, artifact_target)
        print(f"Copied to artifact: {artifact_target}")

if __name__ == "__main__":
    generate_architecture()
