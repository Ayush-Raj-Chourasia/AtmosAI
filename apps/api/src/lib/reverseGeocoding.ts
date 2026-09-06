/**
 * Reverse geocode using Google Maps API to get "City, Province" format
 * Intelligently extracts the best location from geocoding results
 */
export async function reverseGeocodeCity(lat: number, lng: number): Promise<string | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return reverseGeocodeCityNominatim(lat, lng);
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      return reverseGeocodeCityNominatim(lat, lng);
    }

    const data = await res.json();

    if (data.status !== 'OK' || !data.results?.length) {
      return reverseGeocodeCityNominatim(lat, lng);
    }

    // Extract the best "City, Province" from results
    return extractBestLocation(data.results);
  } catch {
    return reverseGeocodeCityNominatim(lat, lng);
  }
}

/**
 * Extract the best "City, Province" from geocoding results
 * Skips plus codes and generic country-only results
 */
function extractBestLocation(results: Array<{ formatted_address: string; types?: string[] }>): string | null {
  if (!results || results.length === 0) return null;

  // Filter out invalid results
  const validResults = results.filter(r => {
    const addr = r.formatted_address;
    if (!addr) return false;

    // Skip plus codes (e.g., "6P667G29+2X", "H922+JJ8 Something")
    if (/^[A-Z0-9]{4,}\+[A-Z0-9]+/.test(addr)) return false;

    // Skip if it's just a country
    if (addr === 'Indonesia') return false;

    // Skip if too short (likely incomplete)
    if (addr.length < 10) return false;

    return true;
  });

  if (validResults.length === 0) return null;

  // Priority: Look for results with locality, administrative_area_level_2 (regency/city)
  const priorityTypes = ['locality', 'administrative_area_level_2', 'administrative_area_level_3'];

  for (const priorityType of priorityTypes) {
    const match = validResults.find(r => r.types?.includes(priorityType));
    if (match) {
      return formatToCityProvince(match.formatted_address);
    }
  }

  // Look for results with Regency/City/Kota/Kabupaten in the name
  const regencyResult = validResults.find(r =>
    r.formatted_address.includes('Regency') ||
    r.formatted_address.includes('City') ||
    r.formatted_address.includes('Kota') ||
    r.formatted_address.includes('Kabupaten')
  );

  if (regencyResult) {
    return formatToCityProvince(regencyResult.formatted_address);
  }

  // Fallback to first valid result
  return formatToCityProvince(validResults[0].formatted_address);
}

/**
 * Format a full address to "City, Province" format
 */
function formatToCityProvince(address: string): string | null {
  if (!address) return null;

  const parts = address.split(',').map(p => p.trim());

  // Remove "Indonesia" if present at the end
  if (parts[parts.length - 1] === 'Indonesia') {
    parts.pop();
  }

  // Remove postal codes (5 digit numbers)
  const filteredParts = parts.filter(p => !/^\d{5}$/.test(p));

  // Remove plus codes that might be embedded
  const cleanParts = filteredParts.filter(p => !/^[A-Z0-9]{4,}\+[A-Z0-9]+/.test(p));

  if (cleanParts.length === 0) return null;

  if (cleanParts.length === 1) {
    return cleanParts[0];
  }

  // Return "City/Regency, Province" format (last two meaningful parts)
  const city = cleanParts[cleanParts.length - 2];
  const province = cleanParts[cleanParts.length - 1];

  return `${city}, ${province}`;
}

/**
 * Fallback reverse geocoding using Nominatim (OpenStreetMap)
 */
async function reverseGeocodeCityNominatim(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      {
        headers: {
          // REQUIRED by Nominatim usage policy
          'User-Agent': 'disaster-pulse/1.0 (mail@denyherianto.com)'
        }
      }
    );

    if (!res.ok) return null;

    const data = await res.json();

    // Extract city and province from addressdetails if available
    if (data.address) {
      const city = data.address.city || data.address.town || data.address.county || data.address.municipality;
      const province = data.address.state || data.address.province;

      if (city && province) {
        return `${city}, ${province}`;
      } else if (province) {
        return province;
      }
    }

    // Fallback to display_name with formatting
    if (data.display_name) {
      return formatToCityProvince(data.display_name);
    }

    return null;
  } catch {
    return null;
  }
}
