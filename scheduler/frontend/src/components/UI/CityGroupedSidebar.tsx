import React, { useState, useEffect } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  BuildingOffice2Icon,
  MapPinIcon 
} from '@heroicons/react/24/outline';
import { cityService, CityWithClinics, ClinicConfiguration } from '../../services/cityService';

interface CityGroupedSidebarProps {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
  selectedCity: string | null;
  activeClinicIndex: number;
  onClinicSelect: (clinicId: string, index: number) => void;
  className?: string;
}

const CityGroupedSidebar: React.FC<CityGroupedSidebarProps> = ({
  sidebarOpen,
  onSidebarToggle,
  selectedCity,
  activeClinicIndex,
  onClinicSelect,
  className = ''
}) => {
  const [cities, setCities] = useState<CityWithClinics[]>([]);
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set(['stouffville'])); // Default expand Stouffville
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allClinics, setAllClinics] = useState<ClinicConfiguration[]>([]);

  useEffect(() => {
    const loadCities = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const enabledCities = await cityService.getEnabledCities();
        const citiesWithClinics: CityWithClinics[] = [];
        const clinicsList: ClinicConfiguration[] = [];
        
        for (const city of enabledCities) {
          const cityWithClinics = await cityService.getCityWithClinics(city.id);
          if (cityWithClinics) {
            citiesWithClinics.push(cityWithClinics);
            clinicsList.push(...cityWithClinics.clinics);
          }
        }
        
        setCities(citiesWithClinics);
        setAllClinics(clinicsList);
      } catch (err) {
        console.error('Failed to load cities:', err);
        setError('Failed to load cities');
      } finally {
        setIsLoading(false);
      }
    };

    loadCities();
  }, []);

  const toggleCityExpansion = (cityId: string) => {
    setExpandedCities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cityId)) {
        newSet.delete(cityId);
      } else {
        newSet.add(cityId);
      }
      return newSet;
    });
  };

  const getClinicGlobalIndex = (clinic: ClinicConfiguration): number => {
    return allClinics.findIndex(c => c.id === clinic.id);
  };

  const getFilteredCities = () => {
    if (!selectedCity) {
      return cities; // Show all cities when no city filter is selected
    }
    return cities.filter(city => city.id === selectedCity);
  };

  const filteredCities = getFilteredCities();

  if (error) {
    return (
      <aside className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-200 ${sidebarOpen ? 'w-64' : 'w-12'} h-screen sticky top-0 z-10 ${className}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className={`font-bold text-lg text-red-600 transition-all duration-200 ${sidebarOpen ? 'block' : 'hidden'}`}>
            Error
          </span>
          <button
            className="ml-auto p-1 rounded hover:bg-gray-100"
            onClick={onSidebarToggle}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <ChevronLeftIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`hidden md:flex flex-col bg-white border-r border-gray-200 transition-all duration-200 ${sidebarOpen ? 'w-64' : 'w-12'} h-screen sticky top-0 z-10 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className={`font-bold text-lg text-primary-700 transition-all duration-200 ${sidebarOpen ? 'block' : 'hidden'}`}>
          {selectedCity ? 'Filtered Clinics' : 'All Clinics'}
        </span>
        <button
          className="ml-auto p-1 rounded hover:bg-gray-100"
          onClick={onSidebarToggle}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? <ChevronLeftIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
        </button>
      </div>

      {/* Content */}
      <nav className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
            {sidebarOpen && <span className="ml-2 text-sm text-gray-600">Loading...</span>}
          </div>
        ) : (
          <div className="space-y-1 mt-2">
            {filteredCities.map((city) => (
              <div key={city.id} className="city-group">
                {/* City Header */}
                <button
                  className="flex items-center w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors duration-150"
                  onClick={() => toggleCityExpansion(city.id)}
                  aria-expanded={expandedCities.has(city.id)}
                >
                  <MapPinIcon className="h-4 w-4 mr-2 text-primary-500 flex-shrink-0" />
                  <span className={`font-medium text-gray-800 flex-1 ${sidebarOpen ? 'block' : 'hidden'}`}>
                    {city.displayName}
                  </span>
                  <span className={`text-xs text-gray-500 mr-2 ${sidebarOpen ? 'block' : 'hidden'}`}>
                    ({city.clinicCount})
                  </span>
                  {sidebarOpen && (
                    expandedCities.has(city.id) ? 
                      <ChevronUpIcon className="h-4 w-4 text-gray-400" /> : 
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  )}
                  {!sidebarOpen && <span className="sr-only">{city.displayName}</span>}
                </button>

                {/* City Clinics */}
                {expandedCities.has(city.id) && (
                  <ul className="ml-6 space-y-1">
                    {city.clinics.map((clinic) => {
                      const globalIndex = getClinicGlobalIndex(clinic);
                      const isActive = activeClinicIndex === globalIndex;
                      
                      return (
                        <li key={clinic.id}>
                          <button
                            className={`flex items-center w-full px-3 py-2 rounded transition-colors duration-150 text-left text-sm ${
                              isActive 
                                ? 'bg-primary-100 text-primary-700 font-semibold' 
                                : 'hover:bg-gray-100 text-gray-700'
                            }`}
                            onClick={() => onClinicSelect(clinic.id, globalIndex)}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            <BuildingOffice2Icon className="h-4 w-4 mr-2 text-primary-400 flex-shrink-0" />
                            <span className={`${sidebarOpen ? 'block' : 'hidden'} truncate`}>
                              {clinic.name}
                            </span>
                            {!sidebarOpen && <span className="sr-only">{clinic.name}</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Footer info */}
      {sidebarOpen && !isLoading && (
        <div className="border-t border-gray-100 p-3">
          <div className="text-xs text-gray-500">
            {selectedCity ? (
              <>Showing {filteredCities.reduce((sum, city) => sum + city.clinicCount, 0)} clinics</>
            ) : (
              <>Total: {cities.reduce((sum, city) => sum + city.clinicCount, 0)} clinics in {cities.length} cities</>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

export default CityGroupedSidebar;