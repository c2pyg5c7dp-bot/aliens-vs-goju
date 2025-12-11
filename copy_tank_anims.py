#!/usr/bin/env python3
import shutil
import os
import glob

src = r"C:\Users\clari\OneDrive\Documents\GitHub\aliens-vs-goju\animations\Player\animations"
dst = r"C:\Users\clari\OneDrive\Documents\GitHub\aliens-vs-goju\animations\tank\animations"

try:
    # Walk through all subdirectories and copy files
    for root, dirs, files in os.walk(src):
        # Calculate relative path
        rel_path = os.path.relpath(root, src)
        dst_path = os.path.join(dst, rel_path) if rel_path != '.' else dst
        
        # Create destination directories
        os.makedirs(dst_path, exist_ok=True)
        
        # Copy all files
        for file in files:
            src_file = os.path.join(root, file)
            dst_file = os.path.join(dst_path, file)
            shutil.copy2(src_file, dst_file)
            print(f"  Copied: {os.path.relpath(dst_file, dst)}")
    
    print(f"\n✓ Copied all Player animations to tank")
    
    # Verify south direction
    south_dir = os.path.join(dst, 'running-8-frames', 'south')
    if os.path.exists(south_dir):
        frames = glob.glob(os.path.join(south_dir, '*.png'))
        print(f"✓ South direction has {len(frames)} frames")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
