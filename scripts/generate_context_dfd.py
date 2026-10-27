import os
import shutil
import math
from PIL import Image, ImageDraw, ImageFont

def draw_arrow(draw, start, end, stroke_width=2, arrow_len=14, arrow_width=9, color=(0, 0, 0)):
    """Draws a line with a crisp filled triangular arrowhead at 'end'."""
    x1, y1 = start
    x2, y2 = end
    
    dx = x2 - x1
    dy = y2 - y1
    dist = math.hypot(dx, dy)
    if dist == 0:
        return
    
    ux = dx / dist
    uy = dy / dist
    
    # Base of arrowhead
    bx = x2 - ux * arrow_len
    by = y2 - uy * arrow_len
    
    # Main line up to arrowhead base
    draw.line([(x1, y1), (bx, by)], fill=color, width=stroke_width)
    
    # Perpendicular vector for wings
    px = -uy * (arrow_width / 2.0)
    py = ux * (arrow_width / 2.0)
    
    tip = (x2, y2)
    left_wing = (bx + px, by + py)
    right_wing = (bx - px, by - py)
    
    draw.polygon([tip, left_wing, right_wing], fill=color)

def draw_centered_box_text(draw, bounds, lines):
    """
    bounds: (x1, y1, x2, y2)
    lines: list of (text_str, font, color, extra_spacing_below)
    """
    x1, y1, x2, y2 = bounds
    box_w = x2 - x1
    box_h = y2 - y1
    
    line_metrics = []
    total_h = 0
    for text, font, color, extra_space in lines:
        bbox = font.getbbox(text)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        line_metrics.append((text, font, color, w, h, extra_space, bbox))
        total_h += h + extra_space
    total_h -= lines[-1][3]  # remove trailing extra space
    
    cur_y = y1 + (box_h - total_h) / 2.0
    for text, font, color, w, h, extra_space, bbox in line_metrics:
        cur_x = x1 + (box_w - w) / 2.0 - bbox[0]
        draw.text((cur_x, cur_y - bbox[1]), text, fill=color, font=font)
        cur_y += h + extra_space

