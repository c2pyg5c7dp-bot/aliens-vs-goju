#!/usr/bin/env python3
import os
import shutil
from pathlib import Path

# Define paths
source_base = Path(r"C:\Users\clari\OneDrive\Documents\GitHub\aliens-vs-goju\animations\Player\animations")
dest_base = Path(r"C:\Users\clari\OneDrive\Documents\GitHub\aliens-vs-goju\animations\tank\animations")
log_file = Path(r"C:\Users\clari\OneDrive\Documents\GitHub\aliens-vs-goju\copy_log.txt")

# Write log output
with open(log_file, 'w') as log:
    log.write("Starting copy process...\n\n")
    
    if not source_base.exists():
        log.write(f"ERROR: Source directory not found: {source_base}\n")
    elif not dest_base.exists():
        log.write(f"ERROR: Destination directory not found: {dest_base}\n")
    else:
        # Count and copy files
        total_copied = 0
        dir_report = {}
        
        # Walk through source directory
        for root, dirs, files in os.walk(str(source_base)):
            root_path = Path(root)
            rel_path = root_path.relative_to(source_base)
            
            # Create destination subdirectory
            if str(rel_path) == ".":
                dest_dir = dest_base
            else:
                dest_dir = dest_base / rel_path
            
            dest_dir.mkdir(parents=True, exist_ok=True)
            
            # Copy PNG files
            for file in files:
                if file.lower().endswith('.png'):
                    src_file = root_path / file
                    dest_file = dest_dir / file
                    shutil.copy2(str(src_file), str(dest_file))
                    
                    dir_name = root_path.name
                    if dir_name not in dir_report:
                        dir_report[dir_name] = 0
                    dir_report[dir_name] += 1
                    total_copied += 1
        
        log.write(f"Copy operation completed!\n\n")
        log.write(f"Total PNG files copied: {total_copied}\n\n")
        log.write("Detailed report:\n")
        for dir_name, count in sorted(dir_report.items()):
            log.write(f"  - {count} PNG files copied to {dir_name}\n")
        
        # Verify
        log.write("\nVerification:\n")
        dest_count = 0
        for root, dirs, files in os.walk(str(dest_base)):
            for file in files:
                if file.lower().endswith('.png'):
                    dest_count += 1
        
        log.write(f"Files confirmed in destination: {dest_count}\n\n")
        
        if dest_count == total_copied:
            log.write("SUCCESS: All files copied correctly!\n")
        else:
            log.write(f"WARNING: Expected {total_copied} files but found {dest_count}\n")

# Read and print the log
with open(log_file, 'r') as log:
    print(log.read())
