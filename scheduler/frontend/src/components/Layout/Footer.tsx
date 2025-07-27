import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheckIcon } from '@heroicons/react/24/solid'

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                <ShieldCheckIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">RMT Platform</span>
            </div>
            <p className="text-gray-600 max-w-md">
              Find verified Registered Massage Therapists with real-time availability. 
              Connecting you with trusted healthcare professionals in your area.
            </p>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-600 hover:text-primary-600 transition-colors duration-200">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/search" className="text-gray-600 hover:text-primary-600 transition-colors duration-200">
                  Search RMTs
                </Link>
              </li>
            </ul>
          </div>
          
          {/* About */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
              About
            </h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://cmto.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-primary-600 transition-colors duration-200"
                >
                  CMTO Verification
                </a>
              </li>
              <li>
                <span className="text-gray-600">
                  Accessibility
                </span>
              </li>
              <li>
                <span className="text-gray-600">
                  Privacy Policy
                </span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} RMT Platform. Built with modern web standards.
            </p>
            <div className="mt-4 md:mt-0">
              <p className="text-gray-500 text-sm">
                WCAG 2.1 AA Compliant • PWA Enabled
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer