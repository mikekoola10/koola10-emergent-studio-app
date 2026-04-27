import os
import csv
from datetime import datetime, timedelta

def send_mock_email(to_email, subject, body):
    # Simulating email sending
    print(f"SENT: {to_email} | Subject: {subject}")
    return True

def schedule_reminder(lead_name, to_email):
    followup_time = (datetime.now() + timedelta(hours=48)).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open("data/reminders.csv", "a") as f:
        f.write(f"{lead_name},{to_email},{followup_time},PENDING\n")
    print(f"SCHEDULED: Follow-up for {lead_name} at {followup_time}")

def log_audit(lead_name, to_email, action):
    timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
    with open("data/compliance_audit_chain.csv", "a") as f:
        f.write(f"{timestamp},{lead_name},{to_email},{action},SUCCESS\n")

# Initialize files
if not os.path.exists("data/reminders.csv"):
    with open("data/reminders.csv", "w") as f:
        f.write("Lead Name,Email,Follow-up Time,Status\n")

if not os.path.exists("data/compliance_audit_chain.csv"):
    with open("data/compliance_audit_chain.csv", "w") as f:
        f.write("Timestamp,Lead Name,Email,Action,Status\n")

# Leads to process
leads = [
    {"name": "BioGenix", "email": "raris@biogenix.md", "file": "data/outreach/biogenix_outreach.txt"},
    {"name": "Sterling Wealth", "email": "archer@sterlingwealth.com", "file": "data/outreach/sterling_wealth_outreach.txt"},
    {"name": "Aether Dynamics", "email": "sarah@aether.io", "file": "data/outreach/aether_dynamics_outreach.txt"}
]

for lead in leads:
    with open(lead["file"], "r") as f:
        content = f.read()
        lines = content.split("\n")
        subject = lines[0].replace("Subject: ", "")
        body = "\n".join(lines[2:])

    if send_mock_email(lead["email"], subject, body):
        schedule_reminder(lead["name"], lead["email"])
        log_audit(lead["name"], lead["email"], "OUTREACH_EMAIL_SENT")
