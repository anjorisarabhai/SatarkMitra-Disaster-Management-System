import pandas as pd

# Load data (correct relative path)
df = pd.read_csv("data/river/satarkmitra_master_data.csv")

# Convert date column to datetime
df['date'] = pd.to_datetime(df['date'])

# Sort by date
df = df.sort_values('date')

# Select numeric columns only
numeric_cols = df.select_dtypes(include=['number']).columns

# Apply linear interpolation
df[numeric_cols] = df[numeric_cols].interpolate(
    method='linear',
    limit_direction='both'
)

# Save output
df.to_csv(
    "data/river/satarkmitra_master_data_interpolated.csv",
    index=False
)

print("✅ Linear interpolation applied successfully.")
