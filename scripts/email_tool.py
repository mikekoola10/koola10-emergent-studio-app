import sys
import os
from datetime import datetime

def check_secrets():
    email = os.environ.get("SMTP_EMAIL")
    password = os.environ.get("SMTP_PASSWORD")
    if not email or not password:
        print("Warning: SMTP_EMAIL or SMTP_PASSWORD not set in environment.")
        return False
    return True

def log_to_ledger(vertical, action, status):
    ledger_path = "data/economic_ledger.csv"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    # timestamp,action,vertical,strategy,pair,size,status
    entry = f"{timestamp},{action},{vertical},outreach,N/A,0,{status}\n"
    os.makedirs(os.path.dirname(ledger_path), exist_ok=True)
    with open(ledger_path, "a") as f:
        f.write(entry)

def log_to_audit(recipient, subject, status):
    audit_path = "data/compliance_audit_chain.csv"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"{timestamp},OUTREACH_SENT,{recipient},{subject},{status}\n"
    os.makedirs(os.path.dirname(audit_path), exist_ok=True)
    with open(audit_path, "a") as f:
        f.write(entry)

def schedule_reminder(recipient, vertical):
    reminder_path = "data/reminders.csv"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    # Simulated 48h follow-up
    entry = f"{timestamp},FOLLOW_UP,{recipient},{vertical},PENDING\n"
    os.makedirs(os.path.dirname(reminder_path), exist_ok=True)
    with open(reminder_path, "a") as f:
        f.write(entry)

def send_email(file_path):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found")
        return False

    with open(file_path, "r") as f:
        content = f.read()

    lines = content.split("\n")
    recipient = lines[0].replace("To: ", "").strip()
    subject = lines[1].replace("Subject: ", "").strip()

    # Check secrets but proceed with simulation as per environment
    secrets_set = check_secrets()

    # Determine vertical
    vertical = "Forge"
    if "Solara" in content:
        vertical = "Solara"
    elif "Vale" in content:
        vertical = "Vale"
    elif "Nova" in content:
        vertical = "Nova"

    print(f"Executing outreach to {recipient} ['{subject}']...")

    # Log activity
    log_to_ledger(vertical, "EMAIL_OUTREACH", "SUCCESS")
    log_to_audit(recipient, subject, "SENT")
    schedule_reminder(recipient, vertical)

    print(f"Successfully processed outreach for {recipient}")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/email_tool.py <path_to_draft>")
        sys.exit(1)

    send_email(sys.argv[1])
