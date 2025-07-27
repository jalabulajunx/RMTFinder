# RMT Availability Checker - Technical Specification

**Document Version**: 1.0  
**System Version**: 1.0.0  
**Date**: July 2025  
**Author**: System Architect

## 1. Executive Summary

The RMT Availability Checker is a Node.js-based web application designed to aggregate and display real-time availability for Registered Massage Therapists across multiple Jane App booking platforms. The system employs advanced web scraping techniques, intelligent caching, and a RESTful API architecture to provide users with consolidated appointment availability data.

### 1.1 Business Objectives

- **Primary**: Simplify the process of finding available RMT appointments across multiple clinics
- **Secondary**: Provide a unified interface for appointment discovery without manual clinic-by-clinic searching
- **Tertiary**: Enable third-party integrations through comprehensive API endpoints

### 1.2 Key Success Metrics

- **Performance**: Sub-3-second response times for availability queries
- **Reliability**: 99%+ uptime for supported clinic data extraction
- **Scalability**: Support for 50+ concurrent clinic integrations
- **User Experience**: Mobile-responsive interface with intuitive navigation

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                             │
├─────────────────────────────────────────────────────────────┤
│  Web Browser  │  Mobile App  │  Third-party API Clients    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Application Layer                          │
├─────────────────────────────────────────────────────────────┤
│           Express.js Server (server.js)                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐    │
│  │ API Router   │ │ Middleware   │ │ Static Server    │    │
│  │              │ │ (CORS, JSON) │ │ (Frontend)       │    │
│  └──────────────┘ └──────────────┘ └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐ ┌─────────────────────────────────┐│
│  │  API Extractor      │ │  Automated Extractor           ││
│  │  (api-extractor.js) │ │  (automated-extractor.js)      ││
│  │                     │ │                                 ││
│  │ • Real-time API     │ │ • HTML Parsing                  ││
│  │ • Availability Data │ │ • Clinic Metadata               ││
│  │ • Treatment Mapping │ │ • Treatment Extraction          ││
│  └─────────────────────┘ └─────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐    │
│  │ Memory Cache │ │ Config Files │ │ External APIs    │    │
│  │ (Map-based)  │ │ (JSON)       │ │ (Jane App Sites) │    │
│  └──────────────┘ └──────────────┘ └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Component Breakdown

#### 2.2.1 Application Server (server.js)
- **Framework**: Express.js v4.18.2
- **Responsibilities**: HTTP routing, middleware management, API endpoint orchestration
- **Port Configuration**: Configurable via PORT environment variable (default: 3000)
- **Middleware Stack**: CORS, JSON parsing, static file serving

#### 2.2.2 Data Extraction Layer

**API Extractor (api-extractor.js)**
- **Purpose**: Primary data extraction engine for real-time availability
- **Technology**: Axios + Cheerio for HTTP requests and HTML parsing
- **Capabilities**: 
  - Jane App API endpoint discovery
  - Real availability data extraction
  - Treatment ID mapping and validation
  - Browser session simulation

**Automated Extractor (automated-extractor.js)**
- **Purpose**: Metadata extraction and clinic configuration management
- **Technology**: Regex-based HTML parsing with JSON extraction
- **Capabilities**:
  - RouterOptions data extraction
  - Treatment, staff, and discipline parsing
  - Automatic clinic ID generation
  - Bulk clinic processing

#### 2.2.3 Frontend Interface (public/index.html)
- **Architecture**: Single-page application (SPA)
- **Technology**: Vanilla JavaScript, CSS Grid/Flexbox
- **Features**: Responsive design, real-time data updates, interactive filtering

### 2.3 Data Flow Architecture

```
External Request → Express Router → Business Logic → Cache Check → 
External API Call → Data Processing → Response Formatting → Client Response
```

## 3. API Specification

### 3.1 RESTful Endpoints

#### 3.1.1 Clinic Management