def generate_dfd():
    # 2 User Entities (Security Analyst & Admin) + Center System Process
    # Perfectly framed 1850 x 540 canvas
    width = 1850
    height = 540
    
    # Authentic colors matching user reference
    bg_color = (255, 255, 255)
    entity_fill = (251, 241, 228)  # Warm Cream / Peach
    center_fill = (216, 239, 253)  # Soft Sky Blue
    border_color = (0, 0, 0)
    text_color = (0, 0, 0)
    
    img = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Georgia Serif fonts matching reference style
    font_bold = "C:/Windows/Fonts/georgiab.ttf"
    font_reg = "C:/Windows/Fonts/georgia.ttf"
    
    font_center_title = ImageFont.truetype(font_bold, 32)
    font_center_sub = ImageFont.truetype(font_bold, 22)
    
    font_entity_title = ImageFont.truetype(font_bold, 25)
    font_entity_sub = ImageFont.truetype(font_reg, 19)
    
    # Flow labels: 19pt Georgia (Cap height = 15px >= 14px)
    font_flow = ImageFont.truetype(font_reg, 19)
    
    center_x = width // 2     # 925
    center_y = height // 2    # 270
    
    # ----------------------------------------------------
    # Node Coordinates
    # ----------------------------------------------------
    # 1. Central Process: NetSentinel
    center_w, center_h = 490, 260
    center_x1 = center_x - center_w // 2
    center_y1 = center_y - center_h // 2
    center_x2 = center_x1 + center_w
    center_y2 = center_y1 + center_h
    
    # 2. Left Entity: Security Analyst (Normal User)
    left_w, left_h = 310, 160
    left_x1 = 45
    left_y1 = center_y - left_h // 2
    left_x2 = left_x1 + left_w
    left_y2 = left_y1 + left_h
    
    # 3. Right Entity: Admin / Security Lead (Administrator)
    right_w, right_h = 310, 160
    right_x1 = width - 45 - right_w
    right_y1 = center_y - right_h // 2
    right_x2 = right_x1 + right_w
    right_y2 = right_y1 + right_h
    
    # ----------------------------------------------------
    # Draw Entity & Process Boxes
    # ----------------------------------------------------
    # Left Entity: Security Analyst
    draw.rectangle([left_x1, left_y1, left_x2, left_y2], fill=entity_fill, outline=border_color, width=3)
    draw_centered_box_text(draw, (left_x1, left_y1, left_x2, left_y2), [
        ("Security Analyst", font_entity_title, text_color, 12),
        ("(Normal User)", font_entity_sub, text_color, 0)
    ])
    
    # Right Entity: Admin / Security Lead
    draw.rectangle([right_x1, right_y1, right_x2, right_y2], fill=entity_fill, outline=border_color, width=3)
    draw_centered_box_text(draw, (right_x1, right_y1, right_x2, right_y2), [
        ("Admin / Security Lead", font_entity_title, text_color, 12),
        ("(Administrator)", font_entity_sub, text_color, 0)
    ])
    
    # Central Process: NetSentinel
    draw.rounded_rectangle([center_x1, center_y1, center_x2, center_y2], radius=35, fill=center_fill, outline=border_color, width=3)
    draw_centered_box_text(draw, (center_x1, center_y1, center_x2, center_y2), [
        ("NetSentinel", font_center_title, text_color, 16),
        ("Network Traffic Analyzer &", font_center_sub, text_color, 10),
        ("Intrusion Detection System", font_center_sub, text_color, 0)
    ])
    
    # ----------------------------------------------------
    # Arrows & Data Flows
    # ----------------------------------------------------
    h_top_y = center_y - 45  # 225
    h_bot_y = center_y + 45  # 315
    
    # --- Left Flows (Security Analyst <-> NetSentinel) ---
    mid_left_x = (left_x2 + center_x1) // 2
    
    # Top Arrow: Security Analyst -> NetSentinel (Pointing RIGHT)
    draw_arrow(draw, (left_x2, h_top_y), (center_x1, h_top_y), stroke_width=2, arrow_len=14, arrow_width=9)
    left_top_lines = ["Login Credentials,", "Traffic Filter Queries"]
    for i, line in enumerate(left_top_lines):
        bbox = font_flow.getbbox(line)
        lw = bbox[2] - bbox[0]
        draw.text((mid_left_x - lw // 2, h_top_y - 60 + i * 26), line, fill=text_color, font=font_flow)
        
    # Bottom Arrow: NetSentinel -> Security Analyst (Pointing LEFT)
    draw_arrow(draw, (center_x1, h_bot_y), (left_x2, h_bot_y), stroke_width=2, arrow_len=14, arrow_width=9)
    left_bot_lines = ["Live Packet Stream, Alerts,", "Security Reports (PDF / CSV)"]
    for i, line in enumerate(left_bot_lines):
        bbox = font_flow.getbbox(line)
        lw = bbox[2] - bbox[0]
        draw.text((mid_left_x - lw // 2, h_bot_y + 14 + i * 26), line, fill=text_color, font=font_flow)

    # --- Right Flows (NetSentinel <-> Admin) ---
    mid_right_x = (center_x2 + right_x1) // 2
    
    # Top Arrow: NetSentinel -> Admin (Pointing RIGHT)
    draw_arrow(draw, (center_x2, h_top_y), (right_x1, h_top_y), stroke_width=2, arrow_len=14, arrow_width=9)
    right_top_lines = [
        "System Telemetry,",
        "Sensor Status & Health,",
        "Audit & Triage Logs"
    ]
    # Place text above top arrow
    for i, line in enumerate(right_top_lines):
        bbox = font_flow.getbbox(line)
        lw = bbox[2] - bbox[0]
        draw.text((mid_right_x - lw // 2, h_top_y - 84 + i * 26), line, fill=text_color, font=font_flow)
        
    # Bottom Arrow: Admin -> NetSentinel (Pointing LEFT)
    draw_arrow(draw, (right_x1, h_bot_y), (center_x2, h_bot_y), stroke_width=2, arrow_len=14, arrow_width=9)
    right_bot_lines = [
        "Detection Rules & Thresholds,",
        "Capture & Network Settings,",
        "User Management"
    ]
    # Place text below bottom arrow
    for i, line in enumerate(right_bot_lines):
        bbox = font_flow.getbbox(line)
        lw = bbox[2] - bbox[0]
        draw.text((mid_right_x - lw // 2, h_bot_y + 14 + i * 26), line, fill=text_color, font=font_flow)

    # ----------------------------------------------------
    # Save Outputs
    # ----------------------------------------------------
    target_path = r"d:\netsentinel\level-1-dfd.png"
    img.save(target_path, "PNG", dpi=(300, 300))
    print(f"Generated: {target_path}")
    
    alias_0 = r"d:\netsentinel\level-0-dfd.png"
    alias_ctx = r"d:\netsentinel\context-dfd.png"
    img.save(alias_0, "PNG", dpi=(300, 300))
    img.save(alias_ctx, "PNG", dpi=(300, 300))
    print(f"Updated aliases: {alias_0} and {alias_ctx}")
    
    artifact_dir = r"C:\Users\Acer\.gemini\antigravity\brain\cdaa320d-a919-49d2-be92-9d81ace6b701"
    if os.path.exists(artifact_dir):
        artifact_target = os.path.join(artifact_dir, "level-1-dfd.png")
        shutil.copy2(target_path, artifact_target)
        print(f"Updated artifact: {artifact_target}")

if __name__ == "__main__":
    generate_dfd()
