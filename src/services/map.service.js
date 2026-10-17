// Calculate spherical distance between two coordinates in kilometers
export const calculate_haversine_distance = (lat1, lon1, lat2, lon2) => {
  const to_rad = (angle) => (angle * Math.PI) / 180;
  const earth_radius_km = 6371;

  const d_lat = to_rad(lat2 - lat1);
  const d_lon = to_rad(lon2 - lon1);

  const a =
    Math.sin(d_lat / 2) * Math.sin(d_lat / 2) +
    Math.cos(to_rad(lat1)) *
      Math.cos(to_rad(lat2)) *
      Math.sin(d_lon / 2) *
      Math.sin(d_lon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance_km = earth_radius_km * c;

  return Math.round(distance_km * 100) / 100;
};

// Calculate total route distance and estimated travel minutes including all intermediate stops
export const calculate_route_metrics = async (pickup, dropoff, stops = []) => {
  const ordered_points = [
    { latitude: parseFloat(pickup.latitude), longitude: parseFloat(pickup.longitude) },
    ...stops.map((stop) => ({
      latitude: parseFloat(stop.latitude),
      longitude: parseFloat(stop.longitude),
    })),
    { latitude: parseFloat(dropoff.latitude), longitude: parseFloat(dropoff.longitude) },
  ];

  let total_distance_km = 0;

  for (let i = 0; i < ordered_points.length - 1; i++) {
    const point_a = ordered_points[i];
    const point_b = ordered_points[i + 1];

    const segment_distance = calculate_haversine_distance(
      point_a.latitude,
      point_a.longitude,
      point_b.latitude,
      point_b.longitude
    );
    total_distance_km += segment_distance;
  }

  // Realistic routing factor: accounts for urban road curves (+25% over geodesic Haversine distance)
  const adjusted_distance_km = Math.round(total_distance_km * 1.25 * 100) / 100;

  // City travel estimation: average speed 25 km/h + 3 minutes dwell per stop
  const average_city_speed_kmh = 25;
  const travel_minutes = (adjusted_distance_km / average_city_speed_kmh) * 60;
  const stop_dwell_minutes = stops.length * 3;
  const estimated_duration_minutes = Math.ceil(travel_minutes + stop_dwell_minutes);

  return {
    distance_km: Math.max(adjusted_distance_km, 0.5), // Minimum 500m threshold
    duration_minutes: Math.max(estimated_duration_minutes, 3), // Minimum 3 mins threshold
    total_waypoints: ordered_points.length,
  };
};