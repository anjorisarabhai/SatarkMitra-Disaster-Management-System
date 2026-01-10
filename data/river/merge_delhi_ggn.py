import pandas as pd
import os

def merge_flood_data(data_folder):
    """
    Merges Delhi river data and Gurugram drainage data into a single master CSV.
    """
    # 1. Define File Paths
    delhi_file = os.path.join(data_folder, 'delhi_river_data.csv')
    ggn_file = os.path.join(data_folder, 'ggn_drainage_data.csv')
    master_file = os.path.join(data_folder, 'satarkmitra_master_data.csv')

    # 2. Check if files exist
    if not os.path.exists(delhi_file) or not os.path.exists(ggn_file):
        print("Error: One or both CSV files are missing in the 'river' folder.")
        return

    # 3. Load Datasets
    print("Reading CSV files...")
    df_delhi = pd.read_csv(delhi_file)
    df_ggn = pd.read_csv(ggn_file)

    # 4. Merge on 'date' column
    # We use 'outer' merge to ensure no dates are lost, though they should match.
    master_df = pd.merge(df_delhi, df_ggn, on='date', how='outer')

    # 5. Clean Data (Sort by date and handle any NaNs)
    master_df['date'] = pd.to_datetime(master_df['date'])
    master_df = master_df.sort_values(by='date')
    master_df = master_df.fillna(0) # Replace missing values with 0

    # 6. FEATURE ENGINEERING: Simple Logic for "Predicted Risk"
    # This is a sample logic to show the power of merged data
    # High Risk = High GGN Runoff + High Delhi Rainfall
    master_df['drainage_risk_score'] = (master_df['ggn_runoff_mm'] * 0.7) + (master_df['rainfall_mm'] * 0.3)

    # 7. Save the Master Dataset
    master_df.to_csv(master_file, index=False)
    
    print("-" * 30)
    print(f"SUCCESS: Master Dataset created!")
    print(f"Location: {master_file}")
    print(f"Total Rows: {len(master_df)}")
    print("-" * 30)
    print("Final Columns:")
    for col in master_df.columns:
        print(f" - {col}")

if __name__ == '__main__':
    # Path to your river data folder
    river_path = r"C:\Users\Anjori Sarabhai\Desktop\anjori\SatarkMitra-Disaster-Management-System\data\river"
    
    merge_flood_data(river_path)