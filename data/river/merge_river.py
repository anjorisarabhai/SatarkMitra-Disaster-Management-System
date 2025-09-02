import pandas as pd
import os

def merge_river_datasets():
    """
    Loads and merges the river water area and static river parameters
    into a single, comprehensive dataset and saves it to the same folder.
    """
    try:
        # Get the directory where this script is located
        script_dir = os.path.dirname(__file__)
        
        # --- 1. Define file paths for input and output ---
        print("Loading datasets...")
        river_ts_file = os.path.join(script_dir, 'river_data_timeseries_monthly.csv')
        static_params_file = os.path.join(script_dir, 'static_river_parameters.csv')
        output_file_path = os.path.join(script_dir, 'final_river_data.csv')
        
        # --- 2. Load the two datasets into DataFrames ---
        df_timeseries = pd.read_csv(river_ts_file)
        df_static = pd.read_csv(static_params_file)
        
        print("Datasets loaded successfully.")

        # --- 3. Add static parameters to every row of the time-series data ---
        # Get the single row of static data
        static_data = df_static.iloc[0]

        # Add each static parameter as a new column to the time-series DataFrame
        for column in df_static.columns:
            df_timeseries[column] = static_data[column]
        
        print("Static parameters added to the time-series data.")

        # --- 4. Finalize and save the merged dataset ---
        df_timeseries.to_csv(output_file_path, index=False)
        print(f"Successfully saved the final merged data to: {output_file_path}")
        
    except FileNotFoundError as e:
        print(f"Error: One of the required data files was not found.")
        print(f"Please check that '{e.filename}' exists at the correct path.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == '__main__':
    merge_river_datasets()
