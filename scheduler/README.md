# RMT Availability Checker

A sophisticated web application that aggregates and displays real-time availability for Registered Massage Therapists (RMTs) across multiple Jane App booking sites. This tool streamlines the process of finding available massage therapy appointments by automatically scraping clinic websites and presenting consolidated availability data.

## 🚀 Features

### Core Functionality
- **Multi-Clinic Aggregation**: Simultaneously checks availability across multiple massage therapy clinics
- **Real-time Data Extraction**: Advanced web scraping engine that extracts current RMT information and availability
- **Automated Clinic Discovery**: Dynamic clinic addition system with automatic ID generation
- **Intelligent Caching**: 30-minute caching system to optimize performance and reduce server load
- **RESTful API**: Comprehensive API endpoints for external integrations

### User Experience
- **Interactive Web Interface**: Clean, responsive design that works on desktop and mobile devices
- **Appointment Duration Filtering**: Filter available slots by 30, 45, 60, 75, and 90-minute sessions
- **Pricing Information**: Displays treatment prices for each available time slot
- **Real-time Availability**: Shows current availability with detailed booking information
- **Visual Availability Grid**: Intuitive layout showing therapist cards with available time slots

### Advanced Features
- **Dual Extraction Engines**: Two complementary data extraction systems for maximum reliability
- **Automatic Clinic Addition**: Add new Jane App clinics without manual configuration
- **Treatment Data Analysis**: Detailed extraction of treatment types, staff members, and disciplines
- **Error Handling & Resilience**: Graceful degradation when clinics are unavailable
- **Performance Monitoring**: Built-in logging and monitoring for system health

## 🏥 Currently Supported Clinics

The application dynamically supports Jane App clinic sites including:

1. **Nature's Gifts and Organic Spa** (`naturesgiftsandorganicspa.janeapp.com`)
2. **Stouffville Family Massage & Wellness** (`stouffvillefamilymassageandwellness.janeapp.com`)
3. **Top Care Wellness** (`topcarewellness.janeapp.com`)

*New clinics can be added dynamically through the web interface or API.*

## 📦 Installation

### Prerequisites
- Node.js (v14+ recommended)
- npm or yarn package manager

### Setup Steps

1. **Clone or download the project**
   ```bash
   git clone [repository-url]
   cd rmt-availability-checker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration** (Optional)
   ```bash
   cp .env.example .env
   # Edit .env file with your preferred settings
   ```

4. **Start the application**

   **Production mode:**
   ```bash
   npm start
   ```
   
   **Development mode** (with auto-restart):
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`
   - The web interface will load automatically

## 🖥️ Usage Guide

### Web Interface

1. **View All RMTs**
   - Click "Load All RMTs" to see available massage therapists across all clinics
   - Browse therapist profiles with clinic information and specialties

2. **Search for Availability**
   - Select your desired start and end dates using the date pickers
   - Click "Search Availability" to fetch real-time appointment slots
   - View results organized by therapist and date

3. **Filter Results**
   - Use duration filters to show only specific appointment lengths
   - Click on available time slots to see detailed booking information

4. **Add New Clinics**
   - Use the "Add New Clinic" button in the web interface
   - Enter clinic name and Jane App URL
   - System automatically generates clinic ID and validates the site

### API Integration

The application provides a comprehensive REST API for external integrations:

#### Core Endpoints

**Get All Clinics**
```http
GET /api/clinics
```
Returns list of all supported clinics with basic statistics.

**Get All RMTs**
```http
GET /api/rmts
```
Returns comprehensive list of all RMTs across all clinics with their details.

**Get Clinic Details**
```http
GET /api/clinic/{clinic-id}
```
Returns detailed information about a specific clinic including treatments and staff.

**Add New Clinic**
```http
POST /api/clinics
Content-Type: application/json

{
  "name": "Clinic Name",
  "url": "https://clinic.janeapp.com",
  "id": "optional-custom-id"
}
```

#### Availability Endpoints

**Get All RMT Availability**
```http
GET /api/availability/all?startDate=2025-07-23&endDate=2025-07-30
```
Returns availability for all RMTs within the specified date range.

**Get Specific RMT Availability**
```http
GET /api/availability?clinicId=clinic-id&rmtId=5&startDate=2025-07-23&endDate=2025-07-30
```
Returns availability for a specific RMT at a specific clinic.

#### Response Format Example

```json
{
  "rmtId": 5,
  "rmtName": "Sarah Johnson, RMT",
  "clinic": "Nature's Gifts and Organic Spa",
  "availability": [
    {
      "date": "2025-07-23",
      "slots": [
        {
          "startAt": "09:00",
          "duration": 60,
          "price": 115,
          "treatmentId": 636,
          "treatmentName": "RMT Massage 60 min"
        }
      ]
    }
  ],
  "dataSource": "real"
}
```

## 🏗️ System Architecture

### Core Components

**1. Main Server (`server.js`)**
- Express.js application server
- API endpoint routing and middleware
- Caching layer management
- Clinic configuration loading

**2. Data Extraction Layer**
- **API Extractor (`api-extractor.js`)**: Advanced scraper for real availability data
- **Automated Extractor (`automated-extractor.js`)**: HTML parser for clinic metadata

**3. Frontend Interface (`public/index.html`)**
- Single-page application with vanilla JavaScript
- Responsive CSS design
- Interactive availability visualization

**4. Configuration System**
- **Clinic Config (`clinic-config.json`)**: Dynamic clinic management
- **Environment Config (`.env`)**: Runtime configuration

### Data Flow Architecture

```
[Jane App Clinic Sites] 
         ↓
[Web Scraping Layer]
         ↓
[Data Processing & Caching]
         ↓
[REST API Layer]
         ↓
[Frontend Interface] ← [External API Clients]
```

