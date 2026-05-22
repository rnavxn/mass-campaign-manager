#!/usr/bin/env python3

import csv
import random
import time
import sys
import os

FIRST_NAMES = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Quinn", "Avery", "Skyler", "Sam", "Charlie", "Devon", "Blake"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Chen", "Kim", "Patel", "Nguyen"]
DOMAINS = ["example.com", "testmail.org", "mockdata.net", "campaignos.io", "loadtest.local"]

def generate_csv(filename="contacts_1m.csv", num_rows=1000000):
    print(f"Generating {num_rows:,} records in target format...")
    start_time = time.time()

    with open(filename, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)

        # FIXED FORMAT: contact (email) first, then name
        writer.writerow(["contact", "name"])

        for i in range(num_rows):
            fname = random.choice(FIRST_NAMES)
            lname = random.choice(LAST_NAMES)
            domain = random.choice(DOMAINS)

            full_name = f"{fname} {lname}"
            email = f"{fname.lower()}{i}@{domain}" # Matches your jason0@ format style

            # Write email first, name second
            writer.writerow([email, full_name])

            if (i + 1) % 200000 == 0:
                print(f"   ... {i + 1:,} rows generated")

    elapsed_time = time.time() - start_time
    file_size_mb = os.path.getsize(filename) / (1024 * 1024)

    print(f"Success! Created {filename}")
    print(f"Stats: {num_rows:,} rows | {file_size_mb:.2f} MB | {elapsed_time:.2f} seconds")

if __name__ == "__main__":
    rows = int(sys.argv[1]) if len(sys.argv) > 1 else 1000000
    generate_csv(num_rows=rows)