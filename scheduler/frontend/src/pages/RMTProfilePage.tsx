import React from 'react'
import { useParams } from 'react-router-dom'
import { 
  ShieldCheckIcon, 
  MapPinIcon, 
  PhoneIcon, 
  EnvelopeIcon,
  StarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import Button from '../components/UI/Button'
import Card from '../components/UI/Card'
import Badge from '../components/UI/Badge'

const RMTProfilePage: React.FC = () => {
  const { id } = useParams()
  
  // Use the id parameter for API calls when implemented
  console.log('RMT Profile ID:', id)
  
  // Mock data - would be fetched based on ID
  const rmt = {
    id: '1',
    name: 'Dr. Sarah Johnson',
    credentials: ['RMT', 'BSc Kinesiology'],
    clinic: 'Wellness Center Toronto',
    address: '123 Main St, Toronto, ON M5V 3A8',
    phone: '(416) 555-0123',
    email: 'sarah@wellnesscenter.ca',
    verified: true,
    rating: 4.8,
    reviewCount: 127,
    yearsExperience: 8,
    specialties: ['Deep Tissue Massage', 'Sports Massage', 'Relaxation Therapy', 'Injury Rehabilitation'],
    languages: ['English', 'French'],
    bio: 'Dr. Sarah Johnson is a dedicated Registered Massage Therapist with over 8 years of experience helping clients achieve optimal health and wellness. She specializes in deep tissue massage and sports therapy, working with athletes and active individuals to prevent injury and enhance performance.',
    availability: [
      { date: '2024-01-15', slots: ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'] },
      { date: '2024-01-16', slots: ['10:00 AM', '1:00 PM', '3:00 PM'] },
      { date: '2024-01-17', slots: ['9:00 AM', '11:00 AM', '2:00 PM'] }
    ]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <Card>
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="h-24 w-24 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary-600">
                      {rmt.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {rmt.name}
                    </h1>
                    {rmt.verified && (
                      <Badge variant="success">
                        <ShieldCheckIcon className="h-3 w-3 mr-1" />
                        CMTO Verified
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {rmt.credentials.map((credential, index) => (
                      <Badge key={index} variant="info" size="sm">
                        {credential}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <StarIcon className="h-4 w-4 text-warning-400" />
                      <span className="font-medium">{rmt.rating}</span>
                      <span>({rmt.reviewCount} reviews)</span>
                    </div>
                    <div>
                      {rmt.yearsExperience} years experience
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPinIcon className="h-4 w-4" />
                    <span>{rmt.clinic}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* About */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">About</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                {rmt.bio}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Specialties</h3>
                  <div className="flex flex-wrap gap-1">
                    {rmt.specialties.map((specialty, index) => (
                      <Badge key={index} variant="neutral" size="sm">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Languages</h3>
                  <div className="flex flex-wrap gap-1">
                    {rmt.languages.map((language, index) => (
                      <Badge key={index} variant="neutral" size="sm">
                        {language}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Availability */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Available Appointments
              </h2>
              
              <div className="space-y-4">
                {rmt.availability.map((day, index) => (
                  <div key={index}>
                    <h3 className="font-medium text-gray-900 mb-2">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {day.slots.map((slot, slotIndex) => (
                        <Button
                          key={slotIndex}
                          variant="secondary"
                          size="sm"
                          className="justify-center"
                        >
                          {slot}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <Button variant="primary" className="w-full sm:w-auto">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Book Appointment
                </Button>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Contact Information
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MapPinIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{rmt.clinic}</p>
                    <p className="text-sm text-gray-600">{rmt.address}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <PhoneIcon className="h-5 w-5 text-gray-400" />
                  <a 
                    href={`tel:${rmt.phone}`}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    {rmt.phone}
                  </a>
                </div>
                
                <div className="flex items-center gap-3">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  <a 
                    href={`mailto:${rmt.email}`}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    {rmt.email}
                  </a>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h2>
              
              <div className="space-y-3">
                <Button variant="primary" className="w-full">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Book Now
                </Button>
                
                <Button variant="secondary" className="w-full">
                  <PhoneIcon className="h-4 w-4 mr-2" />
                  Call Clinic
                </Button>
                
                <Button variant="secondary" className="w-full">
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </Card>

            {/* Verification Status */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Verification Status
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="h-5 w-5 text-success-600" />
                  <span className="text-sm text-gray-900">CMTO Verified</span>
                </div>
                
                <div className="text-xs text-gray-500">
                  Registration verified on January 10, 2024
                </div>
                
                <a 
                  href="https://cmto.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  Verify on CMTO website →
                </a>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RMTProfilePage