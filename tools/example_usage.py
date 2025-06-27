#!/usr/bin/env python3
"""
Example usage of the improved RMT Review Extractor

This script demonstrates how to use the new configurable parameters
for different scenarios and use cases.

Usage:
    python example_usage.py
"""

import os
from rmt_review_extractor import RMTReviewExtractor

def example_basic_usage():
    """Basic usage with default settings"""
    print("🔧 Example 1: Basic Usage (Default Settings)")
    print("-" * 50)
    
    google_api_key = os.getenv('GOOGLE_PLACES_API_KEY', 'DEMO_KEY_FOR_EXAMPLE')
    
    # Default configuration
    extractor = RMTReviewExtractor(google_api_key=google_api_key)
    
    print("Default settings:")
    print(f"  • max_results_per_type: {extractor.max_results_per_type}")
    print(f"  • min_places_before_fallback: {extractor.min_places_before_fallback}")
    print(f"  • max_total_places: {extractor.max_total_places}")
    print(f"  • api_delay: {extractor.request_delay} seconds")
    
    return extractor

def example_high_coverage_usage():
    """High coverage configuration for comprehensive search"""
    print("\n🔧 Example 2: High Coverage Configuration")
    print("-" * 50)
    
    google_api_key = os.getenv('GOOGLE_PLACES_API_KEY', 'DEMO_KEY_FOR_EXAMPLE')
    
    # High coverage configuration
    extractor = RMTReviewExtractor(
        google_api_key=google_api_key,
        max_results_per_type=75,        # More results per type
        min_places_before_fallback=15,  # Higher threshold
        max_total_places=300,           # More total places
        api_delay=0.3                   # Faster API calls
    )
    
    print("High coverage settings:")
    print(f"  • max_results_per_type: {extractor.max_results_per_type}")
    print(f"  • min_places_before_fallback: {extractor.min_places_before_fallback}")
    print(f"  • max_total_places: {extractor.max_total_places}")
    print(f"  • api_delay: {extractor.request_delay} seconds")
    print("  • Use case: Comprehensive search in dense urban areas")
    
    return extractor

def example_conservative_usage():
    """Conservative configuration for rate-limited environments"""
    print("\n🔧 Example 3: Conservative Configuration")
    print("-" * 50)
    
    google_api_key = os.getenv('GOOGLE_PLACES_API_KEY', 'DEMO_KEY_FOR_EXAMPLE')
    
    # Conservative configuration
    extractor = RMTReviewExtractor(
        google_api_key=google_api_key,
        max_results_per_type=25,        # Fewer results per type
        min_places_before_fallback=5,   # Lower threshold
        max_total_places=100,           # Fewer total places
        api_delay=1.0                   # Slower API calls
    )
    
    print("Conservative settings:")
    print(f"  • max_results_per_type: {extractor.max_results_per_type}")
    print(f"  • min_places_before_fallback: {extractor.min_places_before_fallback}")
    print(f"  • max_total_places: {extractor.max_total_places}")
    print(f"  • api_delay: {extractor.request_delay} seconds")
    print("  • Use case: Rate-limited environments or rural areas")
    
    return extractor

def example_custom_usage():
    """Custom configuration for specific needs"""
    print("\n🔧 Example 4: Custom Configuration")
    print("-" * 50)
    
    google_api_key = os.getenv('GOOGLE_PLACES_API_KEY', 'DEMO_KEY_FOR_EXAMPLE')
    
    # Custom configuration for specific needs
    extractor = RMTReviewExtractor(
        google_api_key=google_api_key,
        max_results_per_type=60,        # Balanced results
        min_places_before_fallback=8,   # Moderate threshold
        max_total_places=150,           # Moderate total
        api_delay=0.7                   # Balanced delay
    )
    
    print("Custom settings:")
    print(f"  • max_results_per_type: {extractor.max_results_per_type}")
    print(f"  • min_places_before_fallback: {extractor.min_places_before_fallback}")
    print(f"  • max_total_places: {extractor.max_total_places}")
    print(f"  • api_delay: {extractor.request_delay} seconds")
    print("  • Use case: Balanced approach for most scenarios")
    
    return extractor

def show_parameter_guidelines():
    """Show guidelines for choosing parameters"""
    print("\n📋 Parameter Guidelines")
    print("=" * 50)
    
    print("\n🎯 max_results_per_type:")
    print("  • 25-35: Conservative, rural areas")
    print("  • 50-60: Default, most scenarios")
    print("  • 75-100: Comprehensive, urban areas")
    
    print("\n🎯 min_places_before_fallback:")
    print("  • 5-8: Rural areas with few businesses")
    print("  • 10-12: Default, most scenarios")
    print("  • 15-20: Urban areas with many businesses")
    
    print("\n🎯 max_total_places:")
    print("  • 100-150: Conservative, limited processing")
    print("  • 200-250: Default, most scenarios")
    print("  • 300-500: Comprehensive, high processing")
    
    print("\n🎯 api_delay:")
    print("  • 0.3-0.5: Fast, good API quota")
    print("  • 0.5-0.7: Default, balanced")
    print("  • 1.0-2.0: Conservative, rate-limited environments")

def main():
    """Main function demonstrating all configurations"""
    print("🚀 RMT Review Extractor - Configuration Examples")
    print("Demonstrating the new configurable parameters")
    print("=" * 60)
    
    # Check for API key
    if os.getenv('GOOGLE_PLACES_API_KEY') is None:
        print("⚠️  Note: Set GOOGLE_PLACES_API_KEY environment variable to test with real API")
        print("   export GOOGLE_PLACES_API_KEY='your_api_key_here'")
    
    # Show all examples
    example_basic_usage()
    example_high_coverage_usage()
    example_conservative_usage()
    example_custom_usage()
    
    # Show guidelines
    show_parameter_guidelines()
    
    print("\n" + "=" * 60)
    print("✅ Examples completed!")
    print("\n💡 To test with real data, run:")
    print("   python test_improved_search.py")

if __name__ == "__main__":
    main() 