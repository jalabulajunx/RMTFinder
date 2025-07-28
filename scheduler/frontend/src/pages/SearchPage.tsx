import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MagnifyingGlassIcon, CalendarIcon, FunnelIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline'
import Button from '../components/UI/Button'
import Input from '../components/UI/Input'
import Card from '../components/UI/Card'
import LoadingSpinner from '../components/UI/LoadingSpinner'
import Badge from '../components/UI/Badge'
import CitySelector from '../components/UI/CitySelector'
import CityGroupedSidebar from '../components/UI/CityGroupedSidebar'
import { AvailabilityData } from '../types'

const MOBILE_BREAKPOINT = 768

const SearchPage: React.FC = () => {
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Clinic and RMT state
  const [clinics, setClinics] = useState<Array<{id: string, name: string, url: string}>>([])
  const [loadedClinicIndexes, setLoadedClinicIndexes] = useState<number[]>([])
  const [clinicRMTs, setClinicRMTs] = useState<Record<string, AvailabilityData[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadingClinicIds, setLoadingClinicIds] = useState<Set<string>>(new Set())
  const [activeClinicIndex, setActiveClinicIndex] = useState(0)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [expandedRMTs, setExpandedRMTs] = useState<Set<string>>(new Set())
  const [filters] = useState({
    cmtoVerified: true,
    minRating: 0,
    maxDistance: 50,
    availabilityType: 'all' as 'all' | 'immediate' | 'within_week',
    selectedOrganization: '' as string
  })

  // Refs for scrolling
  const clinicSectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < MOBILE_BREAKPOINT) setSidebarOpen(false)
      else setSidebarOpen(true)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Set default dates
  useEffect(() => {
    const today = new Date()
    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)
    setStartDate(today.toISOString().split('T')[0])
    setEndDate(nextWeek.toISOString().split('T')[0])
  }, [])

  // Load clinics on mount
  useEffect(() => {
    const loadClinics = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/clinics')
        if (response.ok) {
          const data = await response.json()
          setClinics(data)
        }
      } catch (error) {
        console.error('Failed to load clinics', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadClinics()
  }, [])

  // Load RMTs for a clinic
  const loadClinicRMTs = useCallback(async (clinicIndex: number) => {
    if (clinicIndex >= clinics.length) return
    const clinic = clinics[clinicIndex]
    if (!clinic || loadedClinicIndexes.includes(clinicIndex)) return
    
    // Set loading state for this specific clinic
    setLoadingClinicIds(prev => new Set(prev).add(clinic.id))
    setIsLoadingMore(true)
    console.log(`🔄 Loading RMTs for clinic ${clinicIndex}: ${clinic.name}`)
    
    try {
      const numDays = calculateNumDays()
      const params = new URLSearchParams({
        clinicIndex: clinicIndex.toString(),
        date: startDate,
        num_days: numDays.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(filters.selectedOrganization && { organization: filters.selectedOrganization }),
        ...(selectedCity && { city: selectedCity })
      })
      
      const response = await fetch(`/api/availability/all?${params}`)
      if (response.ok) {
        const data = await response.json()
        console.log(`📊 Loaded ${data.data?.length || 0} RMTs for clinic ${clinic.name}`)
        
        // Store RMTs for this specific clinic
        setClinicRMTs(prev => ({ 
          ...prev, 
          [clinic.id]: data.data || [] 
        }))
        
        // Mark this clinic as loaded
        setLoadedClinicIndexes(prev => [...prev, clinicIndex])
      } else {
        console.error(`Failed to load clinic ${clinic.name}:`, response.statusText)
      }
    } catch (error) {
      console.error('Failed to load RMTs for clinic', clinic, error)
    } finally {
      // Remove loading state for this clinic
      setLoadingClinicIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(clinic.id)
        return newSet
      })
      setIsLoadingMore(false)
    }
  }, [clinics, loadedClinicIndexes, startDate, searchQuery, filters.selectedOrganization, selectedCity])

  // Initial load: first clinic
  useEffect(() => {
    console.log(`🔍 Initial load check: clinics=${clinics.length}, loaded=${loadedClinicIndexes.length}`)
    if (clinics.length > 0 && loadedClinicIndexes.length === 0) {
      console.log('🚀 Triggering initial load for first clinic')
      loadClinicRMTs(0)
    }
  }, [clinics, loadedClinicIndexes, loadClinicRMTs])

  // Infinite scroll: load next clinic
  useEffect(() => {
    const handleScroll = () => {
      if (isLoadingMore || isLoading) return
      if (loadedClinicIndexes.length >= clinics.length) return
      
      // Check if we're near the bottom of the page
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
        // Find the next clinic index to load (should be the next sequential one)
        const nextClinicIndex = loadedClinicIndexes.length
        console.log(`📜 Scroll triggered: loading clinic ${nextClinicIndex}`)
        loadClinicRMTs(nextClinicIndex)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isLoadingMore, isLoading, loadedClinicIndexes, clinics.length, loadClinicRMTs])

  // Helper functions
  const getFirstAvailableSlot = (rmt: AvailabilityData) => {
    // First, try to find a slot in the current availability data (within selected date range)
    if (rmt.availability && rmt.availability.length > 0) {
      for (const daySlot of rmt.availability) {
        if (daySlot.slots && daySlot.slots.length > 0) {
          const firstSlot = daySlot.slots[0]
          return {
            date: daySlot.date,
            dayOfWeek: daySlot.dayOfWeek,
            time: firstSlot.startTime,
            duration: firstSlot.duration,
            price: firstSlot.price,
            service: firstSlot.treatmentType
          }
        }
      }
    }
    
    // If no slots found in selected range, but we have availability data with dates
    // The API returns the first available date even when no slots exist in current range
    if (rmt.availability && rmt.availability.length > 0) {
      const firstAvailableDate = rmt.availability[0]
      if (firstAvailableDate.date) {
        // Check if there are any slots at all (even outside the range) to get actual time/price info
        let actualTime = 'Contact for times'
        let actualDuration = 60
        let actualPrice = 115
        let actualService = 'RMT Session'
        
        // Look through all availability data to find the first actual slot for time/price info
        for (const daySlot of rmt.availability) {
          if (daySlot.slots && daySlot.slots.length > 0) {
            const firstSlot = daySlot.slots[0]
            actualTime = firstSlot.startTime
            actualDuration = firstSlot.duration
            actualPrice = firstSlot.price
            actualService = firstSlot.treatmentType
            break
          }
        }
        
        return {
          date: firstAvailableDate.date,
          dayOfWeek: firstAvailableDate.dayOfWeek,
          time: actualTime,
          duration: actualDuration,
          price: actualPrice,
          service: actualService
        }
      }
    }
    
    return null
  }

  const getAvailableTreatmentTypes = (rmt: AvailabilityData) => {
    const treatmentTypes = new Map<string, { name: string, duration: number, price: number, count: number }>()
    
    // Only get from actual services - don't fabricate from slot durations
    if (rmt.services) {
      rmt.services.forEach(service => {
        if (service.treatments) {
          service.treatments.forEach(treatment => {
            const key = `${treatment.name}-${treatment.duration}-${treatment.price}`
            treatmentTypes.set(key, {
              name: treatment.name,
              duration: treatment.duration || 60,
              price: treatment.price || 115,
              count: 0
            })
          })
        }
      })
    }
    
    // Count actual slots for each service type
    if (rmt.availability) {
      rmt.availability.forEach(daySlot => {
        if (daySlot.slots) {
          daySlot.slots.forEach(slot => {
            // Try to match slots to actual services
            for (const [, treatment] of treatmentTypes.entries()) {
              if (treatment.duration === slot.duration && treatment.price === slot.price) {
                treatment.count++
                break
              }
            }
          })
        }
      })
    }
    
    return Array.from(treatmentTypes.values())
      .filter(treatment => treatment.count > 0) // Only show services that have actual slots
      .sort((a, b) => a.duration - b.duration)
  }

  const toggleRMTExpansion = (rmtId: string) => {
    setExpandedRMTs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(rmtId)) {
        newSet.delete(rmtId)
      } else {
        newSet.add(rmtId)
      }
      return newSet
    })
  }

  const calculateNumDays = () => {
    if (!startDate || !endDate) return 7
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(1, Math.min(diffDays, 30)) // Limit between 1 and 30 days
  }

  // Sidebar navigation: scroll to clinic section
  const handleSidebarClinicClick = (clinicId: string, index: number) => {
    setActiveClinicIndex(index)
    const ref = clinicSectionRefs.current[clinicId]
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    // Preload if not loaded
    if (!loadedClinicIndexes.includes(index)) {
      loadClinicRMTs(index)
    }
  }

  // Render
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* City-Grouped Sidebar */}
      <CityGroupedSidebar
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen(open => !open)}
        selectedCity={selectedCity}
        activeClinicIndex={activeClinicIndex}
        onClinicSelect={handleSidebarClinicClick}
      />

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-5xl px-4 py-8">
          {/* Search Form */}
          <Card className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Input
                label="Search RMTs"
                placeholder="Name, specialty, or clinic"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<MagnifyingGlassIcon />}
              />
              <CitySelector
                selectedCity={selectedCity}
                onCityChange={setSelectedCity}
                showAllCitiesOption={true}
              />
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                leftIcon={<CalendarIcon />}
              />
              <Input
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                leftIcon={<CalendarIcon />}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="primary"
                onClick={() => {
                  console.log('🔍 Search button clicked - resetting and reloading with city filter:', selectedCity)
                  setClinicRMTs({})
                  setLoadedClinicIndexes([])
                  setLoadingClinicIds(new Set())
                  setActiveClinicIndex(0)
                  // Small delay to ensure state is reset before loading
                  setTimeout(() => {
                    loadClinicRMTs(0)
                  }, 100)
                }}
                loading={isLoading || isLoadingMore}
                className="flex-1 sm:flex-none"
              >
                <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                Search Availability
              </Button>
              <Button
                variant="secondary"
                onClick={() => alert('Advanced filters coming soon!')}
                className="flex-1 sm:flex-none"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Advanced Filters
              </Button>
            </div>
          </Card>

          {/* RMT Results by Clinic */}
          {clinics.map((clinic, idx) => (
            <div
              key={clinic.id}
              ref={el => (clinicSectionRefs.current[clinic.id] = el)}
              className="mb-12"
            >
              <h2 className="text-2xl font-bold text-primary-700 mb-4 flex items-center gap-2">
                <BuildingOffice2Icon className="h-6 w-6 text-primary-400" />
                {clinic.name}
              </h2>
              {loadingClinicIds.has(clinic.id) ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                  <span className="ml-3 text-gray-600">Loading RMTs for {clinic.name}...</span>
                </div>
              ) : clinicRMTs[clinic.id] && clinicRMTs[clinic.id].length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {clinicRMTs[clinic.id].map((rmt, rmtIdx) => {
                    const firstSlot = getFirstAvailableSlot(rmt)
                    const treatmentTypes = getAvailableTreatmentTypes(rmt)
                    const isExpanded = expandedRMTs.has(rmt.id || `${rmtIdx}`)
                    const rmtKey = rmt.id || `${rmtIdx}`

                    return (
                      <Card key={rmt.id || rmtIdx} hover className="cursor-pointer">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {rmt.name}
                              </h3>
                              <Badge
                                variant={rmt.dataSource === 'real' ? 'success' : rmt.dataSource === 'mock' ? 'warning' : 'neutral'}
                                size="sm"
                              >
                                {rmt.dataSource === 'real' ? 'Live Data' : rmt.dataSource === 'mock' ? 'Estimated' : 'Contact'}
                              </Badge>
                            </div>
                            <p className="text-gray-600">{clinic.name}</p>
                            
                            {/* Services */}
                            {rmt.services && rmt.services.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-500 mb-1">Services:</p>
                                <div className="flex flex-wrap gap-1">
                                  {rmt.services.slice(0, 3).map((service, serviceIdx) => (
                                    <Badge key={serviceIdx} variant="neutral" size="sm">
                                      {service.name}
                                    </Badge>
                                  ))}
                                  {rmt.services.length > 3 && (
                                    <Badge variant="neutral" size="sm">
                                      +{rmt.services.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Enhanced Availability Display */}
                        {rmt.availability && rmt.availability.length > 0 ? (
                          <div className="mt-4">
                            {/* First Available Slot - Prominent Display */}
                            {firstSlot && (
                              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-green-800">Next Available</p>
                                    <p className="text-lg font-semibold text-green-900">
                                      {new Date(firstSlot.date + 'T12:00:00').toLocaleDateString('en-US', { 
                                        weekday: 'short', 
                                        month: 'short', 
                                        day: 'numeric' 
                                      })} at {firstSlot.time}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-green-700">{firstSlot.duration}min</p>
                                    <p className="text-lg font-semibold text-green-900">${firstSlot.price}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Treatment Types Available */}
                            {treatmentTypes.length > 0 && (
                              <div className="mb-3">
                                <p className="text-sm font-medium text-gray-700 mb-2">Available Sessions:</p>
                                <div className="flex flex-wrap gap-2">
                                  {treatmentTypes.map((treatment, treatmentIdx) => (
                                    <div
                                      key={treatmentIdx}
                                      className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm"
                                    >
                                      <span className="font-medium text-blue-900">{treatment.name}</span>
                                      <span className="text-blue-700 ml-1">({treatment.duration}min, ${treatment.price})</span>
                                      {treatment.count > 0 && (
                                        <span className="text-blue-600 ml-1">- {treatment.count} slots</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Show All Appointments Toggle */}
                            <div className="mb-3">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => toggleRMTExpansion(rmtKey)}
                                className="text-sm"
                              >
                                {(() => {
                                  const totalSlots = rmt.availability.reduce((total, day) => total + (day.slots?.length || 0), 0)
                                  if (totalSlots > 0) {
                                    return `${isExpanded ? 'Hide' : 'Show All'} Appointments (${totalSlots} total)`
                                  } else {
                                    return `${isExpanded ? 'Hide' : 'Show'} Availability Info`
                                  }
                                })()}
                              </Button>
                            </div>

                            {/* Expanded Availability View */}
                            {isExpanded && (
                              <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                {(() => {
                                  const totalSlots = rmt.availability.reduce((total, day) => total + (day.slots?.length || 0), 0)
                                  if (totalSlots > 0) {
                                    return (
                                      <>
                                        <h5 className="text-sm font-medium text-gray-700 mb-2">All Available Times:</h5>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                          {rmt.availability.map((daySlot, dayIdx) => (
                                            <div key={dayIdx} className="border-l-2 border-primary-200 pl-3">
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-gray-800">
                                                  {daySlot.dayOfWeek || new Date(daySlot.date + 'T12:00:00').toLocaleDateString('en-US', { 
                                                    weekday: 'long', 
                                                    month: 'short', 
                                                    day: 'numeric' 
                                                  })}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                  {daySlot.slots?.length || 0} slots
                                                </span>
                                              </div>
                                              
                                              {daySlot.slots && daySlot.slots.length > 0 && (
                                                <div className="space-y-1">
                                                  {daySlot.slots.map((slot, slotIdx) => {
                                                    // Find the matching service name for this slot
                                                    const matchingService = treatmentTypes.find(t => 
                                                      t.duration === slot.duration && t.price === slot.price
                                                    )
                                                    const serviceName = matchingService?.name || slot.treatmentType || 'RMT Session'
                                                    
                                                    return (
                                                      <div
                                                        key={slotIdx}
                                                        className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors cursor-pointer text-sm"
                                                        onClick={() => {
                                                          if (rmt.clinicUrl) {
                                                            window.open(rmt.clinicUrl, '_blank')
                                                          }
                                                        }}
                                                      >
                                                        <div className="flex items-center space-x-3">
                                                          <span className="font-medium text-primary-700">
                                                            {slot.startTime || (slot.startAt && new Date(slot.startAt).toLocaleTimeString('en-US', { 
                                                              hour: 'numeric', 
                                                              minute: '2-digit',
                                                              hour12: false 
                                                            }))}
                                                          </span>
                                                          <span className="text-gray-700">
                                                            {serviceName}
                                                          </span>
                                                        </div>
                                                        <div className="flex items-center space-x-2 text-gray-600">
                                                          <span>{slot.duration || 60}min</span>
                                                          <span className="font-medium">${slot.price || 115}</span>
                                                        </div>
                                                      </div>
                                                    )
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    )
                                  } else {
                                    // No slots in selected range, but RMT has availability data
                                    return (
                                      <>
                                        <h5 className="text-sm font-medium text-gray-700 mb-2">Availability Information:</h5>
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                                          <p className="text-sm text-blue-800 mb-2">
                                            This RMT has availability, but no open slots in your selected date range.
                                          </p>
                                          {firstSlot && firstSlot.time !== 'Contact for times' && (
                                            <p className="text-sm text-blue-700">
                                              Next available: {new Date(firstSlot.date + 'T12:00:00').toLocaleDateString('en-US', { 
                                                weekday: 'long', 
                                                month: 'short', 
                                                day: 'numeric' 
                                              })} at {firstSlot.time}
                                            </p>
                                          )}
                                          <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => {
                                              if (rmt.clinicUrl) {
                                                window.open(rmt.clinicUrl, '_blank')
                                              }
                                            }}
                                            className="mt-2"
                                          >
                                            Contact for Availability
                                          </Button>
                                        </div>
                                      </>
                                    )
                                  }
                                })()}
                              </div>
                            )}
                            
                            {/* Booking Action */}
                            <div className="pt-3 border-t border-gray-100">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  if (rmt.clinicUrl) {
                                    window.open(rmt.clinicUrl, '_blank')
                                  } else {
                                    alert('Booking information not available')
                                  }
                                }}
                                className="w-full"
                              >
                                Book Appointment
                              </Button>
                            </div>
                          </div>
                        ) : rmt.dataSource === 'real' ? (
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-sm text-yellow-800">
                              No availability found for the selected date range.
                            </p>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                if (rmt.clinicUrl) {
                                  window.open(rmt.clinicUrl, '_blank')
                                }
                              }}
                              className="w-full mt-2"
                            >
                              Check Clinic Website
                            </Button>
                          </div>
                        ) : (
                          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
                            <p className="text-sm text-gray-600 mb-2">
                              Contact directly for availability:
                            </p>
                            {/* Show treatment types even without availability */}
                            {treatmentTypes.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs text-gray-500 mb-1">Typical Sessions:</p>
                                <div className="flex flex-wrap gap-1">
                                  {treatmentTypes.map((treatment, treatmentIdx) => (
                                    <span
                                      key={treatmentIdx}
                                      className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                                    >
                                      {treatment.duration}min - ${treatment.price}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                if (rmt.clinicUrl) {
                                  window.open(rmt.clinicUrl, '_blank')
                                }
                              }}
                              className="w-full"
                            >
                              Visit Clinic Website
                            </Button>
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              ) : loadedClinicIndexes.includes(idx) ? (
                <div className="text-gray-500 italic">No RMTs found for this clinic.</div>
              ) : (
                <div className="text-gray-400 italic">Click to load RMTs for this clinic.</div>
              )}
            </div>
          ))}

          {/* Loading More Spinner */}
          {isLoadingMore && (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gray-600">Loading next clinic...</span>
            </div>
          )}
          {/* All loaded message */}
          {!isLoadingMore && loadedClinicIndexes.length === clinics.length && clinics.length > 0 && (
            <div className="text-center text-gray-500 py-8">All clinics loaded.</div>
          )}
        </div>
      </main>
    </div>
  )
}

export default SearchPage