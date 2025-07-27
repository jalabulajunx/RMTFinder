// Core data types for the RMT platform

export interface RMTProfile {
  id: string
  cmtoRegistrationNumber: string
  name: string
  displayName: string
  credentials: string[]
  profileImage?: string
  cmtoVerification: CMTOVerification
  practiceLocations: PracticeLocation[]
  specialties: Specialty[]
  languages: string[]
  yearsExperience: number
  janeAppIntegrations: JaneAppIntegration[]
  reputation: ReputationData
  createdAt: Date
  updatedAt: Date
  dataQuality: QualityIndicator
}

export interface CMTOVerification {
  status: 'verified' | 'pending' | 'expired' | 'unknown'
  registrationNumber: string
  expiryDate: Date
  lastChecked: Date
  verificationLevel: 'full' | 'partial' | 'none'
}

export interface PracticeLocation {
  id: string
  name: string
  address: string
  city: string
  province: string
  postalCode: string
  phone?: string
  email?: string
  website?: string
  coordinates?: [number, number]
}

export interface Specialty {
  id: string
  name: string
  category: string
  description?: string
}

export interface JaneAppIntegration {
  clinicId: string
  staffId: number
  isActive: boolean
  lastSync: Date
}

export interface ReputationData {
  overallScore: number
  reviewCount: number
  recentTrend: 'improving' | 'stable' | 'declining'
  breakdown: {
    technicalSkills: number
    communication: number
    professionalism: number
    patientExperience: number
  }
}

export interface QualityIndicator {
  score: number
  completeness: number
  freshness: number
  accuracy: number
}

export interface SearchCriteria {
  location: {
    address?: string
    postalCode?: string
    coordinates?: [number, number]
    radius: number
  }
  dateRange: {
    startDate: Date
    endDate: Date
  }
  filters: {
    cmtoVerified: boolean
    specialties: string[]
    availability: 'immediate' | 'within_week' | 'flexible'
    priceRange?: [number, number]
    languages?: string[]
  }
}

export interface SearchResult {
  rmt: RMTProfile
  relevanceScore: number
  matchReasons: string[]
  nextAvailable?: AppointmentSlot
  trustLevel: 'high' | 'medium' | 'low'
  trustFactors: {
    cmtoVerified: boolean
    recentReviews: boolean
    activeBooking: boolean
    completeProfile: boolean
  }
  bookingOptions: BookingOption[]
}

export interface AppointmentSlot {
  startTime: Date
  duration: number
  treatmentType: string
  price: number
  location: PracticeLocation
  bookingUrl?: string
  contactInfo?: ContactDetails
}

export interface BookingOption {
  method: 'online' | 'phone' | 'email'
  url?: string
  phone?: string
  email?: string
  instructions?: string
}

export interface ContactDetails {
  phone?: string
  email?: string
  website?: string
}

export interface AvailabilityData {
  id?: string
  rmtId?: string
  name?: string
  clinic?: string
  clinicId: string
  clinicUrl?: string
  services?: Service[]
  slots?: AvailabilitySlot[]
  availability?: DayAvailability[]
  dataSource: 'real_time' | 'cached' | 'estimated' | 'real' | 'mock' | 'none'
  lastUpdated?: Date
  nextRefresh?: Date
  reliability?: number
  bookingMethods?: BookingMethods
}

export interface Service {
  name: string
  category?: string
  treatments?: Treatment[]
}

export interface Treatment {
  id: number
  name: string
  duration?: number
  price?: number
}

export interface DayAvailability {
  date: string
  dayOfWeek?: string
  slots: TimeSlot[]
  isFirstAvailable?: boolean // Flag to indicate this is from first_date
}

export interface AvailabilitySlot {
  date: string
  timeSlots: TimeSlot[]
}

export interface TimeSlot {
  startTime: string
  endTime: string
  duration: number
  treatmentType: string
  price: number
  isAvailable: boolean
  bookingUrl?: string
  treatmentId?: number
  startAt?: string  // Full datetime string from API
}

export interface BookingMethods {
  janeApp?: {
    available: boolean
    clinicUrl: string
    directBooking: boolean
  }
  phone?: {
    number: string
    hours: string
  }
  email?: {
    address: string
    responseTime: string
  }
}

// UI Component Props
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

export interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: 'sm' | 'md' | 'lg'
}

export interface LoadingState {
  isLoading: boolean
  error?: string
  data?: any
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}