**GET /api/clinics**
- **Description**: Retrieve all configured clinics with metadata
- **Parameters**: None
- **Response Format**:
```json
[
  {
    "id": "string",
    "name": "string", 
    "url": "string",
    "rmtCount": "number",
    "services": "number"
  }
]
```
- **Status Codes**: 200 (Success), 500 (Server Error)

**POST /api/clinics**
- **Description**: Add new clinic to system
- **Request Body**:
```json
{
  "name": "string (required)",
  "url": "string (required, must contain .janeapp.com)",
  "id": "string (optional, auto-generated if omitted)"
}
```
- **Response Format**:
```json
{
  "success": "boolean",
  "clinic": "object",
  "idInfo": {
    "provided": "boolean",
    "generated": "string",
    "final": "string"
  },
  "testResults": {
    "treatmentCount": "number",
    "disciplineCount": "number",
    "sampleTreatments": "array"
  }
}
```

**GET /api/clinic/{id}**
- **Description**: Retrieve detailed clinic information
- **Path Parameters**: `id` (string) - Clinic identifier
- **Response Format**: Complete clinic data object with treatments and staff

#### 3.1.2 RMT Data

**GET /api/rmts**
- **Description**: Retrieve all RMTs across all clinics
- **Parameters**: None
- **Response Format**:
```json
[
  {
    "id": "number",
    "name": "string",
    "clinic": "string",
    "clinicId": "string",
    "clinicUrl": "string",
    "services": "array"
  }
]
```

#### 3.1.3 Availability Data

**GET /api/availability**
- **Description**: Get availability for specific RMT
- **Query Parameters**:
  - `clinicId` (required): Clinic identifier
  - `rmtId` (required): RMT identifier
  - `startDate` (required): YYYY-MM-DD format
  - `endDate` (required): YYYY-MM-DD format
- **Response Format**:
```json
{
  "rmtId": "number",
  "rmtName": "string",
  "clinic": "string",
  "availability": [
    {
      "date": "YYYY-MM-DD",
      "slots": [
        {
          "startAt": "HH:MM",
          "duration": "number (minutes)",
          "price": "number",
          "treatmentId": "number",
          "treatmentName": "string"
        }
      ]
    }
  ],
  "dataSource": "string (real|mock|none)"
}
```

**GET /api/availability/all**
- **Description**: Get availability for all RMTs
- **Query Parameters**: Same as single RMT endpoint
- **Response Format**: Array of availability objects

### 3.2 Error Handling

#### 3.2.1 HTTP Status Codes
- **200**: Successful request
- **400**: Bad request (invalid parameters)
- **404**: Resource not found
- **500**: Internal server error

#### 3.2.2 Error Response Format
```json
{
  "error": "string (error message)",
  "details": "string (optional additional info)"
}
```

## 4. Data Models

### 4.1 Core Data Structures

#### 4.1.1 Clinic Model
```typescript
interface Clinic {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  url: string;                   // Jane App URL
  enabled: boolean;              // Active status
  addedAt?: string;              // ISO timestamp
  idGenerated?: boolean;         // Auto-generated ID flag
}
```

#### 4.1.2 RMT Model
```typescript
interface RMT {
  id: number;                    // Clinic-specific ID
  name: string;                  // Full name with credentials
  clinic: string;                // Clinic display name
  clinicId: string;              // Clinic identifier
  clinicUrl: string;             // Jane App URL
  services: Treatment[];         // Available treatments
}
```

#### 4.1.3 Treatment Model
```typescript
interface Treatment {
  id: number;                    // Treatment identifier
  name: string;                  // Treatment name
  treatment_duration: number;    // Duration in seconds
  scheduled_duration: number;    // Scheduled time in seconds
  description?: string;          // Treatment description
  price: number | null;          // Price in local currency
  staff_member_ids: number[];    // Associated RMT IDs
  discipline_id: number;         // Treatment category
}
```

#### 4.1.4 Availability Model
```typescript
interface AvailabilitySlot {
  startAt: string;               // HH:MM format
  duration: number;              // Minutes
  price: number;                 // Local currency
  treatmentId: number;           // Treatment reference
  treatmentName: string;         // Display name
}

interface DayAvailability {
  date: string;                  // YYYY-MM-DD
  slots: AvailabilitySlot[];     // Available time slots
}

interface RMTAvailability {
  rmtId: number;
  rmtName: string;
  clinic: string;
  availability: DayAvailability[];
  dataSource: 'real' | 'mock' | 'none';
}
```

### 4.2 Configuration Models

#### 4.2.1 System Configuration
```typescript
interface SystemConfig {
  clinics: Clinic[];
  settings: {
    requestTimeout: number;      // Milliseconds
    userAgent: string;           // HTTP User-Agent
    maxRetries: number;          // Retry attempts
    retryDelay: number;          // Delay between retries (ms)
  };
}
```

#### 4.2.2 Cache Structure
```typescript
interface CacheEntry {
  data: any;                     // Cached data
  timestamp: number;             // Cache creation time
}

interface CacheManager {
  cache: Map<string, CacheEntry>;
  duration: number;              // Cache TTL in milliseconds
}
```

## 5. External Integrations

### 5.1 Jane App Platform Integration

#### 5.1.1 Target Endpoints
- **Base URL Pattern**: `https://{subdomain}.janeapp.com`
- **Data Sources**: 
  - RouterOptions JavaScript object in HTML
  - Internal API endpoints (when discoverable)
  - Public booking page data

#### 5.1.2 Data Extraction Methods

**Method 1: RouterOptions Parsing**
- **Location**: Embedded JavaScript in clinic home page
- **Pattern**: `const routerOptions = {...}`
- **Data**: Treatments, staff members, disciplines
- **Reliability**: High (consistent structure)

**Method 2: API Endpoint Discovery**
- **Patterns**: `/api/v*/`, `/availability*`, `/staff_member/*`
- **Method**: Regex extraction from HTML source
- **Data**: Real-time availability when accessible
- **Reliability**: Medium (varies by clinic configuration)

#### 5.1.3 Authentication & Rate Limiting
- **Authentication**: Public endpoints, no authentication required
- **Rate Limiting**: Self-imposed 2-second delays between requests
- **Headers**: Browser-like User-Agent to avoid detection
- **Respectful Practices**: Implements request spacing and timeout handling

### 5.2 HTTP Client Configuration

```typescript
interface RequestConfig {
  timeout: 10000;                // 10-second timeout
  headers: {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0';
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
    'Accept-Language': 'en-US,en;q=0.5';
    'Accept-Encoding': 'gzip, deflate, br';
    'Connection': 'keep-alive';
    'Upgrade-Insecure-Requests': '1';
  };
}
```

## 6. Performance Specifications

### 6.1 Caching Strategy

#### 6.1.1 Memory Cache Implementation
- **Storage**: JavaScript Map object
- **TTL**: 30 minutes (1,800,000 milliseconds)
- **Invalidation**: Time-based automatic expiration
- **Scope**: Per-clinic caching with independent expiration

#### 6.1.2 Cache Performance Metrics
- **Hit Rate Target**: >80% for repeated requests within cache window
- **Memory Usage**: Estimated 1-2MB per 10 clinics cached
- **Cleanup**: Automatic cleanup on cache miss

### 6.2 Response Time Requirements

| Operation | Target Response Time | Maximum Acceptable |
|-----------|---------------------|-------------------|
| Cached Clinic Data | <100ms | 500ms |
| Fresh Clinic Data | <3000ms | 10000ms |
| Availability Query | <2000ms | 8000ms |
| Bulk RMT Query | <5000ms | 15000ms |
| Static Assets | <50ms | 200ms |

### 6.3 Scalability Targets

- **Concurrent Users**: 50+ simultaneous users
- **Clinic Support**: 100+ clinic integrations
- **Request Volume**: 1000+ requests per hour
- **Data Processing**: 10,000+ availability slots per query

