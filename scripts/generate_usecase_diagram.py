import os
import shutil
from PIL import Image, ImageDraw, ImageFont

def draw_stick_figure(draw, cx, cy, color, name, subtitle, font_name, font_sub):
    """Draws a standard UML stick figure actor with centered title beneath."""
    r = 16  # head radius
    # 1. Head
    draw.ellipse([cx - r, cy - 36 - r, cx + r, cy - 36 + r], fill=(255, 255, 255), outline=color, width=3)
    # 2. Torso
    draw.line([(cx, cy - 20), (cx, cy + 22)], fill=color, width=3)
    # 3. Arms
    draw.line([(cx - 24, cy - 6), (cx + 24, cy - 6)], fill=color, width=3)
    # 4. Legs
    draw.line([(cx, cy + 22), (cx - 20, cy + 58)], fill=color, width=3)
    draw.line([(cx, cy + 22), (cx + 20, cy + 58)], fill=color, width=3)
    
    # 5. Labels
    bbox_n = font_name.getbbox(name)
    nw = bbox_n[2] - bbox_n[0]
    draw.text((cx - nw // 2, cy + 70), name, fill=(0, 0, 0), font=font_name)
    
    if subtitle:
        bbox_s = font_sub.getbbox(subtitle)
        sw = bbox_s[2] - bbox_s[0]
        draw.text((cx - sw // 2, cy + 96), subtitle, fill=(60, 60, 60), font=font_sub)

def draw_ellipse_with_text(draw, bounds, text, font, fill_color, outline_color):
    """Draws a smooth UML use case ellipse with centered text."""
    x1, y1, x2, y2 = bounds
    draw.ellipse([x1, y1, x2, y2], fill=fill_color, outline=outline_color, width=2)
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    cx = (x1 + x2) // 2
    cy = (y1 + y2) // 2
    draw.text((cx - tw // 2, cy - th // 2 - bbox[1]), text, fill=(0, 0, 0), font=font)

def generate_usecase():
    width = 1660
    height = 860
    
    img = Image.new("RGB", (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Fonts
    font_bold = "C:/Windows/Fonts/segoeuib.ttf"
    font_reg = "C:/Windows/Fonts/segoeui.ttf"
    
    font_title = ImageFont.truetype(font_bold, 26)
    font_actor_name = ImageFont.truetype(font_bold, 20)
    font_actor_sub = ImageFont.truetype(font_reg, 16)
    font_uc = ImageFont.truetype(font_bold, 18)
    
    # Colors exactly matching the user's reference diagram
    boundary_outline = (72, 125, 208)    # #487DD0
    boundary_fill = (238, 247, 253)       # #EEF7FD
    
    green_actor = (46, 125, 50)          # Forest green
    green_uc_fill = (225, 246, 228)       # Soft pastel green
    green_uc_outline = (46, 125, 50)
    
    blue_actor = (25, 113, 194)           # Royal blue
    blue_uc_fill = (228, 233, 252)        # Soft pastel lavender-blue
    blue_uc_outline = (80, 95, 200)
    
    line_color = (60, 60, 60)
    
    # ----------------------------------------------------
    # System Boundary
    # ----------------------------------------------------
    sb_x1, sb_y1 = 230, 40
    sb_x2, sb_y2 = 1430, 820
    draw.rounded_rectangle([sb_x1, sb_y1, sb_x2, sb_y2], radius=24, fill=boundary_fill, outline=boundary_outline, width=3)
    
    # System Title
    sys_title = "NetSentinel System Boundary"
    bbox_t = font_title.getbbox(sys_title)
    tw = bbox_t[2] - bbox_t[0]
    draw.text(((sb_x1 + sb_x2 - tw) // 2, sb_y1 + 22), sys_title, fill=(30, 64, 120), font=font_title)
    
    # ----------------------------------------------------
    # Use Cases Setup
    # ----------------------------------------------------
    analyst_ucs = [
        "Authenticate & Login",
        "Monitor Live Traffic Stream",
        "Inspect Network Devices",
        "View Threat Alerts",
        "View Dashboard Analytics",
        "Export Audit Reports"
    ]
    
    admin_ucs = [
        "Manage Users & Roles",
        "Configure Detection Rules",
        "Control Packet Capture",
        "Select Network Interface",
        "Triage & Resolve Alerts",
        "Update Device Metadata"
    ]
    
    uc_w, uc_h = 320, 72
    y_starts = [155, 260, 365, 470, 575, 680]
    
    # Left Ellipses Coordinates
    left_uc_x1 = 275
    left_uc_x2 = left_uc_x1 + uc_w
    
    # Right Ellipses Coordinates
    right_uc_x2 = 1385
    right_uc_x1 = right_uc_x2 - uc_w
    
    # ----------------------------------------------------
    # Actors Setup
    # ----------------------------------------------------
    actor_left_cx = 115
    actor_left_cy = 425
    
    actor_right_cx = 1545
    actor_right_cy = 425
    
    # ----------------------------------------------------
    # Association Lines
    # ----------------------------------------------------
    # From Left Actor (chest: cx, cy - 6) to Left Ellipses left-center
    chest_left = (actor_left_cx, actor_left_cy - 6)
    for y_center in y_starts:
        ellipse_target = (left_uc_x1, y_center)
        draw.line([chest_left, ellipse_target], fill=line_color, width=2)
        
    # From Right Actor (chest: cx, cy - 6) to Right Ellipses right-center
    chest_right = (actor_right_cx, actor_right_cy - 6)
    for y_center in y_starts:
        ellipse_target = (right_uc_x2, y_center)
        draw.line([chest_right, ellipse_target], fill=line_color, width=2)
        
    # ----------------------------------------------------
    # Draw Use Case Ellipses
    # ----------------------------------------------------
    # Left (Analyst) Ellipses
    for i, uc_text in enumerate(analyst_ucs):
        yc = y_starts[i]
        b = (left_uc_x1, yc - uc_h // 2, left_uc_x2, yc + uc_h // 2)
        draw_ellipse_with_text(draw, b, uc_text, font_uc, green_uc_fill, green_uc_outline)
        
    # Right (Admin) Ellipses
    for i, uc_text in enumerate(admin_ucs):
        yc = y_starts[i]
        b = (right_uc_x1, yc - uc_h // 2, right_uc_x2, yc + uc_h // 2)
        draw_ellipse_with_text(draw, b, uc_text, font_uc, blue_uc_fill, blue_uc_outline)
        
    # ----------------------------------------------------
    # Draw Actors
    # ----------------------------------------------------
    draw_stick_figure(draw, actor_left_cx, actor_left_cy, green_actor, 
                      "Security Analyst", "(Normal User)", font_actor_name, font_actor_sub)
                      
    draw_stick_figure(draw, actor_right_cx, actor_right_cy, blue_actor, 
                      "Administrator", "(Admin / Security Lead)", font_actor_name, font_actor_sub)

    # ----------------------------------------------------
    # Save Output PNG
    # ----------------------------------------------------
    target_path = r"d:\netsentinel\usecase.png"
    img.save(target_path, "PNG", dpi=(300, 300))
    print(f"Generated: {target_path}")
    
    artifact_dir = r"C:\Users\Acer\.gemini\antigravity\brain\cdaa320d-a919-49d2-be92-9d81ace6b701"
    if os.path.exists(artifact_dir):
        artifact_target = os.path.join(artifact_dir, "usecase.png")
        shutil.copy2(target_path, artifact_target)
        print(f"Copied to artifact: {artifact_target}")

def generate_puml():
    puml_content = """@startuml usecase
left to right direction
skinparam packageStyle rectangle
skinparam roundcorner 20
skinparam shadowing false
skinparam actorStyle stickman

skinparam rectangle {
    BackgroundColor #EEF7FD
    BorderColor #487DD0
    BorderThickness 2
}

skinparam usecase {
    BackgroundColor #FFFFFF
    BorderThickness 2
    FontSize 15
    FontName "Segoe UI"
}

skinparam usecase<<analyst>> {
    BackgroundColor #E1F6E4
    BorderColor #2E7D32
}

skinparam usecase<<admin>> {
    BackgroundColor #E4E9FC
    BorderColor #505FC8
}

actor "Security Analyst\\n(Normal User)" as Analyst #2E7D32
actor "Administrator\\n(Admin / Security Lead)" as Admin #1971C2

rectangle "NetSentinel System Boundary" {
    usecase "Authenticate & Login" as UC1 <<analyst>>
    usecase "Monitor Live Traffic Stream" as UC2 <<analyst>>
    usecase "Inspect Network Devices" as UC3 <<analyst>>
    usecase "View Threat Alerts" as UC4 <<analyst>>
    usecase "View Dashboard Analytics" as UC5 <<analyst>>
    usecase "Export Audit Reports" as UC6 <<analyst>>

    usecase "Manage Users & Roles" as UC7 <<admin>>
    usecase "Configure Detection Rules" as UC8 <<admin>>
    usecase "Control Packet Capture" as UC9 <<admin>>
    usecase "Select Network Interface" as UC10 <<admin>>
    usecase "Triage & Resolve Alerts" as UC11 <<admin>>
    usecase "Update Device Metadata" as UC12 <<admin>>
}

Analyst -- UC1
Analyst -- UC2
Analyst -- UC3
Analyst -- UC4
Analyst -- UC5
Analyst -- UC6

Admin -- UC7
Admin -- UC8
Admin -- UC9
Admin -- UC10
Admin -- UC11
Admin -- UC12

@enduml
"""
    puml_path = r"d:\netsentinel\usecase.puml"
    with open(puml_path, "w", encoding="utf-8") as f:
        f.write(puml_content)
    print(f"Generated: {puml_path}")

if __name__ == "__main__":
    generate_usecase()
    generate_puml()
