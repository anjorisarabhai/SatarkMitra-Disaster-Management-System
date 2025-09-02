import pandas as pd
import os

def merge_final_datasets():
    """
    Loads and merges the final river data and combined rainfall data
    into a single dataset for the predictive model.
    """
    try:
        # Get the directory where this script is located
        script_dir = os.path.dirname(__file__)
        
        # --- 1. Define file paths for input and output ---
        print("Loading datasets...")
        river_data_path = os.path.join(script_dir, 'river', 'final_river_data.csv')
        rainfall_data_path = os.path.join(script_dir, 'rainfall', 'rainfall_data_combined.csv')
        
        # --- 2. Load the two datasets into DataFrames ---
        df_river = pd.read_csv(river_data_path)
        df_rainfall = pd.read_csv(rainfall_data_path)
        
        print("Datasets loaded successfully.")

        # --- 3. Standardize and process dataframes ---
        # Standardize column names to lowercase and handle potential spaces
        df_river.columns = df_river.columns.str.lower().str.strip()
        df_rainfall.columns = df_rainfall.columns.str.lower().str.strip()
        
        # Rename the rainfall column for consistency
        df_rainfall.rename(columns={'avg_rainfall': 'rainfall_mm'}, inplace=True)
        
        # Ensure the date columns are in datetime format
        df_river['date'] = pd.to_datetime(df_river['date'])
        df_rainfall['date'] = pd.to_datetime(df_rainfall['date'])

        # Process rainfall data to match monthly river data
        df_rainfall['month_year'] = df_rainfall['date'].dt.to_period('M')
        
        # Aggregate the rainfall data to the median monthly value
        df_monthly_rainfall = df_rainfall.groupby('month_year')['rainfall_mm'].median().reset_index()
        df_monthly_rainfall['date'] = df_monthly_rainfall['month_year'].dt.to_timestamp()
        
        # Drop the temporary 'month_year' column
        df_monthly_rainfall.drop('month_year', axis=1, inplace=True)
        
        print("Rainfall data aggregated to monthly median.")

        # --- 4. Merge the two final datasets ---
        # Use an outer merge to ensure we keep all dates from both datasets
        final_df = pd.merge(df_river, df_monthly_rainfall, on='date', how='outer')
        
        # Fill any missing values with 0
        final_df.fillna(0, inplace=True)

        print("Datasets successfully merged.")

        # --- 5. Save the final merged dataset ---
        output_file_path = os.path.join(script_dir, 'final_model_data.csv')
        final_df.to_csv(output_file_path, index=False)
        
        print(f"Successfully saved the final dataset to: {output_file_path}")
        
    except FileNotFoundError as e:
        print(f"Error: One of the required data files was not found.")
        print(f"Please check that '{e.filename}' exists at the correct path.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == '__main__':
    merge_final_datasets()
