import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Load data
df = pd.read_csv("data/river/satarkmitra_master_data_interpolated.csv")
df['date'] = pd.to_datetime(df['date'])

# Time features
df['month'] = df['date'].dt.month

features = [
    'river_water_area_sqkm',
    'upstream_runoff_mm',
    'rainfall_mm',
    'ggn_runoff_mm',
    'ggn_rainfall_mm',
    'month'
]

X = df[features]
y = df['drainage_risk_score']

# Safety checks
assert X.isna().sum().sum() == 0
assert y.isna().sum() == 0

# Time-based split
split_idx = int(len(df) * 0.8)
X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

# Model
model = RandomForestRegressor(
    n_estimators=300,
    min_samples_leaf=5,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)
y_pred = model.predict(X_test)

# Metrics
print("Model Performance:")
print(f"MAE  : {mean_absolute_error(y_test, y_pred):.2f}")
print(f"RMSE : {np.sqrt(mean_squared_error(y_test, y_pred)):.2f}")
print(f"R²   : {r2_score(y_test, y_pred):.2f}")

# Feature importance
importance = pd.DataFrame({
    'Feature': features,
    'Importance': model.feature_importances_
}).sort_values(by='Importance', ascending=False)

print("\nFeature Importance:")
print(importance)

# Save model
joblib.dump(model, "data/river/drainage_risk_model.pkl")
print("\nModel saved successfully.")
