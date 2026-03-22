"""
LSTM Demand Forecaster.

Generates realistic synthetic demand data based on Indian logistics
patterns (monsoon, festivals, quarter-end spikes), trains a lightweight
LSTM, and provides 7-day forecasts per region.
"""

import numpy as np
import torch
import torch.nn as nn
from typing import List, Dict
from config import CITIES


# ─── Synthetic Demand Data Generator ───────────────────────

def _generate_demand_data(city: str, days: int = 365) -> np.ndarray:
    """
    Generate realistic daily demand data for an Indian city.
    
    Patterns modeled:
    - Weekly cycle (lower on Sundays)
    - Monsoon dip (Jun-Sep: reduced logistics)
    - Festival spikes (Diwali, Navratri in Oct-Nov)
    - Quarter-end spikes (Mar, Jun, Sep, Dec)
    - City-size scaling
    """
    np.random.seed(hash(city) % 2**31)
    
    # Base demand by city importance
    city_scale = {
        "Mumbai": 1.0, "Delhi": 0.95, "Bangalore": 0.85,
        "Chennai": 0.80, "Hyderabad": 0.75, "Kolkata": 0.70,
        "Pune": 0.65, "Ahmedabad": 0.60, "Jaipur": 0.50,
        "Lucknow": 0.45, "Nagpur": 0.40, "Indore": 0.35,
        "Bhopal": 0.30, "Visakhapatnam": 0.35, "Coimbatore": 0.40,
    }
    scale = city_scale.get(city, 0.5)
    base = 500 * scale
    
    demand = np.zeros(days)
    
    for d in range(days):
        day_of_year = d % 365
        day_of_week = d % 7
        month = (day_of_year // 30) + 1
        
        val = base
        
        # Weekly pattern: Sunday dip
        if day_of_week == 6:
            val *= 0.7
        elif day_of_week == 5:  # Saturday
            val *= 0.85
        
        # Monsoon dip (June-September)
        if 6 <= month <= 9:
            val *= 0.75
        
        # Festival spike (October-November: Diwali/Navratri)
        if month in (10, 11):
            val *= 1.4
        
        # Quarter-end spikes
        if month in (3, 6, 9, 12) and day_of_year % 30 > 20:
            val *= 1.25
        
        # Random noise
        val += np.random.normal(0, base * 0.1)
        
        demand[d] = max(val, 10)
    
    return demand


# ─── LSTM Model ────────────────────────────────────────────

class DemandLSTM(nn.Module):
    """Lightweight LSTM for demand forecasting."""
    
    def __init__(self, input_size=1, hidden_size=32, num_layers=1, output_size=7):
        super().__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)
    
    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size)
        out, _ = self.lstm(x, (h0, c0))
        out = self.fc(out[:, -1, :])
        return out


def _create_sequences(data: np.ndarray, seq_length: int = 30, forecast_horizon: int = 7):
    """Create input/output sequences for LSTM training."""
    X, y = [], []
    for i in range(len(data) - seq_length - forecast_horizon):
        X.append(data[i:i + seq_length])
        y.append(data[i + seq_length:i + seq_length + forecast_horizon])
    return np.array(X), np.array(y)


def _train_model(data: np.ndarray, epochs: int = 30) -> DemandLSTM:
    """Train LSTM on city demand data."""
    # Normalize
    mean = data.mean()
    std = data.std() + 1e-8
    normalized = (data - mean) / std
    
    X, y = _create_sequences(normalized)
    
    X_tensor = torch.FloatTensor(X).unsqueeze(-1)  # (N, seq, 1)
    y_tensor = torch.FloatTensor(y)
    
    model = DemandLSTM()
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.005)
    
    model.train()
    for epoch in range(epochs):
        optimizer.zero_grad()
        output = model(X_tensor)
        loss = criterion(output, y_tensor)
        loss.backward()
        optimizer.step()
    
    model.eval()
    model._mean = mean
    model._std = std
    return model


# ─── Forecast API ──────────────────────────────────────────

_model_cache: Dict[str, DemandLSTM] = {}


def get_demand_forecast(cities: List[str] = None, forecast_days: int = 7) -> List[dict]:
    """
    Generate 7-day demand forecasts for each city.
    
    Returns list of:
    {
        "city": str,
        "region": str,
        "day": int (1-7),
        "predicted_demand": float,
        "confidence_low": float,
        "confidence_high": float,
    }
    """
    if cities is None:
        cities = list(CITIES.keys())
    
    results = []
    
    for city in cities:
        # Get or train model
        if city not in _model_cache:
            data = _generate_demand_data(city)
            _model_cache[city] = _train_model(data, epochs=20)
        
        model = _model_cache[city]
        
        # Generate recent data for prediction
        data = _generate_demand_data(city)
        recent = data[-30:]
        normalized = (recent - model._mean) / model._std
        
        input_tensor = torch.FloatTensor(normalized).unsqueeze(0).unsqueeze(-1)
        
        with torch.no_grad():
            prediction = model(input_tensor).squeeze().numpy()
        
        # Denormalize
        prediction = prediction * model._std + model._mean
        
        region = CITIES.get(city, {}).get("region", "Unknown")
        
        for day in range(min(forecast_days, len(prediction))):
            pred_val = max(float(prediction[day]), 0)
            results.append({
                "city": city,
                "region": region,
                "day": day + 1,
                "predicted_demand": round(pred_val, 1),
                "confidence_low": round(pred_val * 0.85, 1),
                "confidence_high": round(pred_val * 1.15, 1),
            })
    
    return results
