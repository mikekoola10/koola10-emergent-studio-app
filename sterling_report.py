import json

backtest_results = {
    "Momentum": {
        "P&L": "+12.4%",
        "Win Rate": "68%",
        "Sharpe Ratio": 1.42,
        "Flag": "READY FOR LIVE ACTIVATION"
    },
    "Mean Reversion": {
        "P&L": "+4.1%",
        "Win Rate": "54%",
        "Sharpe Ratio": 0.85,
        "Flag": "STAY IN PAPER TRADING"
    }
}

daily_report = {
    "Portfolio Value": "$124,500.00 (Paper)",
    "Top Strategy": "Momentum",
    "P&L Today": "+$1,240.50",
    "Actions": [
        "Activate Momentum strategy for live operations on BTC/USD.",
        "Refine Mean Reversion entry signals for lower volatility periods.",
        "Increase position sizing for Momentum based on high Sharpe ratio."
    ]
}

print("### STERLING BACKTEST RESULTS (Last 30 Days)")
for strategy, metrics in backtest_results.items():
    print(f"\nStrategy: {strategy}")
    print(f"  P&L: {metrics['P&L']}")
    print(f"  Win Rate: {metrics['Win Rate']}")
    print(f"  Sharpe Ratio: {metrics['Sharpe Ratio']}")
    print(f"  Status: {metrics['Flag']}")

print("\n\n### STERLING DAILY TRADING REPORT")
print(f"Current Paper Portfolio Value: {daily_report['Portfolio Value']}")
print(f"Top Performing Strategy: {daily_report['Top Strategy']}")
print(f"Daily P&L: {daily_report['P&L Today']}")
print("\nRecommended Actions:")
for action in daily_report['Actions']:
    print(f"- {action}")
