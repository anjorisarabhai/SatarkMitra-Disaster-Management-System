import pandas as pd
import os
import glob

def concatenate_rainfall_data():
    """
    Finds and concatenates all 'raw_rainfall_data_*.csv' files in the
    current directory into a single CSV file.
    """
    try:
        # Get the directory where this script is located
        script_dir = os.path.dirname(__file__)
        
        # Define the pattern to find all raw rainfall data files
        file_pattern = os.path.join(script_dir, 'rainfall_*.csv')
        
        # Get a list of all matching file paths
        all_files = glob.glob(file_pattern)
        
        if not all_files:
            print("Error: No 'rainfall_*.csv' files found in the directory.")
            return

        print(f"Found {len(all_files)} rainfall data files. Concatenating...")

        # Create a list to hold the DataFrames
        df_list = []
        for file in all_files:
            try:
                # Read each file into a DataFrame
                df = pd.read_csv(file)
                df_list.append(df)
            except Exception as e:
                print(f"Warning: Could not read file {file}. Skipping. Error: {e}")
        
        # Concatenate all DataFrames in the list
        if not df_list:
            print("Error: No valid data could be loaded from the files.")
            return

        combined_df = pd.concat(df_list, ignore_index=True)
        
        print("Data successfully concatenated.")

        # --- Save the combined dataset ---
        output_file_path = os.path.join(script_dir, 'rainfall_data_combined.csv')
        combined_df.to_csv(output_file_path, index=False)
        
        print(f"Successfully saved combined rainfall data to: {output_file_path}")

    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == '__main__':
    concatenate_rainfall_data()