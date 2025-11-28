import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta
import random # <-- Imported standard Python random module

# --- Configuration for File Paths ---
def get_output_path():
    """Calculates the absolute path to the output directory (data/language)."""
    # This logic handles running in a notebook cell by assuming a standard project structure.
    # We use os.getcwd() to find the notebook's current path, then manually navigate up and down.
    # Assuming the current working directory is the project root for safety if __file__ is undefined.
    script_dir = os.getcwd()

    # Navigate up one level (if running from a subdirectory) or assume current is project root
    # To reliably target 'data/language' from the project root:
    output_dir = os.path.join(script_dir, 'data', 'language')
    
    # Check if the path needs adjustment (e.g., if you are running from a subfolder like 'scripts')
    if not os.path.isdir(os.path.join(script_dir, 'data')):
        # Attempt to navigate up one level if 'data' is not found in the current directory
        script_dir = os.path.dirname(script_dir)
        output_dir = os.path.join(script_dir, 'data', 'language')

    os.makedirs(output_dir, exist_ok=True)
    return output_dir

def generate_synthetic_data(num_samples=200):
    """Generates synthetic SMS/Social Media distress data."""
    np.random.seed(42)
    random.seed(42) # Seed the standard random module as well
    output_dir = get_output_path()
    
    # 1. Define Distress Keywords and Scenarios
    keywords_hindi = [
        "madad chahiye", "pani bhar gaya", "khana nahi hai", "bachao", "fas gaye",
        "dawaai chahiye", "rasta band hai", "bachche fass gaye"
    ]
    keywords_english = [
        "help needed", "water rising", "no food", "stuck here", "evacuate",
        "medical aid", "road blocked", "children trapped"
    ]
    
    # 2. Define Village Locations (Lat/Lon range for Uttarakhand)
    villages = [
        ("Phata", 30.55, 79.05), ("Banswara", 30.40, 79.10), ("Gaurikund", 30.65, 79.08),
        ("Sitamata", 30.50, 79.15), ("Ukhimath", 30.52, 79.20), ("Chopta", 30.52, 79.13)
    ]
    
    data = []
    # Simulate a disaster happening in the recent future for demonstration
    start_date = datetime(2025, 7, 10)
    
    for i in range(num_samples):
        scenario_type = random.choice(['Rescue', 'Medical', 'Resource', 'Road']) # Using standard random
        
        # Select a base text
        text = ""
        if scenario_type == 'Rescue':
            # Use standard random.choice for single element selection from Python lists
            text = random.choice(keywords_hindi) if np.random.rand() < 0.5 else random.choice(keywords_english)
            text = f"jaldi {text}!" if 'madad' in text or 'bachao' in text else f"We are {text} near the bridge."

        elif scenario_type == 'Medical':
            # Use standard random.choice
            text = f"Urgent {random.choice(keywords_english[3:5])} for old man. No {random.choice(['doctor', 'medicine'])}."
        elif scenario_type == 'Resource':
            # Use standard random.choice
            text = f"We have {random.choice(['zero', 'kam'])} {random.choice(['rations', 'khana'])}. {random.choice(['send help', 'madad chahiye'])}"
        else: # Road
            # FIXED: Using standard random.choice to avoid NumPy's array dimension check
            road_keywords = keywords_english[-2:]
            village_tuple = random.choice(villages) 
            text = f"Landslide. {random.choice(road_keywords)} in {village_tuple[0]}." 

        # Assign location and time
        village_name, lat, lon = random.choice(villages)
        distress_score = np.random.uniform(0.5, 1.0) if 'bachao' in text or 'trapped' in text else np.random.uniform(0.1, 0.6)
        
        data.append({
            'timestamp': start_date + timedelta(hours=i//(num_samples/72)), # Distribute messages over 72 hours
            'location': village_name,
            # Add small random offsets to coordinates for scatter plot separation
            'lat': lat + np.random.uniform(-0.005, 0.005), 
            'lon': lon + np.random.uniform(-0.005, 0.005),
            'raw_text': text,
            'scenario': scenario_type,
            'initial_distress_score': distress_score
        })
        
    df = pd.DataFrame(data)
    
    # Save the synthetic data in the data/language folder
    output_path = os.path.join(output_dir, 'synthetic_distress_data.csv')
    df.to_csv(output_path, index=False)
    print(f"✓ Synthetic dataset saved to: {output_path}")
    return df

if __name__ == "__main__":
    generate_synthetic_data(200)