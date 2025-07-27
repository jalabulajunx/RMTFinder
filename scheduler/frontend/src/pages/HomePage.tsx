import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/UI/Button'
import Card from '../components/UI/Card'


const HomePage: React.FC = () => {
  const [testData, setTestData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const testAPI = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/organizations')
      const data = await response.json()
      setTestData(data)
    } catch (error) {
      console.error('API test failed:', error)
      setTestData({ error: 'API test failed' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    testAPI()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Find Your Perfect RMT
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Discover verified Registered Massage Therapists with real-time availability across multiple clinics. 
            Book your next appointment with confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/search">
              <Button variant="primary" size="lg">
                Start Searching
              </Button>
            </Link>
            <Button variant="secondary" size="lg">
              Learn More
            </Button>
          </div>
        </div>

        {/* API Test Section */}
        <Card className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="primary" 
                onClick={testAPI}
                loading={isLoading}
                disabled={isLoading}
              >
                Test API Connection
              </Button>
              <span className="text-sm text-gray-600">
                {isLoading ? 'Testing...' : 'Click to test API connection'}
              </span>
            </div>
            
            {testData && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">API Response:</h3>
                <pre className="text-sm text-gray-700 overflow-auto">
                  {JSON.stringify(testData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Card>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Verified RMTs</h3>
              <p className="text-gray-600">
                All therapists are verified and registered with professional credentials
              </p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Availability</h3>
              <p className="text-gray-600">
                See current availability and book appointments instantly
              </p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Multiple Clinics</h3>
              <p className="text-gray-600">
                Search across multiple clinics in your area for the best options
              </p>
            </div>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="bg-primary-50 border-primary-200">
            <h2 className="text-2xl font-semibold text-primary-900 mb-4">
              Ready to Find Your Perfect RMT?
            </h2>
            <p className="text-primary-700 mb-6">
              Start your search now and discover available appointments near you
            </p>
            <Link to="/search">
              <Button variant="primary" size="lg">
                Start Searching Now
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default HomePage