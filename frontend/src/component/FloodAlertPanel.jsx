import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Droplets, Waves, Activity } from 'lucide-react';

const FloodAlertPanel = () => {
  const [riverLevel, setRiverLevel] = useState('');
  const [rainfall, setRainfall] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    if (!riverLevel || !rainfall) {
      alert("Please enter both River Level and Rainfall values.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Connect to your Django Backend
      const response = await fetch('http://127.0.0.1:8000/api/predict/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          river_level: parseFloat(riverLevel),
          rainfall: parseFloat(rainfall)
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setResult(data);
      } else {
        alert("Prediction Error: " + data.message);
      }
    } catch (error) {
      console.error("API Error:", error);
      alert("Failed to connect to SatarkMitra server.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100 font-sans">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 p-6 text-white">
        <h2 className="text-2xl font-bold flex items-center">
          <Activity className="mr-2" /> SatarkMitra AI
        </h2>
        <p className="text-blue-200 text-sm mt-1">Hybrid Ensemble Model (XGB + SVM + GRU)</p>
      </div>

      <div className="p-6">
        {/* Input Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">River Level (sq km)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Waves className="text-blue-500" size={18} />
              </div>
              <input
                type="number"
                step="0.01"
                className="w-full pl-10 pr-3 py-2 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="e.g. 1.5"
                value={riverLevel}
                onChange={(e) => setRiverLevel(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Rainfall (mm)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Droplets className="text-blue-500" size={18} />
              </div>
              <input
                type="number"
                step="0.1"
                className="w-full pl-10 pr-3 py-2 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="e.g. 12.0"
                value={rainfall}
                onChange={(e) => setRainfall(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handlePredict}
          disabled={loading}
          className={`w-full mt-6 py-3 px-4 rounded-lg font-bold text-white shadow-md transition-all transform hover:scale-105 ${
            loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {loading ? "Analyzing 6-Day Trends..." : "Analyze Risk"}
        </button>

        {/* Results Area */}
        {result && (
          <div className={`mt-6 p-4 rounded-xl border-l-8 animate-fade-in ${
            result.alert_level === 'HIGH' ? 'bg-red-50 border-red-600' : 'bg-green-50 border-green-500'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {result.alert_level === 'HIGH' ? 
                  <AlertTriangle className="text-red-600 h-8 w-8" /> : 
                  <CheckCircle className="text-green-600 h-8 w-8" />
                }
              </div>
              <div className="ml-4">
                <h3 className={`text-xl font-bold ${result.alert_level === 'HIGH' ? 'text-red-800' : 'text-green-800'}`}>
                  {result.alert_level} RISK
                </h3>
                <p className="text-sm font-medium mt-1 text-gray-700">
                  Ensemble Probability: <span className="text-lg font-bold">{(result.flood_probability).toFixed(1)}%</span>
                </p>
                
                {/* Advanced Details Toggle (Optional) */}
                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500 grid grid-cols-2 gap-2">
                  <div>XGBoost Vote: <span className={result.model_details.xgboost_risk ? "text-red-600 font-bold" : "text-green-600 font-bold"}>{result.model_details.xgboost_risk ? "RISK" : "SAFE"}</span></div>
                  <div>SVM Vote: <span className={result.model_details.svm_risk ? "text-red-600 font-bold" : "text-green-600 font-bold"}>{result.model_details.svm_risk ? "RISK" : "SAFE"}</span></div>
                  <div className="col-span-2">GRU Forecast: {result.model_details.gru_forecast_level.toFixed(2)} sq km</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloodAlertPanel;