import os
import shutil
from pathlib import Path

source_base = r"C:\Users\clari\OneDrive\Documents\GitHub\aliens-vs-goju\animations\Player\animations"
dest_base = r"C:\Users\clari\OneDrive\Documents\GitHub\aliens-vs-goju\animations\tank\animations"

total_copied = 0
copy_report = []

# Walk through all subdirectories in source
for root, dirs, files in os.walk(source_base):
    # Get the relative path from source_base
    rel_path = os.path.relpath(root, source_base)
    
    # Create corresponding destination directory
    if rel_path == ".":
        dest_dir = dest_base
    else:
        dest_dir = os.path.join(dest_base, rel_path)
    
    # Create destination directory if it doesn't exist
    os.makedirs(dest_dir, exist_ok=True)
    
    # Copy all PNG files
    png_count = 0
    for file in files:
        if file.lower().endswith('.png'):
            src_file = os.path.join(root, file)
            dest_file = os.path.join(dest_dir, file)
            shutil.copy2(src_file, dest_file)
            png_count += 1
            total_copied += 1
    
    # Record the copy for each direction
    if png_count > 0:
        direction_name = os.path.basename(root)
        copy_report.append(f"{png_count} PNG files copied to {direction_name}")

print("Copy operation completed!")
print(f"\nTotal PNG files copied: {total_copied}")
print("\nDetailed report:")
for report in copy_report:
    print(f"  - {report}")

# Verify by checking destination files
print("\nVerification:")
dest_file_count = 0
for root, dirs, files in os.walk(dest_base):
    for file in files:
        if file.lower().endswith('.png'):
            dest_file_count += 1

print(f"Files confirmed in destination: {dest_file_count}")

if dest_file_count == total_copied:
    print("✓ Verification successful - all files copied correctly!")
else:
    print(f"✗ Verification failed - expected {total_copied} but found {dest_file_count}")
