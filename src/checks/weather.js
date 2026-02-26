/**
 * Weather API check definitions using Open-Meteo (FREE, no API key needed).
 * Each check is a config object for the Monitor class.
 *
 * Open-Meteo docs: https://open-meteo.com/en/docs
 */

function createWeatherChecks(city = 'London') {
    // Default coordinates for common cities
    const CITIES = {
        London: { lat: 51.5074, lon: -0.1278 },
        NewYork: { lat: 40.7128, lon: -74.0060 },
        Tokyo: { lat: 35.6762, lon: 139.6503 },
        Paris: { lat: 48.8566, lon: 2.3522 },
        Sydney: { lat: -33.8688, lon: 151.2093 },
    };

    const coords = CITIES[city] || CITIES['London'];

    return [
        {
            name: 'Current Weather',
            url: `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,wind_speed_10m,relative_humidity_2m,weather_code`,
            validators: [
                (body, res) => res.status === 200 ? true : `Expected 200, got ${res.status}`,
                (body) => {
                    if (!body) return 'Empty response body';
                    if (!body.current) return 'Missing "current" field';
                    if (typeof body.current.temperature_2m !== 'number') return 'Missing "current.temperature_2m"';
                    if (typeof body.current.wind_speed_10m !== 'number') return 'Missing "current.wind_speed_10m"';
                    return true;
                },
                // Temperature sanity check (-90 to 60 °C)
                (body) => {
                    if (!body || !body.current) return true;
                    const temp = body.current.temperature_2m;
                    if (temp < -90 || temp > 60) return `Temperature ${temp}°C out of sane range`;
                    return true;
                },
            ],
        },
        {
            name: '7-Day Forecast',
            url: `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`,
            validators: [
                (body, res) => res.status === 200 ? true : `Expected 200, got ${res.status}`,
                (body) => {
                    if (!body) return 'Empty response body';
                    if (!body.daily) return 'Missing "daily" field';
                    if (!Array.isArray(body.daily.time) || body.daily.time.length === 0) return '"daily.time" array is empty';
                    if (!Array.isArray(body.daily.temperature_2m_max)) return 'Missing "daily.temperature_2m_max"';
                    return true;
                },
            ],
        },
        {
            name: 'Geocoding',
            url: `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`,
            validators: [
                (body, res) => res.status === 200 ? true : `Expected 200, got ${res.status}`,
                (body) => {
                    if (!body) return 'Empty response body';
                    if (!body.results || !Array.isArray(body.results)) return 'Missing "results" array';
                    if (body.results.length === 0) return 'Empty geocoding results';
                    const first = body.results[0];
                    if (typeof first.latitude !== 'number' || typeof first.longitude !== 'number') {
                        return 'Missing latitude/longitude in geocoding result';
                    }
                    return true;
                },
            ],
        },
    ];
}

module.exports = { createWeatherChecks };
