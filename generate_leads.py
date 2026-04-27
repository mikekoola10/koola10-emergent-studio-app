import csv
import os
from datetime import datetime

date_str = datetime.now().strftime("%Y-%m-%d")
industries = ["tech", "healthcare", "finance"]

leads_data = {
    "tech": [
        ["Aether Dynamics", "Sarah Chen", "sarah@aether.io", "tech", "94"],
        ["Nebula Systems", "Mark Thorne", "m.thorne@nebula.net", "tech", "88"],
        ["Quantum Core", "Elena Rodriguez", "elena@quantumcore.ai", "tech", "91"],
        ["Cyber Shield", "David Wu", "dwu@cybershield.com", "tech", "85"],
        ["Data Forge", "Lisa Ray", "lray@dataforge.org", "tech", "82"],
        ["Cloud Stream", "James P. Smith", "james@cloudstream.co", "tech", "79"],
        ["Logic Gate", "Yuki Tanaka", "yuki@logicgate.jp", "tech", "87"],
        ["Pixel Perfect", "Oliver Twist", "oliver@pixel.io", "tech", "76"],
        ["Synapse Labs", "Nina Simone", "nina@synapselabs.com", "tech", "90"],
        ["Vector Flow", "Greg House", "ghouse@vectorflow.ai", "tech", "84"]
    ],
    "healthcare": [
        ["BioGenix", "Dr. Robert Aris", "raris@biogenix.md", "healthcare", "96"],
        ["HealthSync", "Monica Geller", "monica@healthsync.io", "healthcare", "89"],
        ["MedTech Solutions", "Phoebe Buffay", "phoebe@medtech.org", "healthcare", "92"],
        ["LifePath Pharmaceuticals", "Ross Geller", "ross@lifepath.pharma", "healthcare", "84"],
        ["CureAll Labs", "Chandler Bing", "cbing@cureall.com", "healthcare", "81"],
        ["Wellness Way", "Rachel Green", "rachel@wellnessway.net", "healthcare", "78"],
        ["Vitality Systems", "Joey Tribbiani", "joey@vitality.com", "healthcare", "85"],
        ["NanoHealth", "Gunther Central", "gunther@nanohealth.io", "healthcare", "90"],
        ["Prime Care", "Janice Litman", "janice@primecare.md", "healthcare", "83"],
        ["EcoMed", "Mike Hannigan", "mike@ecomed.org", "healthcare", "87"]
    ],
    "finance": [
        ["Sterling Wealth", "Sterling Archer", "archer@sterlingwealth.com", "finance", "95"],
        ["Lana Investments", "Lana Kane", "lana@investments.io", "finance", "91"],
        ["Mallory Capital", "Mallory Archer", "mallory@capital.net", "finance", "93"],
        ["Cyril Figgis Accounting", "Cyril Figgis", "cyril@figgis.com", "finance", "82"],
        ["Pam Poovey Assets", "Pam Poovey", "pam@assets.org", "finance", "88"],
        ["Krieger FinTech", "Algernon Krieger", "krieger@fintech.ai", "finance", "86"],
        ["Cheryl Tunt Trust", "Cheryl Tunt", "cheryl@tunt.co", "finance", "79"],
        ["Ray Gillette Financial", "Ray Gillette", "ray@gillette.net", "finance", "84"],
        ["Woodhouse Holdings", "Woodhouse", "woodhouse@holdings.com", "finance", "80"],
        ["Barry Bot Equity", "Barry Dillon", "barry@equity.io", "finance", "87"]
    ]
}

os.makedirs("data/leads", exist_ok=True)

# Full Lead CSVs
for industry in industries:
    filename = f"data/leads/leads_{industry}_{date_str}.csv"
    with open(filename, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Company Name", "Contact", "Email", "Industry", "Qualification Score"])
        writer.writerows(leads_data[industry])

# Master Delivery CSV
delivery_filename = f"data/leads/client_delivery_{date_str}.csv"
with open(delivery_filename, "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["Company Name", "Contact", "Email", "Industry", "Qualification Score"])
    for industry in industries:
        writer.writerows(leads_data[industry])

print(f"Generated lead files for {date_str}")