## 7. Security Considerations

### 7.1 Data Privacy & Protection

#### 7.1.1 Data Handling Principles
- **Minimal Collection**: Only extract publicly available appointment data
- **No Personal Data**: No collection of patient or personal information
- **Transient Storage**: All data stored temporarily in memory cache only
- **No Persistence**: No permanent database storage of clinic data

#### 7.1.2 Web Scraping Ethics
- **Respectful Practices**: Implements request rate limiting
- **robots.txt Compliance**: Checks and respects robots.txt when available
- **Terms of Service**: Users responsible for compliance with clinic terms
- **Public Data Only**: Only accesses publicly available booking information

### 7.2 Input Validation & Sanitization

#### 7.2.1 API Input Validation
- **URL Validation**: Ensures Jane App domain requirements
- **Date Validation**: Validates date formats and ranges
- **Parameter Sanitization**: Cleanses all user inputs
- **SQL Injection Prevention**: N/A (no database layer)

#### 7.2.2 Output Sanitization
- **HTML Escaping**: All user-facing content properly escaped
- **JSON Validation**: Ensures valid JSON responses
- **Error Message Sanitization**: No sensitive information in error responses

### 7.3 CORS & Cross-Origin Security

```typescript
interface CORSConfig {
  origin: true;                  // Allow all origins
  credentials: false;            // No credential sharing
  methods: ['GET', 'POST'];      // Supported HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'];
}
```

## 8. Deployment Architecture

### 8.1 System Requirements

#### 8.1.1 Minimum Hardware Requirements
- **CPU**: 1 vCPU (2.0+ GHz)
- **Memory**: 512MB RAM
- **Storage**: 100MB available disk space
- **Network**: Stable internet connection with >1Mbps bandwidth

#### 8.1.2 Recommended Hardware Requirements
- **CPU**: 2+ vCPU (2.4+ GHz)
- **Memory**: 2GB+ RAM
- **Storage**: 1GB+ available disk space
- **Network**: >10Mbps bandwidth for optimal performance

### 8.2 Platform Support

#### 8.2.1 Operating Systems
- **Linux**: Ubuntu 18.04+, CentOS 7+, RHEL 7+
- **macOS**: 10.15+
- **Windows**: Windows 10+, Windows Server 2019+

#### 8.2.2 Node.js Requirements
- **Minimum Version**: Node.js 14.x
- **Recommended Version**: Node.js 16.x or 18.x LTS
- **Package Manager**: npm 6+ or yarn 1.22+

### 8.3 Environment Configuration

#### 8.3.1 Production Environment Variables

```bash
# Core Configuration
NODE_ENV=production
PORT=3000

# Performance Tuning
CACHE_DURATION=1800000          # 30 minutes
REQUEST_TIMEOUT=10000           # 10 seconds
RATE_LIMIT=30                   # Requests per minute

# Security
USER_AGENT="Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0"

# Monitoring
DEBUG=false
LOG_LEVEL=info
```

#### 8.3.2 Development Environment Variables

```bash
# Core Configuration
NODE_ENV=development
PORT=3000

# Development Features
DEBUG=true
LOG_LEVEL=debug

# Fast Iteration
CACHE_DURATION=300000           # 5 minutes for development
REQUEST_TIMEOUT=15000           # Extended timeout for debugging
```

## 9. Testing Strategy

### 9.1 Test Coverage Requirements

#### 9.1.1 Unit Testing Targets
- **API Endpoints**: 100% endpoint coverage
- **Data Extractors**: 90%+ function coverage
- **Utility Functions**: 95%+ coverage
- **Error Handling**: 100% error path coverage

#### 9.1.2 Integration Testing Scope
- **End-to-End API Flows**: Complete request/response cycles
- **External Service Integration**: Jane App site connectivity
- **Cache Behavior**: Cache hit/miss scenarios
- **Error Recovery**: Graceful degradation testing

### 9.2 Test Implementation Files

