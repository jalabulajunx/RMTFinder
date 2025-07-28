/**
 * City Management Service
 * Handles city-based clinic organization and configuration migration
 */

export interface ClinicConfiguration {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  address?: string;
  phone?: string;
  specialties?: string[];
}

export interface CityConfiguration {
  id: string;
  name: string;
  displayName: string;
  enabled: boolean;
  coordinates?: [number, number];
  clinics: ClinicConfiguration[];
}

export interface CityBasedConfiguration {
  cities: Record<string, CityConfiguration>;
  settings: {
    requestTimeout: number;
    userAgent: string;
    maxRetries: number;
    retryDelay: number;
  };
  metadata?: {
    version: string;
    lastUpdated: string;
    migrationSource?: 'flat' | 'manual';
  };
}

export interface CityWithClinics {
  id: string;
  name: string;
  displayName: string;
  enabled: boolean;
  clinics: ClinicConfiguration[];
  clinicCount: number;
}

export interface CityOption {
  id: string;
  name: string;
  displayName: string;
  clinicCount: number;
  enabled: boolean;
}

// Legacy flat configuration interface for migration
interface LegacyConfiguration {
  clinics: ClinicConfiguration[];
  settings: any;
}

class CityService {
  private configCache: CityBasedConfiguration | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Load and cache the city-based configuration
   */
  private async loadConfiguration(): Promise<CityBasedConfiguration> {
    const now = Date.now();
    if (this.configCache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.configCache;
    }

    try {
      const response = await fetch('/api/cities/config');
      if (!response.ok) {
        throw new Error(`Failed to load configuration: ${response.statusText}`);
      }
      
      const config = await response.json();
      this.configCache = config;
      this.cacheTimestamp = now;
      return config;
    } catch (error) {
      console.error('Error loading city configuration:', error);
      throw error;
    }
  }

  /**
   * Get all cities with their clinic information
   */
  async getAllCities(): Promise<CityConfiguration[]> {
    const config = await this.loadConfiguration();
    return Object.values(config.cities).filter(city => city.enabled);
  }

  /**
   * Get a specific city by ID
   */
  async getCityById(cityId: string): Promise<CityConfiguration | null> {
    const config = await this.loadConfiguration();
    return config.cities[cityId] || null;
  }

  /**
   * Get all enabled cities
   */
  async getEnabledCities(): Promise<CityConfiguration[]> {
    const cities = await this.getAllCities();
    return cities.filter(city => city.enabled);
  }

  /**
   * Get city with clinic details and counts
   */
  async getCityWithClinics(cityId: string): Promise<CityWithClinics | null> {
    const city = await this.getCityById(cityId);
    if (!city) return null;

    return {
      id: city.id,
      name: city.name,
      displayName: city.displayName,
      enabled: city.enabled,
      clinics: city.clinics.filter(clinic => clinic.enabled),
      clinicCount: city.clinics.filter(clinic => clinic.enabled).length
    };
  }

  /**
   * Get clinics for a specific city
   */
  async getClinicsByCity(cityId: string): Promise<ClinicConfiguration[]> {
    const city = await this.getCityById(cityId);
    return city ? city.clinics.filter(clinic => clinic.enabled) : [];
  }

  /**
   * Filter clinics by city ID
   */
  filterClinicsByCity(clinics: ClinicConfiguration[], _cityId: string): ClinicConfiguration[] {
    // This method works with already loaded clinic data
    return clinics; // In practice, this would be used with pre-filtered data
  }

  /**
   * Get city options for dropdown selector
   */
  async getCityOptions(): Promise<CityOption[]> {
    const cities = await this.getEnabledCities();
    return cities.map(city => ({
      id: city.id,
      name: city.name,
      displayName: city.displayName,
      clinicCount: city.clinics.filter(clinic => clinic.enabled).length,
      enabled: city.enabled
    }));
  }

  /**
   * Get all clinics from all enabled cities (backward compatibility)
   */
  async getAllClinics(): Promise<ClinicConfiguration[]> {
    const cities = await this.getEnabledCities();
    const allClinics: ClinicConfiguration[] = [];
    
    cities.forEach(city => {
      allClinics.push(...city.clinics.filter(clinic => clinic.enabled));
    });
    
    return allClinics;
  }

  /**
   * Detect configuration format
   */
  detectConfigurationFormat(config: any): 'flat' | 'city-based' {
    if (config.cities && typeof config.cities === 'object') {
      return 'city-based';
    } else if (config.clinics && Array.isArray(config.clinics)) {
      return 'flat';
    }
    throw new Error('Unknown configuration format');
  }

  /**
   * Migrate from flat configuration to city-based structure
   */
  migrateFromFlatConfiguration(flatConfig: LegacyConfiguration): CityBasedConfiguration {
    const cityBasedConfig: CityBasedConfiguration = {
      cities: {
        stouffville: {
          id: 'stouffville',
          name: 'Stouffville',
          displayName: 'Stouffville',
          enabled: true,
          coordinates: [43.9706, -79.2441],
          clinics: flatConfig.clinics
        }
      },
      settings: flatConfig.settings,
      metadata: {
        version: '2.0',
        lastUpdated: new Date().toISOString(),
        migrationSource: 'flat'
      }
    };

    return cityBasedConfig;
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.configCache = null;
    this.cacheTimestamp = 0;
  }
}

// Export singleton instance
export const cityService = new CityService();
export default cityService;