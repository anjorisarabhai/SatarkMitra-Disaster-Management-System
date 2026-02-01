export interface Zone {
  zone_name: string;
  latitude: number;
  longitude: number;
  risk_score: number;
  risk_status: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  details: {
    elevation: number;
    drainage: string;
  };
}

export interface Report {
  lat: number;
  lng: number;
  note: string;
}
