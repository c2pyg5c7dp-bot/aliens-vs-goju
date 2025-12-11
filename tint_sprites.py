#!/usr/bin/env python3
"""
Color tint script to create Speedster (green) and Glass Cannon (purple) sprite variants
"""
from PIL import Image
import os
from pathlib import Path

def tint_image(image_path, hue_shift):
    """
    Tint an image by shifting hue while preserving transparency
    hue_shift: -60 for green, +60 for purple, 0 for no change
    """
    try:
        # Open image and preserve alpha channel
        img = Image.open(image_path)
        
        # Check if image has alpha channel
        has_alpha = img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info)
        
        # Convert to RGBA to preserve transparency
        img_rgba = img.convert('RGBA')
        pixels = img_rgba.load()
        width, height = img_rgba.size
        
        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                
                # Skip fully transparent pixels
                if a == 0:
                    continue
                
                # Convert RGB to HSV
                max_c = max(r, g, b)
                min_c = min(r, g, b)
                delta = max_c - min_c
                
                # Calculate hue
                if delta == 0:
                    h = 0
                elif max_c == r:
                    h = (60 * (((g - b) / delta) % 6)) / 360
                elif max_c == g:
                    h = (60 * (((b - r) / delta) + 2)) / 360
                else:
                    h = (60 * (((r - g) / delta) + 4)) / 360
                
                # Calculate saturation and value
                s = 0 if max_c == 0 else (delta / max_c)
                v = max_c / 255
                
                # Shift hue
                h = (h + hue_shift / 360) % 1.0
                
                # Convert HSV back to RGB
                c = v * s
                x_val = c * (1 - abs((h * 6) % 2 - 1))
                m = v - c
                
                if 0 <= h < 1/6:
                    r_new, g_new, b_new = c, x_val, 0
                elif 1/6 <= h < 2/6:
                    r_new, g_new, b_new = x_val, c, 0
                elif 2/6 <= h < 3/6:
                    r_new, g_new, b_new = 0, c, x_val
                elif 3/6 <= h < 4/6:
                    r_new, g_new, b_new = 0, x_val, c
                elif 4/6 <= h < 5/6:
                    r_new, g_new, b_new = x_val, 0, c
                else:
                    r_new, g_new, b_new = c, 0, x_val
                
                r_final = int((r_new + m) * 255)
                g_final = int((g_new + m) * 255)
                b_final = int((b_new + m) * 255)
                
                # Preserve alpha channel
                pixels[x, y] = (r_final, g_final, b_final, a)
        
        return img_rgba
    except Exception as e:
        print(f"Error tinting {image_path}: {e}")
        return None

def process_directory(source_dir, target_dir, hue_shift):
    """Process all PNG files in a directory recursively"""
    target_path = Path(target_dir)
    target_path.mkdir(parents=True, exist_ok=True)
    
    for root, dirs, files in os.walk(source_dir):
        # Create corresponding directories in target
        rel_path = os.path.relpath(root, source_dir)
        target_subdir = os.path.join(target_dir, rel_path) if rel_path != '.' else target_dir
        os.makedirs(target_subdir, exist_ok=True)
        
        for file in files:
            if file.endswith('.png'):
                source_file = os.path.join(root, file)
                target_file = os.path.join(target_subdir, file)
                
                # Tint and save
                tinted = tint_image(source_file, hue_shift)
                if tinted:
                    # Save with PNG format to preserve transparency
                    tinted.save(target_file, 'PNG', optimize=False)
                    print(f"✓ {target_file}")

if __name__ == '__main__':
    base_path = r'c:\Users\clari\OneDrive\Documents\GitHub\aliens-vs-goju\animations'
    
    # Speedster: green tint (-90 degrees on hue)
    print("Processing Speedster sprites (green)...")
    process_directory(
        os.path.join(base_path, 'Player', 'animations'),
        os.path.join(base_path, 'speedster', 'animations'),
        -90  # Shift towards green
    )
    
    # Glass Cannon: purple tint (+60 degrees on hue)
    print("Processing Glass Cannon sprites (purple)...")
    process_directory(
        os.path.join(base_path, 'Player', 'animations'),
        os.path.join(base_path, 'glass_cannon', 'animations'),
        60  # Shift towards purple
    )
    
    print("Done!")
