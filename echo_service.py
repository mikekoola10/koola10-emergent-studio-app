import json
import os
from datetime import datetime

LEDGER_PATH = "data/economic_ledger.csv"
BALANCE_PATH = "data/echo_balance.json"

def get_balance():
    if not os.path.exists(BALANCE_PATH):
        return 1000.0  # Initial balance for testing
    with open(BALANCE_PATH, 'r') as f:
        return json.load(f).get("balance", 0.0)

def save_balance(balance):
    with open(BALANCE_PATH, 'w') as f:
        json.dump({"balance": balance}, f)

def log_transaction(action, cost, remaining):
    timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
    with open(LEDGER_PATH, "a") as f:
        # action, vertical, strategy, pair, size, status
        f.write(f"{timestamp},{action},api-as-a-service,Echo,IMAGE_GEN,${cost},SUCCESS,Remaining: ${remaining:.2f}\n")

def generate_image(prompt):
    cost = 0.01
    balance = get_balance()

    if balance < cost:
        return {"error": "Insufficient balance", "cost": 0, "remaining_balance": balance}

    new_balance = balance - cost
    save_balance(new_balance)

    # Simulate Hugging Face FLUX.1-schnell output
    image_url = f"https://koola10.fly.dev/assets/gen_{hash(prompt) % 10000}.png"

    log_transaction("BILLING_CHARGE", cost, new_balance)

    return {
        "image_url": image_url,
        "cost": cost,
        "remaining_balance": round(new_balance, 2)
    }

if __name__ == "__main__":
    import sys
    prompt = sys.argv[1] if len(sys.argv) > 1 else "A futuristic neon city"
    result = generate_image(prompt)
    print(json.dumps(result, indent=2))
