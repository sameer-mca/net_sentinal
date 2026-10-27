import os
import shutil
from PIL import Image, ImageDraw, ImageFont

def draw_crows_foot_h(draw, x_start, x_end, y, font, label_1='1', label_n='N', color=(0, 0, 0), stroke=2):
    """
    Draws horizontal line with '1' at x_start and 'N' crow's foot at x_end.
    Assumes left-to-right (x_start < x_end).
    """
    draw.line([(x_start, y), (x_end, y)], fill=color, width=stroke)
    
    # '1' crossbar tick mark
    tick_x = x_start + 14
    draw.line([(tick_x, y - 8), (tick_x, y + 8)], fill=color, width=stroke)
    bbox_1 = font.getbbox(label_1)
    draw.text((tick_x - (bbox_1[2] - bbox_1[0]) // 2, y - 30), label_1, fill=color, font=font)
    
    # 'N' crow's foot fork
    fork_x = x_end - 14
    draw.line([(fork_x, y), (x_end, y - 9)], fill=color, width=stroke)
    draw.line([(fork_x, y), (x_end, y + 9)], fill=color, width=stroke)
    draw.line([(fork_x, y - 9), (fork_x, y + 9)], fill=color, width=stroke)
    bbox_n = font.getbbox(label_n)
    draw.text((x_end - 18 - (bbox_n[2] - bbox_n[0]), y - 30), label_n, fill=color, font=font)

def draw_crows_foot_v(draw, x, y_start, y_end, font, label_1='1', label_n='N', color=(0, 0, 0), stroke=2):
    """
    Draws vertical line with '1' at y_start and 'N' crow's foot at y_end.
    Assumes top-to-bottom (y_start < y_end).
    """
    draw.line([(x, y_start), (x, y_end)], fill=color, width=stroke)
    
    # '1' crossbar tick mark
    tick_y = y_start + 14
    draw.line([(x - 8, tick_y), (x + 8, tick_y)], fill=color, width=stroke)
    bbox_1 = font.getbbox(label_1)
    # Place '1' to the left of the line
    draw.text((x - 14 - (bbox_1[2] - bbox_1[0]), tick_y - (bbox_1[3] - bbox_1[1]) // 2), label_1, fill=color, font=font)
    
    # 'N' crow's foot fork
    fork_y = y_end - 14
    draw.line([(x, fork_y), (x - 9, y_end)], fill=color, width=stroke)
    draw.line([(x, fork_y), (x + 9, y_end)], fill=color, width=stroke)
    draw.line([(x - 9, fork_y), (x + 9, fork_y)], fill=color, width=stroke)
    bbox_n = font.getbbox(label_n)
    # Place 'N' to the left of the line
    draw.text((x - 16 - (bbox_n[2] - bbox_n[0]), y_end - 26), label_n, fill=color, font=font)

def draw_table(draw, bounds, title, columns, font_header, font_col, font_key, header_bg=(178, 218, 245), border_color=(0, 0, 0)):
    x1, y1, x2, y2 = bounds
    radius = 10
    header_h = 46
    
    # Base rectangle
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, fill=(255, 255, 255), outline=border_color, width=2)
    
    # Header rounded top
    draw.rounded_rectangle([x1, y1, x2, y1 + header_h], radius=radius, fill=header_bg, outline=border_color, width=2)
    draw.rectangle([x1 + 2, y1 + header_h - 10, x2 - 2, y1 + header_h], fill=header_bg)
    draw.line([(x1, y1 + header_h), (x2, y1 + header_h)], fill=border_color, width=2)
    
    # Header text (centered)
    bbox = font_header.getbbox(title)
    th_w = bbox[2] - bbox[0]
    th_h = bbox[3] - bbox[1]
    draw.text((x1 + (x2 - x1 - th_w) // 2, y1 + (header_h - th_h) // 2 - bbox[1]), title, fill=(0, 0, 0), font=font_header)
    
    # Column text
    cur_y = y1 + header_h + 14
    row_h = 30
    for col_name, key_type in columns:
        draw.text((x1 + 18, cur_y), col_name, fill=(0, 0, 0), font=font_col)
        if key_type:
            bbox_c = font_col.getbbox(col_name)
            col_w = bbox_c[2] - bbox_c[0]
            draw.text((x1 + 18 + col_w + 6, cur_y), f"({key_type})", fill=(0, 0, 0), font=font_key)
        cur_y += row_h

def generate_schema():
    # Symmetrical 5-column layout with 110px corridors
    width = 1940
    height = 960
    
    img = Image.new("RGB", (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Fonts
    font_header = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 23)
    font_col = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 19)
    font_key = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 18)
    font_card = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 20)
    
    # Complete, verified NetSentinel schema data from MySQL database
    tables_data = {
        "capture_settings": {
            "cols": [
                ("id", "PK"),
                ("is_running", None),
                ("mode", None),
                ("interface_name", None),
                ("simulate_attacks", None),
                ("updated_at", None)
            ]
        },
        "detection_rules": {
            "cols": [
                ("id", "PK"),
                ("rule_name", None),
                ("attack_type", None),
                ("description", None),
                ("threshold_value", None),
                ("time_window", None),
                ("severity", None),
                ("is_active", None),
                ("created_at", None),
                ("updated_at", None)
            ]
        },
        "devices": {
            "cols": [
                ("id", "PK"),
                ("ip_address", None),
                ("mac_address", None),
                ("hostname", None),
                ("device_type", None),
                ("status", None),
                ("first_seen", None),
                ("last_seen", None)
            ]
        },
        "alerts": {
            "cols": [
                ("id", "PK"),
                ("device_id", "FK"),
                ("rule_id", "FK"),
                ("traffic_id", "FK"),
                ("timestamp", None),
                ("alert_type", None),
                ("severity", None),
                ("source_ip", None),
                ("destination_ip", None),
                ("description", None),
                ("status", None)
            ]
        },
        "network_traffic": {
            "cols": [
                ("id", "PK"),
                ("device_id", "FK"),
                ("timestamp", None),
                ("src_ip", None),
                ("dst_ip", None),
                ("src_port", None),
                ("dst_port", None),
                ("protocol", None),
                ("packet_size", None),
                ("packet_count", None),
                ("bytes_transferred", None),
                ("duration", None),
                ("tcp_flags", None),
                ("status", None)
            ]
        },
        "users": {
            "cols": [
                ("id", "PK"),
                ("name", None),
                ("email", None),
                ("password_hash", None),
                ("role", None),
                ("created_at", None),
                ("updated_at", None)
            ]
        },
        "user_sessions": {
            "cols": [
                ("id", "PK"),
                ("user_id", "FK"),
                ("token", None),
                ("created_at", None),
                ("expires_at", None),
                ("is_active", None)
            ]
        },
        "reports": {
            "cols": [
                ("id", "PK"),
                ("user_id", "FK"),
                ("report_type", None),
                ("format", None),
                ("start_time", None),
                ("end_time", None),
                ("generated_at", None),
                ("file_path", None)
            ]
        }
    }
    
    table_w = 280
    header_h = 46
    row_h = 30
    bottom_pad = 14
    
    def get_table_h(num_cols):
        return header_h + num_cols * row_h + bottom_pad
    
    # 5 Symmetrical Columns with 110px corridors
    c1_x = 50
    c2_x = 440
    c3_x = 830
    c4_x = 1220
    c5_x = 1610
    
    top_y = 50
    bot_y = 480
    
    boxes = {
        "capture_settings": (c1_x, top_y, c1_x + table_w, top_y + get_table_h(len(tables_data["capture_settings"]["cols"]))),
        "detection_rules":  (c1_x, bot_y, c1_x + table_w, bot_y + get_table_h(len(tables_data["detection_rules"]["cols"]))),
        "devices":          (c2_x, top_y, c2_x + table_w, top_y + get_table_h(len(tables_data["devices"]["cols"]))),
        "alerts":           (c2_x, bot_y, c2_x + table_w, bot_y + get_table_h(len(tables_data["alerts"]["cols"]))),
        "network_traffic":  (c3_x, 240,   c3_x + table_w, 240 + get_table_h(len(tables_data["network_traffic"]["cols"]))),
        "users":            (c4_x, top_y, c4_x + table_w, top_y + get_table_h(len(tables_data["users"]["cols"]))),
        "user_sessions":    (c5_x, top_y, c5_x + table_w, top_y + get_table_h(len(tables_data["user_sessions"]["cols"]))),
        "reports":          (c5_x, bot_y, c5_x + table_w, bot_y + get_table_h(len(tables_data["reports"]["cols"]))),
    }
    
    # Draw all tables
    for name, b in boxes.items():
        draw_table(draw, b, name, tables_data[name]["cols"], font_header, font_col, font_key)
        
    # ----------------------------------------------------
    # Connectors & Relationships
    # ----------------------------------------------------
    
    # 1. detection_rules (1) -> alerts (N)
    # Direct horizontal line across Gap 1
    r1_y = bot_y + 80
    draw_crows_foot_h(draw, boxes["detection_rules"][2], boxes["alerts"][0], r1_y, font_card)
    
    # 2. devices (1) -> alerts (N)
    # Direct vertical line between devices bottom and alerts top
    r2_x = c2_x + 90
    draw_crows_foot_v(draw, r2_x, boxes["devices"][3], boxes["alerts"][1], font_card)
    
    # 3. devices (1) -> network_traffic (N)
    # Orthogonal route across Gap 2
    d_x1 = boxes["devices"][2]
    d_y1 = top_y + 130
    nt_in_x = boxes["network_traffic"][0]
    nt_in_y = 240 + 70
    mid_gap2 = (d_x1 + nt_in_x) // 2
    
    draw.line([(d_x1, d_y1), (mid_gap2, d_y1)], fill=(0, 0, 0), width=2)
    draw.line([(mid_gap2, d_y1), (mid_gap2, nt_in_y)], fill=(0, 0, 0), width=2)
    draw.line([(mid_gap2, nt_in_y), (nt_in_x, nt_in_y)], fill=(0, 0, 0), width=2)
    # '1' mark near devices
    draw.line([(d_x1 + 14, d_y1 - 8), (d_x1 + 14, d_y1 + 8)], fill=(0, 0, 0), width=2)
    draw.text((d_x1 + 10, d_y1 - 30), "1", fill=(0, 0, 0), font=font_card)
    # 'N' mark near network_traffic
    draw.line([(nt_in_x - 14, nt_in_y), (nt_in_x, nt_in_y - 9)], fill=(0, 0, 0), width=2)
    draw.line([(nt_in_x - 14, nt_in_y), (nt_in_x, nt_in_y + 9)], fill=(0, 0, 0), width=2)
    draw.line([(nt_in_x - 14, nt_in_y - 9), (nt_in_x - 14, nt_in_y + 9)], fill=(0, 0, 0), width=2)
    draw.text((nt_in_x - 30, nt_in_y - 30), "N", fill=(0, 0, 0), font=font_card)

    # 4. network_traffic (1) -> alerts (N)
    # Direct horizontal line across Gap 2 (pointing left into alerts)
    nt_out_x = boxes["network_traffic"][0]
    alt_in_x = boxes["alerts"][2]
    r4_y = bot_y + 160
    draw.line([(alt_in_x, r4_y), (nt_out_x, r4_y)], fill=(0, 0, 0), width=2)
    # '1' mark near network_traffic
    draw.line([(nt_out_x - 14, r4_y - 8), (nt_out_x - 14, r4_y + 8)], fill=(0, 0, 0), width=2)
    draw.text((nt_out_x - 26, r4_y - 30), "1", fill=(0, 0, 0), font=font_card)
    # 'N' mark near alerts (pointing left)
    draw.line([(alt_in_x + 14, r4_y), (alt_in_x, r4_y - 9)], fill=(0, 0, 0), width=2)
    draw.line([(alt_in_x + 14, r4_y), (alt_in_x, r4_y + 9)], fill=(0, 0, 0), width=2)
    draw.line([(alt_in_x + 14, r4_y - 9), (alt_in_x + 14, r4_y + 9)], fill=(0, 0, 0), width=2)
    draw.text((alt_in_x + 16, r4_y - 30), "N", fill=(0, 0, 0), font=font_card)

    # 5. users (1) -> user_sessions (N)
    # Direct horizontal line across Gap 4
    r5_y = top_y + 90
    draw_crows_foot_h(draw, boxes["users"][2], boxes["user_sessions"][0], r5_y, font_card)
    
    # 6. users (1) -> reports (N)
    # Orthogonal route across Gap 4
    u_x1 = boxes["users"][2]
    u_y1 = top_y + 180
    rep_in_x = boxes["reports"][0]
    rep_in_y = bot_y + 80
    mid_gap4 = (u_x1 + rep_in_x) // 2
    
    draw.line([(u_x1, u_y1), (mid_gap4, u_y1)], fill=(0, 0, 0), width=2)
    draw.line([(mid_gap4, u_y1), (mid_gap4, rep_in_y)], fill=(0, 0, 0), width=2)
    draw.line([(mid_gap4, rep_in_y), (rep_in_x, rep_in_y)], fill=(0, 0, 0), width=2)
    # '1' mark near users
    draw.line([(u_x1 + 14, u_y1 - 8), (u_x1 + 14, u_y1 + 8)], fill=(0, 0, 0), width=2)
    draw.text((u_x1 + 10, u_y1 - 30), "1", fill=(0, 0, 0), font=font_card)
    # 'N' mark near reports
    draw.line([(rep_in_x - 14, rep_in_y), (rep_in_x, rep_in_y - 9)], fill=(0, 0, 0), width=2)
    draw.line([(rep_in_x - 14, rep_in_y), (rep_in_x, rep_in_y + 9)], fill=(0, 0, 0), width=2)
    draw.line([(rep_in_x - 14, rep_in_y - 9), (rep_in_x - 14, rep_in_y + 9)], fill=(0, 0, 0), width=2)
    draw.text((rep_in_x - 30, rep_in_y - 30), "N", fill=(0, 0, 0), font=font_card)

    # ----------------------------------------------------
    # Save Image
    # ----------------------------------------------------
    target_path = r"d:\netsentinel\dbschema.png"
    img.save(target_path, "PNG", dpi=(300, 300))
    print(f"Generated: {target_path}")
    
    artifact_dir = r"C:\Users\Acer\.gemini\antigravity\brain\cdaa320d-a919-49d2-be92-9d81ace6b701"
    if os.path.exists(artifact_dir):
        artifact_target = os.path.join(artifact_dir, "dbschema.png")
        shutil.copy2(target_path, artifact_target)
        print(f"Copied to artifact: {artifact_target}")

if __name__ == "__main__":
    generate_schema()