### Technology Stack

**Backend:**
- **Node.js**: Runtime environment
- **Express.js**: Web application framework
- **Axios**: HTTP client for web scraping
- **Cheerio**: Server-side jQuery for HTML parsing
- **CORS**: Cross-origin resource sharing

**Frontend:**
- **Vanilla JavaScript**: No framework dependencies
- **CSS Grid/Flexbox**: Responsive layout system
- **Fetch API**: HTTP client for API communication

**Development:**
- **Nodemon**: Development auto-restart
- **dotenv**: Environment variable management

## ⚙️ Configuration

### Environment Variables (`.env`)

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Cache Configuration (milliseconds)
CACHE_DURATION=1800000

# Request Configuration
REQUEST_TIMEOUT=10000
USER_AGENT="Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0"

# Rate Limiting
RATE_LIMIT=30

# Debug Mode
DEBUG=false
```

### Clinic Configuration (`clinic-config.json`)

```json
{
  "clinics": [
    {
      "id": "unique-clinic-id",
      "name": "Clinic Display Name",
      "url": "https://clinic.janeapp.com",
      "enabled": true
    }
  ],
  "settings": {
    "requestTimeout": 10000,
    "userAgent": "Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0",
    "maxRetries": 3,
    "retryDelay": 2000
  }
}
```

## 🔧 Advanced Features

### Automatic Clinic ID Generation

The system automatically generates unique clinic IDs using multiple strategies:

1. **URL-based ID**: Extracts subdomain from Jane App URL (`topcare.janeapp.com` → `topcare`)
2. **Name-based ID**: Converts clinic name to URL-safe format
3. **Conflict Resolution**: Automatically appends numbers for duplicate IDs

### Intelligent Data Extraction

**Dual Extraction Approach:**
- **Primary**: Real-time API extraction from Jane App's internal APIs
- **Fallback**: HTML parsing using routerOptions data

**Data Validation:**
- Treatment ID validation and mapping
- Staff member categorization (RMT vs other)
- Service classification and pricing extraction

### Performance Optimization

**Caching Strategy:**
- 30-minute memory cache for clinic data
- Automatic cache invalidation and refresh
- Per-clinic caching with independent expiration

**Request Management:**
- 10-second timeout for external requests
- Respectful rate limiting between clinic requests
- Graceful error handling and fallbacks

## 🚨 Known Limitations

### Current Constraints

1. **Mock Availability Data**: Some clinics return simulated availability when real data is unavailable
2. **Read-Only System**: Cannot actually book appointments through the interface
3. **Rate Limiting**: May encounter restrictions from clinic websites during high usage
4. **Site Dependencies**: Functionality may break if Jane App modifies their site structure

### Data Accuracy

- **Real-time vs Cached**: Data freshness depends on cache expiration (30 minutes)
- **Availability Accuracy**: Real availability data when possible, otherwise realistic mock data
- **Pricing Information**: Based on extracted data, may not reflect current pricing

## 🔮 Future Roadmap

### Planned Enhancements

**Integration Features:**
- Real-time booking integration with Jane App APIs
- Email/SMS notifications for new availability
- Calendar integration for appointment scheduling

**User Experience:**
- Favorite RMTs and clinics management
- Advanced filtering (location, specialties, insurance coverage)
- Mobile application development
- User accounts and personalized preferences

**Technical Improvements:**
- Enhanced real-time availability tracking
- Better error handling and retry mechanisms
- Performance monitoring dashboard
- Automated testing suite

**Analytics & Insights:**
- Availability trend analysis
- Popular time slot identification
- Clinic performance metrics
- User behavior analytics

## ⚖️ Legal & Ethical Considerations

### Responsible Web Scraping

This application follows ethical web scraping practices:

- **Respectful Request Rates**: Implements delays between requests to avoid server overload
- **robots.txt Compliance**: Checks and respects robots.txt directives
- **Terms of Service**: Users should review clinic terms of service
- **Data Usage**: For personal and educational use only

### Compliance Recommendations

1. **Permission**: Consider reaching out to clinic owners for explicit permission
2. **Rate Limiting**: Respect server resources and implement appropriate delays
3. **Data Privacy**: Do not store or share personal appointment information
4. **Terms Compliance**: Ensure usage complies with Jane App's terms of service

## 🐛 Troubleshooting

### Common Issues

**"No data available" for a clinic:**
- Check if the clinic URL is correct and accessible
- Verify the clinic uses Jane App booking system
- Check server logs for specific error messages

**Slow loading times:**
- Increase cache duration in environment variables
- Check network connectivity to clinic websites
- Monitor server resources (CPU, memory)

**Inconsistent availability data:**
- Some clinics may have rate limiting or anti-scraping measures
- Real availability data may not be accessible for all clinics
- Check the `dataSource` field in API responses

### Debug Mode

Enable debug logging:
```bash
DEBUG=true npm start
```

This will provide detailed console output for troubleshooting data extraction issues.

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Make changes and test thoroughly
5. Submit pull request with detailed description

### Adding New Clinics

Clinics can be added through:
- Web interface "Add New Clinic" feature
- Direct API calls to `/api/clinics`
- Manual editing of `clinic-config.json`

## 📞 Support

For technical issues, feature requests, or questions:

1. **Check Logs**: Review console output and error logs for debugging information
2. **Configuration**: Verify clinic URLs and configuration settings
3. **Documentation**: Refer to this README and code comments
4. **Issue Tracking**: Create detailed issue reports with error messages and steps to reproduce

## 📄 License

This project is for educational and personal use. Please ensure compliance with applicable terms of service and local regulations when using web scraping functionality.

---

**Version**: 1.0.0  
**Last Updated**: July 2025  
**Node.js Compatibility**: v14+