```
test/
├── unit/
│   ├── api-extractor.test.js
│   ├── automated-extractor.test.js
│   └── server.test.js
├── integration/
│   ├── clinic-integration.test.js
│   └── availability-flow.test.js
└── e2e/
    └── user-journey.test.js
```

### 9.3 Performance Testing

#### 9.3.1 Load Testing Scenarios
- **Normal Load**: 10 concurrent users, 5-minute duration
- **Peak Load**: 50 concurrent users, 2-minute duration  
- **Stress Test**: 100 concurrent users until failure
- **Endurance Test**: 5 concurrent users, 30-minute duration

## 10. Monitoring & Observability

### 10.1 Application Metrics

#### 10.1.1 Key Performance Indicators
- **Response Time**: Average, 95th percentile, 99th percentile
- **Error Rate**: Percentage of failed requests
- **Cache Hit Rate**: Percentage of requests served from cache
- **External API Success Rate**: Jane App site extraction success

#### 10.1.2 Business Metrics
- **Clinic Coverage**: Number of successfully monitored clinics
- **RMT Availability**: Total available appointment slots
- **User Engagement**: API usage patterns and frequency

### 10.2 Logging Strategy

#### 10.2.1 Log Levels
- **ERROR**: System errors, extraction failures
- **WARN**: Performance degradation, rate limiting
- **INFO**: Normal operations, cache refresh events
- **DEBUG**: Detailed extraction processes, data parsing

#### 10.2.2 Log Format
```typescript
interface LogEntry {
  timestamp: string;             // ISO 8601 format
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  component: string;             // Source component
  message: string;               // Log message
  metadata?: object;             // Additional context
}
```

## 11. Maintenance & Operations

### 11.1 Routine Maintenance Tasks

#### 11.1.1 Daily Operations
- **Health Checks**: Verify all clinic endpoints are accessible
- **Log Review**: Check for errors and performance issues
- **Cache Monitoring**: Ensure cache hit rates meet targets

#### 11.1.2 Weekly Operations
- **Performance Analysis**: Review response time trends
- **Clinic Validation**: Test extraction for all configured clinics
- **Dependency Updates**: Check for security updates

#### 11.1.3 Monthly Operations
- **Capacity Planning**: Analyze usage growth trends
- **Security Review**: Update dependencies and security practices
- **Documentation Updates**: Keep technical documentation current

### 11.2 Disaster Recovery

#### 11.2.1 Data Backup Strategy
- **Configuration Files**: Daily backup of clinic-config.json
- **Application Code**: Version control with Git
- **No Database**: No persistent data requiring backup

#### 11.2.2 Recovery Procedures
- **Service Restart**: Automated process restart on failure
- **Configuration Recovery**: Restore from backup clinic configuration
- **Rollback Strategy**: Git-based code rollback capability

## 12. Future Architecture Considerations

### 12.1 Scalability Enhancements

#### 12.1.1 Database Integration
- **Purpose**: Persistent storage for historical availability data
- **Options**: PostgreSQL, MongoDB, or Redis for caching
- **Benefits**: Historical analysis, improved performance, data persistence

#### 12.1.2 Microservices Architecture
- **Clinic Service**: Dedicated clinic management service
- **Extraction Service**: Isolated data extraction workers
- **API Gateway**: Centralized routing and rate limiting
- **Benefits**: Independent scaling, fault isolation, technology diversity

### 12.2 Advanced Features

#### 12.2.1 Real-time Notifications
- **WebSocket Integration**: Live availability updates
- **Push Notifications**: Mobile app notification support
- **Email Alerts**: Availability notification system

#### 12.2.2 Machine Learning Integration
- **Availability Prediction**: Predict future appointment availability
- **Demand Forecasting**: Analyze booking patterns
- **Optimization**: Suggest optimal booking times

---

**Document Control**  
**Version**: 1.0  
**Approval**: System Architect  
**Next Review**: August 2025  
**Classification**: Internal Technical Documentation