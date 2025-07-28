import React, { useState, useEffect } from 'react';
import { MapPinIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { cityService, CityOption } from '../../services/cityService';

interface CitySelectorProps {
  selectedCity: string | null;
  onCityChange: (cityId: string | null) => void;
  showAllCitiesOption?: boolean;
  disabled?: boolean;
  className?: string;
}

const CitySelector: React.FC<CitySelectorProps> = ({
  selectedCity,
  onCityChange,
  showAllCitiesOption = true,
  disabled = false,
  className = ''
}) => {
  const [cities, setCities] = useState<CityOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCities = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const cityOptions = await cityService.getCityOptions();
        setCities(cityOptions);
      } catch (err) {
        console.error('Failed to load cities:', err);
        setError('Failed to load cities');
      } finally {
        setIsLoading(false);
      }
    };

    loadCities();
  }, []);

  const handleCityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    onCityChange(value === '' ? null : value);
  };

  const getSelectedCityName = () => {
    if (!selectedCity) return 'All Cities';
    const city = cities.find(c => c.id === selectedCity);
    return city ? city.displayName : 'Unknown City';
  };

  if (error) {
    return (
      <div className={`city-selector-error ${className}`}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Location
        </label>
        <div className="flex items-center px-3 py-2 border border-red-300 rounded-md bg-red-50">
          <MapPinIcon className="h-4 w-4 text-red-400 mr-2" />
          <span className="text-sm text-red-600">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`city-selector ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Location
      </label>
      <div className="relative">
        <select
          value={selectedCity || ''}
          onChange={handleCityChange}
          disabled={disabled || isLoading}
          className="w-full appearance-none border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          aria-label="Select city"
        >
          {showAllCitiesOption && (
            <option value="">All Cities</option>
          )}
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.displayName} ({city.clinicCount} clinics)
            </option>
          ))}
        </select>
        
        {/* Icon overlay */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPinIcon className="h-4 w-4 text-gray-400" />
        </div>
        
        {/* Dropdown arrow */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
        </div>
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-y-0 right-8 pr-3 flex items-center pointer-events-none">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
          </div>
        )}
      </div>
      
      {/* Selected city info */}
      {selectedCity && !isLoading && (
        <div className="mt-1 text-xs text-gray-500">
          Showing results for {getSelectedCityName()}
        </div>
      )}
    </div>
  );
};

export default CitySelector;