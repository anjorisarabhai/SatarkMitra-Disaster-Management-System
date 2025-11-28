import pandas as pd
import numpy as np
import os
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

# --- Configuration for File Paths ---
def get_project_paths():
    """Calculates the paths to the data and model folders."""
    # This logic handles both running in a notebook (where __file__ is undefined) and running via terminal
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
    except NameError:
        script_dir = os.getcwd()
        
    project_root = os.path.abspath(os.path.join(script_dir, '..'))
    data_dir = os.path.join(project_root, 'data', 'language')
    model_dir = os.path.join(project_root, 'data', 'sentiment_models') # Saves models separately
    os.makedirs(model_dir, exist_ok=True)
    return data_dir, model_dir

DATA_FILENAME = 'synthetic_distress_data.csv'

def load_data(data_dir):
    """Loads and preprocesses the raw text data from the /data/language/ folder."""
    file_path = os.path.join(data_dir, DATA_FILENAME)
    if not os.path.exists(file_path):
        print(f"\n--- ERROR ---\nMissing data file: {DATA_FILENAME}. Please run nlp_data_simulator.py first.")
        return None
        
    df = pd.read_csv(file_path)
    
    # 1. Clean Text (Lowercasing, removing special characters)
    df['clean_text'] = df['raw_text'].apply(lambda x: re.sub(r'[^a-zA-Z\s]', '', x.lower()))
    
    # 2. Simple Keyword Tally (Feature for clustering)
    keywords = ['help', 'stuck', 'madad', 'bachao', 'food', 'khana', 'medical', 'road', 'pani', 'water']
    for keyword in keywords:
        df[f'kw_{keyword}'] = df['clean_text'].apply(lambda x: x.count(keyword))
        
    return df

def feature_extraction_and_clustering(df, model_dir):
    """
    Extracts NLP features using TF-IDF and performs k-Means clustering 
    for priority triage.
    """
    if df is None or df.empty:
        return None

    print(f"\nProcessing {len(df)} distress reports...")

    # --- A. NLP Feature Vectorization (TF-IDF) ---
    # TF-IDF captures the importance of words in identifying distress
    tfidf = TfidfVectorizer(max_features=100, stop_words='english')
    X_text_features = tfidf.fit_transform(df['clean_text']).toarray()
    
    # --- B. Combine all Numerical Features for Clustering ---
    # We combine TF-IDF (word patterns), Keyword Tally, and Initial Distress Score
    keyword_cols = [col for col in df.columns if col.startswith('kw_')]
    X_other_features = df[['initial_distress_score'] + keyword_cols].values
    
    X_combined = np.hstack([X_text_features, X_other_features])

    # --- C. Scaling ---
    # Scaling is crucial for K-Means to ensure all features contribute equally
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_combined)
    
    # --- D. K-Means Clustering for Priority Triage ---
    # K=3 clusters: 0 (Low Priority), 1 (Medium), 2 (High Priority/Urgent Rescue)
    K = 3
    kmeans = KMeans(n_clusters=K, random_state=42, n_init=10)
    df['Priority_Cluster'] = kmeans.fit_predict(X_scaled)
    
    # --- E. Evaluate Clustering Quality ---
    # The Silhouette Score measures how similar an object is to its own cluster compared to others.
    score = silhouette_score(X_scaled, df['Priority_Cluster'])
    print(f"✓ Clustering Quality (Silhouette Score): {score:.4f}")
    print("A higher score (closer to 1) means better defined clusters.")

    # --- F. Saving Models and Results ---
    
    # Save the clustering model, scaler, and vectorizer
    joblib.dump(kmeans, os.path.join(model_dir, 'kmeans_priority_model.pkl'))
    joblib.dump(scaler, os.path.join(model_dir, 'clustering_scaler.pkl'))
    joblib.dump(tfidf, os.path.join(model_dir, 'tfidf_vectorizer.pkl'))

    # Save the final data with cluster labels (for dashboard visualization)
    df_output = df[['timestamp', 'location', 'lat', 'lon', 'raw_text', 'Priority_Cluster']]
    df_output.to_csv(
        os.path.join(model_dir, 'prioritized_requests.csv'), 
        index=False
    )
    print(f"✓ Models and prioritized data saved to {model_dir}")

    # --- G. Visualization Concept ---
    plt.figure(figsize=(10, 8))
    sns.scatterplot(x='lon', y='lat', hue='Priority_Cluster', data=df_output, palette='viridis', s=100)
    plt.title('Village Distress Clusters (Simulated Heatmap Concept)')
    plt.xlabel('Longitude')
    plt.ylabel('Latitude')
    plt.legend(title='Priority Level')
    # Save the plot concept to the models directory
    plt.savefig(os.path.join(model_dir, 'distress_heatmap_concept.png'))
    plt.show()

    return df

if __name__ == "__main__":
    data_dir, model_dir = get_project_paths()
    results_df = feature_extraction_and_clustering(load_data(data_dir), model_dir)
    
    if results_df is not None:
        print("\nNLP Pipeline Complete. The prioritized requests data and models are ready.")