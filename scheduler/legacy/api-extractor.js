const axios = require('axios');
const cheerio = require('cheerio');

class JaneAppExtractor {
  constructor() {
    this.baseHeaders = {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };
  }

  async extractClinicData(clinicUrl) {
    try {
      console.log(`Extracting data from: ${clinicUrl}`);
      
      const response = await axios.get(clinicUrl, {
        headers: this.baseHeaders,
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const clinicData = {
        name: this.extractClinicName($),
        rmts: this.extractRMTs($, clinicUrl),
        services: this.extractServices($),
        guid: this.extractGuid(response.data)
      };

      return clinicData;
    } catch (error) {
      console.error(`Error extracting from ${clinicUrl}:`, error.message);
      return null;
    }
  }

  extractClinicName($) {
    // Try multiple selectors for clinic name
    const selectors = [
      'title',
      '.company_header_jane_id img',
      'h1',
      '.navbar-brand'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        if (selector === 'title') {
          const title = element.text();
          const match = title.match(/Book Online\s*\|\s*(.+)/);
          if (match) return match[1].trim();
        } else if (selector === '.company_header_jane_id img') {
          return element.attr('alt') || '';
        } else {
          return element.text().trim();
        }
      }
    }
    return 'Unknown Clinic';
  }

  extractRMTs($, baseUrl) {
    const rmts = [];
    const seenRMTs = new Set(); // Track unique RMTs by ID or name
    
    // Extract from staff member thumbnails
    $('.staff_member_thumb').each((index, element) => {
      const $element = $(element);
      const link = $element.find('a').attr('href');
      const img = $element.find('img');
      const imgAlt = img.attr('alt') || '';
      const imgSrc = img.attr('src') || '';
      
      // Get name from overlay or paragraph
      let name = $element.find('.overlay').text().trim() || 
                 $element.find('p').text().trim() || '';
      
      // Extract from alt text if name not found
      if (!name && imgAlt) {
        const altMatch = imgAlt.match(/Book an Appointment with (.+?) for/);
        if (altMatch) name = altMatch[1];
      }

      // Check if this is an RMT
      if (name && (name.includes('RMT') || imgAlt.includes('RMT') || imgAlt.includes('Massage'))) {
        const staffId = link ? link.match(/staff_member\/(\d+)/)?.[1] : null;
        const cleanName = name.replace(/\s*-\s*RMT.*$/, '').trim();
        
        // Create unique identifier (prefer staffId, fallback to name)
        const uniqueId = staffId || cleanName;
        
        // Only add if we haven't seen this RMT before
        if (!seenRMTs.has(uniqueId)) {
          seenRMTs.add(uniqueId);
          
          rmts.push({
            id: staffId,
            name: cleanName,
            title: this.extractTitle(name, imgAlt),
            photo: imgSrc,
            bookingLink: link ? `${baseUrl}${link}` : null,
            specialties: this.extractSpecialties(name, imgAlt)
          });
          
          console.log(`Added RMT: ${cleanName} (ID: ${staffId}) from ${baseUrl}`);
        } else {
          console.log(`Skipped duplicate RMT: ${cleanName} (ID: ${staffId}) from ${baseUrl}`);
        }
      }
    });

    console.log(`Total unique RMTs extracted from ${baseUrl}: ${rmts.length}`);
    return rmts;
  }

  extractTitle(name, imgAlt) {
    if (name.includes('RMT') || imgAlt.includes('RMT')) {
      return 'Registered Massage Therapist (RMT)';
    }
    if (name.includes('Massage') || imgAlt.includes('Massage')) {
      return 'Massage Therapist';
    }
    return 'Therapist';
  }

  extractSpecialties(name, imgAlt) {
    const specialties = [];
    const text = `${name} ${imgAlt}`.toLowerCase();
    
    const specialtyKeywords = [
      'deep tissue', 'swedish', 'relaxation', 'therapeutic', 
      'sports massage', 'prenatal', 'hot stone', 'lymphatic',
      'myofascial', 'trigger point', 'craniosacral', 'reflexology'
    ];

    specialtyKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        specialties.push(keyword);
      }
    });

    return specialties;
  }

  extractServices($) {
    const services = [];
    
    // Extract from main navigation
    $('.list-group-item').each((index, element) => {
      const $element = $(element);
      const text = $element.text().trim();
      const href = $element.attr('href');
      
      if (text && href && href.startsWith('#/') && 
          (text.toLowerCase().includes('massage') || 
           text.toLowerCase().includes('rmt') ||
           text.toLowerCase().includes('therapy'))) {
        
        services.push({
          name: text,
          slug: href.replace('#/', ''),
          category: this.categorizeService(text),
          treatments: []
        });
      }
    });

    // Extract detailed treatments with durations and prices
    $('section[id]').each((index, section) => {
      const $section = $(section);
      const sectionId = $section.attr('id');
      const serviceName = $section.find('.discipline-name').text().trim();
      
      if (serviceName && (serviceName.toLowerCase().includes('massage') || 
                         serviceName.toLowerCase().includes('therapy'))) {
        
        const treatments = [];
        
        // Find treatment list within this section
        $section.find('.nav-pills li').each((treatmentIndex, treatmentElement) => {
          const $treatment = $(treatmentElement);
          const $link = $treatment.find('a');
          const $small = $treatment.find('small');
          
          const treatmentName = $link.find('strong').text().trim();
          const href = $link.attr('href');
          
          if (treatmentName && $small.length) {
            const smallText = $small.text().trim();
            const duration = this.extractDuration(smallText);
            const price = this.extractPrice(smallText);
            const providers = this.extractProviders(smallText);
            
            treatments.push({
              id: href ? href.match(/treatment\/(\d+)/)?.[1] : null,
              name: treatmentName,
              duration: duration,
              price: price,
              providers: providers,
              href: href
            });
          }
        });
        
        // Find or create service entry and add treatments
        let service = services.find(s => s.slug === sectionId);
        if (!service) {
          service = {
            name: serviceName,
            slug: sectionId,
            category: this.categorizeService(serviceName),
            treatments: []
          };
          services.push(service);
        }
        service.treatments = treatments;
      }
    });

    return services;
  }

  extractDuration(text) {
    // Extract duration like "30 minutes", "45 minutes", etc.
    const durationMatch = text.match(/(\d+)\s*minutes?/i);
    return durationMatch ? parseInt(durationMatch[1]) : null;
  }

  extractPrice(text) {
    // Extract price like "$65.00", "$105.00", etc.
    const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
    return priceMatch ? parseFloat(priceMatch[1]) : null;
  }

  extractProviders(text) {
    // Extract provider count like "5 Massage Therapists" or specific names
    const providerCountMatch = text.match(/(\d+)\s+(?:Massage\s+)?Therapists?/i);
    if (providerCountMatch) {
      return {
        count: parseInt(providerCountMatch[1]),
        type: 'count'
      };
    }
    
    // Look for specific provider names
    const providerNameMatch = text.match(/Offered by\s+(.+)$/i);
    if (providerNameMatch) {
      return {
        names: [providerNameMatch[1].trim()],
        type: 'names'
      };
    }
    
    return null;
  }

  categorizeService(serviceName) {
    const name = serviceName.toLowerCase();
    
    if (name.includes('rmt') || name.includes('registered massage')) {
      return 'RMT Services';
    } else if (name.includes('massage')) {
      return 'Massage Therapy';
    } else if (name.includes('facial') || name.includes('aesthetic')) {
      return 'Aesthetics';
    } else if (name.includes('osteo')) {
      return 'Osteopathy';
    } else if (name.includes('reiki') || name.includes('energy')) {
      return 'Energy Work';
    }
    
    return 'Other Services';
  }

  extractGuid(html) {
    // Extract clinic GUID from the HTML
    const guidMatch = html.match(/"guid":"(\d+)"/);
    return guidMatch ? guidMatch[1] : null;
  }

  // Attempt to find API endpoints from the page
  async findAPIEndpoints(clinicUrl) {
    try {
      const response = await axios.get(clinicUrl, {
        headers: this.baseHeaders
      });

      const apiEndpoints = [];
      const html = response.data;

      // Look for common Jane App API patterns
      const patterns = [
        /\/api\/v\d+\/[^"'\s]+/g,
        /\/locations\/[^"'\s]+\/book/g,
        /\/staff_member\/\d+/g,
        /\/availability[^"'\s]*/g
      ];

      patterns.forEach(pattern => {
        const matches = html.match(pattern);
        if (matches) {
          matches.forEach(match => {
            if (!apiEndpoints.includes(match)) {
              apiEndpoints.push(match);
            }
          });
        }
      });

      return apiEndpoints;
    } catch (error) {
      console.error('Error finding API endpoints:', error.message);
      return [];
    }
  }

  // Get real availability data from Jane App API for ALL treatment types
  async getRealAvailability(baseUrl, rmtId, startDate, endDate) {
    console.log(`\n🔍 getRealAvailability called for RMT ${rmtId} at ${baseUrl}`);
    console.log(`📅 Date range: ${startDate} to ${endDate}`);
    
    try {
      // Calculate the number of days and format the start date for the API
      const start = new Date(startDate);
      const end = new Date(endDate);
      const numDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1; // +1 to include end date
      
      // Format start date for Jane App API (YYYY-MM-DD format)
      const formattedStartDate = start.toISOString().split('T')[0];
      
      console.log(`📊 Calculated: numDays=${numDays}, formattedStartDate=${formattedStartDate}`);
      
      // Generate a browser tab ID (similar to what Jane App uses)
      const browserTabId = this.generateBrowserTabId();
      console.log(`🆔 Generated browserTabId: ${browserTabId}`);
      
      // Get treatment IDs dynamically from HAR data for this specific clinic
      const domain = baseUrl.replace('https://', '').replace('http://', '');
      console.log(`🏥 Extracting treatment IDs for domain: ${domain}`);
      
      const harTreatmentData = await this.extractRMTTreatmentIdsFromHAR(domain);
      console.log(`💊 HAR treatment data:`, {
        allTreatmentIds: harTreatmentData.allTreatmentIds,
        rmtTreatments: Object.keys(harTreatmentData.rmtTreatments)
      });
      
      // Use extracted treatment IDs, fallback to common ones if none found
      const treatmentIds = harTreatmentData.allTreatmentIds.length > 0 ? 
        harTreatmentData.allTreatmentIds.slice(0, 10) : // Use first 10 to avoid too many API calls
        [1, 9, 622, 692, 730]; // Fallback to common treatment IDs including Susan's 730
      
      console.log(`🎯 Using treatment IDs: [${treatmentIds.join(', ')}]`);
      console.log(`📞 Will make ${treatmentIds.length} API calls for RMT ${rmtId}`);
      
      const allOpenings = [];
      let rmtInfo = null;
      
      // Fetch availability for each treatment type
      for (const treatmentId of treatmentIds) {
        try {
          const apiUrl = `${baseUrl}/api/v2/openings?location_id=1&staff_member_id=${rmtId}&treatment_id=${treatmentId}&date=${formattedStartDate}&num_days=${numDays}&browser_tab_id=${browserTabId}`;
          
          console.log(`  🌐 API Call ${treatmentIds.indexOf(treatmentId) + 1}/${treatmentIds.length}:`);
          console.log(`     Treatment ${treatmentId}: ${this.getTreatmentName(treatmentId)}`);
          console.log(`     URL: ${apiUrl}`);
          
          const response = await axios.get(apiUrl, {
            headers: {
              'Accept': 'application/json, text/javascript, */*; q=0.01',
              'X-Requested-With': 'XMLHttpRequest',
              'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0',
              'Referer': baseUrl
            },
            timeout: 10000
          });
          
          console.log(`     📊 Response status: ${response.status}`);
          console.log(`     📦 Response data length: ${response.data ? response.data.length : 0}`);
          
          if (response.data && response.data.length > 0) {
            const rmtData = response.data[0];
            console.log(`     👤 RMT Data: id=${rmtData.id}, name="${rmtData.full_name}"`);
            console.log(`     📅 First date: ${rmtData.first_date}`);
            console.log(`     🕐 Openings count: ${rmtData.openings ? rmtData.openings.length : 0}`);
            console.log(`     📋 Shifts count: ${rmtData.shifts ? rmtData.shifts.length : 0}`);
            
            // Store RMT info from first successful response
            if (!rmtInfo) {
              rmtInfo = {
                id: rmtData.id,
                full_name: rmtData.full_name,
                shifts: rmtData.shifts,
                first_date: rmtData.first_date // Preserve first_date information
              };
              console.log(`     💾 Stored RMT info for ${rmtData.full_name}`);
            }
            
            // Add all openings from this treatment type
            if (rmtData.openings && rmtData.openings.length > 0) {
              console.log(`     📝 Sample openings:`, rmtData.openings.slice(0, 3).map(o => ({
                start_at: o.start_at,
                status: o.status,
                treatment_id: o.treatment_id
              })));
              
              allOpenings.push(...rmtData.openings);
              console.log(`     ✅ Added ${rmtData.openings.length} slots for ${this.getTreatmentName(treatmentId)}`);
            } else {
              console.log(`     ⚠️  No openings found for treatment ${treatmentId}`);
            }
          } else {
            console.log(`     ❌ Empty or invalid response data`);
          }
        } catch (treatmentError) {
          console.log(`     💥 API Error for treatment ${treatmentId}:`);
          console.log(`        Error: ${treatmentError.message}`);
          console.log(`        Status: ${treatmentError.response?.status || 'N/A'}`);
          console.log(`        Status Text: ${treatmentError.response?.statusText || 'N/A'}`);
          if (treatmentError.response?.data) {
            console.log(`        Response Data: ${JSON.stringify(treatmentError.response.data).substring(0, 200)}...`);
          }
        }
      }
      
      console.log(`\n📊 Final Results Summary:`);
      console.log(`   Total openings collected: ${allOpenings.length}`);
      console.log(`   RMT info available: ${rmtInfo ? 'Yes' : 'No'}`);
      
      if (allOpenings.length > 0 && rmtInfo) {
        // Combine all openings into a single response format
        const combinedData = {
          ...rmtInfo,
          openings: allOpenings
        };
        
        console.log(`   🎯 Processing ${allOpenings.length} total slots for ${rmtInfo.full_name}`);
        console.log(`   📅 Date range for formatting: ${startDate} to ${endDate}`);
        
        const formattedAvailability = this.formatRealAvailability(combinedData, startDate, endDate);
        console.log(`   ✅ Formatted into ${formattedAvailability.length} date groups`);
        
        return formattedAvailability;
      } else if (rmtInfo && rmtInfo.first_date) {
        // No openings in selected range, but we have first_date information
        console.log(`   📅 No openings in selected range, but first_date available: ${rmtInfo.first_date}`);
        
        const combinedData = {
          ...rmtInfo,
          openings: [] // Empty openings array, but formatRealAvailability will use first_date
        };
        
        const formattedAvailability = this.formatRealAvailability(combinedData, startDate, endDate);
        console.log(`   ✅ Formatted first_date into ${formattedAvailability.length} date groups`);
        
        return formattedAvailability;
      } else {
        console.log(`   ❌ No availability data to return:`);
        console.log(`      - Openings: ${allOpenings.length}`);
        console.log(`      - RMT Info: ${rmtInfo ? 'Available' : 'Missing'}`);
        console.log(`      - First Date: ${rmtInfo?.first_date || 'Not available'}`);
      }
      
      return [];
    } catch (error) {
      console.error(`\n💥 CRITICAL ERROR in getRealAvailability for RMT ${rmtId}:`);
      console.error(`   Error: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      console.error(`   BaseURL: ${baseUrl}`);
      console.error(`   Date Range: ${startDate} to ${endDate}`);
      return [];
    }
  }

  formatRealAvailability(rmtData) {
    const availability = [];
    const openingsByDate = {};
    
    // Group openings by date and deduplicate by time slot
    rmtData.openings.forEach(opening => {
      const date = opening.start_at.split('T')[0];
      if (!openingsByDate[date]) {
        openingsByDate[date] = new Map(); // Use Map to deduplicate by time
      }
      
      // Debug logging for date/status issues
      console.log(`    📅 Processing opening: ${opening.start_at} -> ${date}, status: ${opening.status}, treatment: ${opening.treatment_id}`);
      
      // Calculate actual duration from start and end times
      const startTime = new Date(opening.start_at);
      const endTime = new Date(opening.end_at);
      const actualDurationMinutes = Math.round((endTime - startTime) / (1000 * 60));
      
      // Use start time as key to deduplicate slots
      const timeKey = opening.start_at;
      
      // Only add if we haven't seen this exact time slot before, or if this is a better option
      if (!openingsByDate[date].has(timeKey)) {
        openingsByDate[date].set(timeKey, {
          time: this.formatTime(opening.start_at),
          endTime: this.formatTime(opening.end_at),
          available: opening.status === 'opening', // Only 'opening' status is available
          duration: actualDurationMinutes, // Use calculated duration instead of opening.duration
          service: this.getTreatmentName(opening.treatment_id),
          price: this.getTreatmentPrice(opening.treatment_id),
          startAt: opening.start_at,
          endAt: opening.end_at,
          status: opening.status, // Keep original status for debugging
          treatmentId: opening.treatment_id
        });
      }
    });
    
    // If no openings found but we have first_date, add it as the first available date
    if (Object.keys(openingsByDate).length === 0 && rmtData.first_date) {
      console.log(`    📅 No openings found, but first_date available: ${rmtData.first_date}`);
      const firstDate = rmtData.first_date.split('T')[0];
      
      // Check if first_date includes time information
      let firstTime = 'Contact for times';
      if (rmtData.first_date.includes('T')) {
        // Has time information, extract it
        firstTime = this.formatTime(rmtData.first_date);
        console.log(`    🕐 Extracted time from first_date: ${firstTime}`);
      } else {
        // Just a date, no time information available
        console.log(`    📅 first_date is date-only, no time available`);
      }
      
      // Create date object in UTC to avoid timezone issues
      const dateObj = new Date(firstDate + 'T12:00:00Z');
      
      // Format as "July 29, Tuesday"
      const monthDay = dateObj.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric',
        timeZone: 'UTC'
      });
      const weekday = dateObj.toLocaleDateString('en-US', { 
        weekday: 'long',
        timeZone: 'UTC'
      });
      
      console.log(`    📅 Adding first_date as available slot: ${firstDate} at ${firstTime}`);
      
      availability.push({
        date: firstDate,
        dayOfWeek: `${monthDay}, ${weekday}`,
        slots: [{
          time: firstTime,
          endTime: null, // We don't have end time from first_date
          available: true,
          duration: 60, // Default duration
          service: 'RMT Session',
          price: 115, // Default price
          startAt: rmtData.first_date,
          endAt: null,
          status: 'first_available', // Special status to indicate this is from first_date
          treatmentId: null
        }],
        isFirstAvailable: true // Flag to indicate this is from first_date
      });
      
      return availability;
    }
    
    // Convert to our format
    Object.keys(openingsByDate).forEach(date => {
      // Parse the date correctly to get the right day of week
      const [year, month, day] = date.split('-').map(Number);
      
      // Create date object in UTC to avoid timezone issues
      const dateObj = new Date(date + 'T12:00:00Z');  // Use noon UTC
      
      // Convert Map values to array
      const slots = Array.from(openingsByDate[date].values());
      
      // Format as "July 29, Tuesday"
      const monthDay = dateObj.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric',
        timeZone: 'UTC'
      });
      const weekday = dateObj.toLocaleDateString('en-US', { 
        weekday: 'long',
        timeZone: 'UTC'
      });
      
      console.log(`    📅 Date formatting: ${date} -> ${monthDay}, ${weekday}`);
      
      availability.push({
        date,
        dayOfWeek: `${monthDay}, ${weekday}`,
        slots: slots
      });
    });
    
    return availability;
  }

  formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  getTreatmentName(treatmentId) {
    // Map treatment IDs to names based on what we see in the HAR files and your example
    const treatmentMap = {
      1: 'RMT Massage 60 min',
      9: 'RMT Massage 45 min',
      622: 'RMT Massage 120 mins', // Based on your example (7200 seconds = 120 minutes)
      692: 'RMT Massage 45 min', // Based on your example - this is the 45min treatment Kelly has
      730: 'RMT Massage 60 mins', // Based on Susan's data - 4500 seconds = 75 minutes
      42: 'RMT Massage 90 min',
      562: 'RMT Massage 45min',
      635: 'RMT Massage 45 min',
      636: 'RMT Massage 60 min',
      637: 'RMT Massage 90 min'
    };
    return treatmentMap[treatmentId] || 'RMT Massage';
  }

  getTreatmentPrice(treatmentId) {
    // Map treatment IDs to prices based on actual clinic data
    const priceMap = {
      1: 115,    // RMT Massage 60 min
      9: 95,     // RMT Massage 45 min
      42: 165,   // RMT Massage 90 min
      562: 95,   // RMT Massage 45min
      622: 185,  // RMT Massage 120 mins
      635: 95,   // RMT Massage 45 min
      636: 115,  // RMT Massage 60 min
      637: 165,  // RMT Massage 90 min
      692: 95,   // RMT Massage 45 min (Kelly's treatment)
      730: 115   // RMT Massage 60 mins (Susan's treatment)
    };
    return priceMap[treatmentId] || 115;
  }

  // Generate a browser tab ID similar to Jane App's format
  generateBrowserTabId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 26; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Extract treatment IDs from clinic HTML content
  extractTreatmentIds($, baseUrl) {
    const treatmentIds = new Set();
    
    // Extract from treatment links in the HTML
    $('a[href*="/treatment/"]').each((index, element) => {
      const href = $(element).attr('href');
      const treatmentMatch = href.match(/\/treatment\/(\d+)/);
      if (treatmentMatch) {
        const treatmentId = parseInt(treatmentMatch[1]);
        const treatmentName = $(element).find('strong').text().trim();
        const smallText = $(element).find('small').text();
        
        // Only include RMT/massage related treatments
        if (treatmentName.toLowerCase().includes('massage') || 
            treatmentName.toLowerCase().includes('rmt') ||
            smallText.toLowerCase().includes('massage')) {
          treatmentIds.add(treatmentId);
        }
      }
    });
    
    return Array.from(treatmentIds).sort((a, b) => a - b);
  }

  // Get treatment IDs for a specific clinic from cached data or extract from page
  async getClinicTreatmentIds(baseUrl) {
    try {
      const response = await axios.get(baseUrl, {
        headers: this.baseHeaders,
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      const treatmentIds = this.extractTreatmentIds($, baseUrl);
      
      console.log(`Found ${treatmentIds.length} treatment IDs for ${baseUrl}: [${treatmentIds.join(', ')}]`);
      return treatmentIds;
    } catch (error) {
      console.error(`Error extracting treatment IDs from ${baseUrl}:`, error.message);
      // Fallback to common treatment IDs based on HAR analysis
      return this.getDefaultTreatmentIds(baseUrl);
    }
  }

  // Fallback treatment IDs based on HAR file analysis
  getDefaultTreatmentIds(baseUrl) {
    if (baseUrl.includes('stouffvillefamilymassageandwellness')) {
      return [1, 2, 3, 5, 8, 9, 19, 20, 21, 22]; // From Stouffville HAR
    } else if (baseUrl.includes('naturesgiftsandorganicspa')) {
      return [1, 562, 635, 692, 730]; // From Nature's Gifts HAR
    }
    
    // Generic fallback
    return [1, 9, 622, 692];
  }

  // Extract all treatment IDs for RMTs from HAR files
  async extractRMTTreatmentIdsFromHAR(domain) {
    const fs = require('fs');
    console.log(`Extracting RMT treatment IDs from HAR for ${domain}...`);
    
    // Handle different timestamps in HAR filenames
    let harFile;
    if (domain.includes('stouffvillefamilymassageandwellness')) {
      harFile = `${domain}_Archive [25-07-23 13-58-06].har`;
    } else {
      harFile = `${domain}_Archive [25-07-23 13-57-10].har`;
    }
    
    // Also check for home page load HAR
    const homePageHar = domain.includes('naturesgiftsandorganicspa') ? 
      'naturesgiftsandorganicspa home page load.har' : 
      `${domain} home page load.har`;
    
    if (!fs.existsSync(harFile) && !fs.existsSync(homePageHar)) {
      console.log(`HAR files not found: ${harFile} or ${homePageHar}`);
      return {
        allTreatmentIds: [],
        rmtTreatments: {},
        treatmentDetails: []
      };
    }

    try {
      let harData;
      let treatmentDetails = [];
      
      // Try home page HAR first (contains routerOptions with complete treatment data)
      if (fs.existsSync(homePageHar)) {
        console.log(`Using home page HAR: ${homePageHar}`);
        harData = JSON.parse(fs.readFileSync(homePageHar, 'utf8'));
        
        // Extract complete treatment data from routerOptions
        const routerOptionsData = this.extractRouterOptionsFromHAR(harData);
        if (routerOptionsData.treatments.length > 0) {
          treatmentDetails = routerOptionsData.treatments;
          console.log(`Found ${treatmentDetails.length} complete treatment records from routerOptions`);
        }
      } else {
        console.log(`Using archive HAR: ${harFile}`);
        harData = JSON.parse(fs.readFileSync(harFile, 'utf8'));
      }

      const rmtTreatments = {};
      const allTreatmentIds = new Set();

      // Add treatment IDs from complete treatment data
      treatmentDetails.forEach(treatment => {
        allTreatmentIds.add(treatment.id);
      });

      // Look through all entries for additional treatment data
      harData.log.entries.forEach(entry => {
        const url = entry.request.url;
        
        // Extract treatment_id from URL parameters
        const treatmentIdMatch = url.match(/treatment_id=(\d+)/);
        if (treatmentIdMatch) {
          allTreatmentIds.add(parseInt(treatmentIdMatch[1]));
        }

        // Check response bodies for treatment data
        if (entry.response && entry.response.content && entry.response.content.text) {
          try {
            const responseText = entry.response.content.text;
            
            // Look for JSON responses with treatment_id
            if (responseText.includes('treatment_id')) {
              const treatmentMatches = responseText.match(/"treatment_id":(\d+)/g);
              if (treatmentMatches) {
                treatmentMatches.forEach(match => {
                  const id = parseInt(match.match(/(\d+)/)[1]);
                  allTreatmentIds.add(id);
                });
              }
            }

            // Look for JSON API responses with staff and treatment data
            if (responseText.startsWith('[') && responseText.includes('treatment_id')) {
              try {
                const data = JSON.parse(responseText);
                if (Array.isArray(data)) {
                  data.forEach(item => {
                    if (item.full_name && item.full_name.includes('RMT') && item.openings) {
                      const treatmentIds = [...new Set(item.openings.map(opening => opening.treatment_id))];
                      rmtTreatments[item.full_name] = treatmentIds;
                      treatmentIds.forEach(id => allTreatmentIds.add(id));
                    }
                  });
                }
              } catch (e) {
                // Skip non-JSON responses
              }
            }

            // Look for HTML content with treatment links (from your previous session findings)
            if (responseText.includes('treatment/') && responseText.includes('href')) {
              const treatmentLinkMatches = responseText.match(/href="[^"]*\/treatment\/(\d+)[^"]*"/g);
              if (treatmentLinkMatches) {
                treatmentLinkMatches.forEach(match => {
                  const idMatch = match.match(/\/treatment\/(\d+)/);
                  if (idMatch) {
                    const id = parseInt(idMatch[1]);
                    allTreatmentIds.add(id);
                  }
                });
              }
            }

            // Look for staff member data in JavaScript responses (allTreatmentIds field)
            if (responseText.includes('allTreatmentIds') || responseText.includes('all_treatment_ids')) {
              // Try to extract treatment IDs from minified JavaScript
              const treatmentArrayMatches = responseText.match(/allTreatmentIds:\[([^\]]*)\]/g);
              if (treatmentArrayMatches) {
                treatmentArrayMatches.forEach(match => {
                  try {
                    const idsMatch = match.match(/\[([^\]]*)\]/);
                    if (idsMatch) {
                      const ids = idsMatch[1].split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                      ids.forEach(id => allTreatmentIds.add(id));
                      // Store with a generic key since we can't easily extract staff names from minified JS
                      if (ids.length > 0) {
                        rmtTreatments[`staff_${Object.keys(rmtTreatments).length + 1}`] = ids;
                      }
                    }
                  } catch (e) {
                    // Skip malformed data
                  }
                });
              }
            }
          } catch (e) {
            // Skip problematic responses
          }
        }
      });

      const allTreatmentIdsArray = Array.from(allTreatmentIds).sort((a, b) => a - b);
      
      console.log(`Found ${allTreatmentIdsArray.length} total treatment IDs: [${allTreatmentIdsArray.join(', ')}]`);
      console.log(`Found treatment IDs for ${Object.keys(rmtTreatments).length} RMTs:`);
      Object.entries(rmtTreatments).forEach(([name, ids]) => {
        console.log(`  ${name}: [${ids.join(', ')}]`);
      });
      
      return {
        allTreatmentIds: allTreatmentIdsArray,
        rmtTreatments: rmtTreatments,
        treatmentDetails: treatmentDetails
      };
    } catch (error) {
      console.error(`Error extracting RMT treatment IDs from HAR: ${error.message}`);
      return {
        allTreatmentIds: [],
        rmtTreatments: {},
        treatmentDetails: []
      };
    }
  }

  // Generate mock availability data with different appointment durations (fallback)
  generateMockAvailability(rmt, startDate, endDate, services = []) {
    const availability = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // More realistic RMT treatment options based on actual Jane App data
    const treatmentOptions = [
      { duration: 45, name: 'RMT Massage 45 min', price: 95, probability: 0.7 },
      { duration: 60, name: 'RMT Massage 60 mins', price: 115, probability: 0.8 },
      { duration: 90, name: 'RMT Massage 90 mins', price: 165, probability: 0.5 },
      { duration: 45, name: 'Kids /Pediatric RMT 45min Massage', price: 89, probability: 0.3 },
      { duration: 60, name: 'Craniosacral therapy and massage combo 60 min', price: 126, probability: 0.4 },
      { duration: 30, name: 'RMT Massage 30 min', price: 75, probability: 0.6 }
    ];

    // Extract actual treatments from services if available
    const rmtServices = services.filter(s => 
      s.name.toLowerCase().includes('massage') && s.treatments?.length > 0
    );
    
    let availableTreatments = treatmentOptions;
    if (rmtServices.length > 0) {
      availableTreatments = rmtServices[0].treatments.map(t => ({
        duration: t.duration || 60,
        name: t.name,
        price: t.price || 0,
        probability: this.getTreatmentProbability(t.duration)
      }));
    }
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      // Skip Sundays for most RMTs
      if (date.getDay() === 0) continue;
      
      const dayAvailability = this.generateDayAvailability(date, availableTreatments, rmt);
      
      if (dayAvailability.slots.length > 0) {
        availability.push(dayAvailability);
      }
    }
    
    return availability;
  }

  getTreatmentProbability(duration) {
    // More common durations have higher availability
    const probabilities = {
      15: 0.4, 30: 0.8, 45: 0.7, 60: 0.9, 
      75: 0.6, 90: 0.5, 120: 0.3
    };
    return probabilities[duration] || 0.6;
  }

  generateDayAvailability(date, treatments, rmt) {
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Working hours based on day
    const workingHours = this.getWorkingHours(dayOfWeek);
    const slots = [];
    
    // Generate one slot per time, with multiple duration options
    workingHours.forEach(time => {
      // Randomly determine if this time slot is available
      const baseAvailability = Math.random() > 0.3; // 70% chance of availability
      
      if (baseAvailability) {
        // For each available time slot, create options for different durations
        const availableDurations = treatments.filter(treatment => 
          this.canFitTreatment(time, treatment.duration, workingHours, isWeekend)
        );
        
        // Pick a random duration for this slot (simulating real booking behavior)
        if (availableDurations.length > 0) {
          const selectedTreatment = availableDurations[Math.floor(Math.random() * availableDurations.length)];
          
          slots.push({
            time,
            available: true,
            duration: selectedTreatment.duration,
            service: selectedTreatment.name,
            price: selectedTreatment.price,
            endTime: this.calculateEndTime(time, selectedTreatment.duration),
            availableDurations: availableDurations // Store all possible durations for this time
          });
        }
      } else {
        // Create an unavailable slot
        const defaultTreatment = treatments.find(t => t.duration === 60) || treatments[0];
        slots.push({
          time,
          available: false,
          duration: defaultTreatment.duration,
          service: defaultTreatment.name,
          price: defaultTreatment.price,
          endTime: this.calculateEndTime(time, defaultTreatment.duration)
        });
      }
    });
    
    return {
      date: date.toISOString().split('T')[0],
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
      slots: slots
    };
  }

  getWorkingHours(dayOfWeek) {
    // Sunday = 0, Monday = 1, etc.
    // More realistic time slots based on actual Jane App booking patterns
    switch (dayOfWeek) {
      case 0: // Sunday - closed
        return [];
      case 6: // Saturday - shorter hours
        return ['09:00', '09:15', '10:00', '10:15', '11:00', '11:15', '12:00', '12:15', '13:00'];
      default: // Weekdays - more granular slots like real Jane App
        return [
          '09:00', '09:15', '09:30', '09:45',
          '10:00', '10:15', '10:30', '10:45', 
          '11:00', '11:15', '11:30', '11:45',
          '14:00', '14:15', '14:30', '14:45',
          '15:00', '15:15', '15:30', '15:45',
          '16:00', '16:15', '16:30', '16:45',
          '17:00', '17:15', '17:30', '17:45'
        ];
    }
  }



  canFitTreatment(startTime, duration, workingHours, isWeekend) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;
    
    // Check against end of day
    const dayEndHour = isWeekend ? 14 : 18; // 2 PM on weekends, 6 PM on weekdays
    const dayEndMinutes = dayEndHour * 60;
    
    return endMinutes <= dayEndMinutes;
  }

  getTimeOfDayFactor(time) {
    const hour = parseInt(time.split(':')[0]);
    
    // Peak hours have lower availability
    if (hour >= 17) return 0.6; // Evening rush
    if (hour >= 11 && hour <= 14) return 0.7; // Lunch time
    if (hour >= 9 && hour <= 11) return 0.8; // Morning
    return 0.9; // Off-peak
  }

  calculateEndTime(startTime, duration) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;
    
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  }

  // Extract routerOptions data from HAR file (contains complete treatment data)
  extractRouterOptionsFromHAR(harData) {
    console.log('Extracting routerOptions from HAR data...');
    
    const result = {
      treatments: [],
      staffMembers: [],
      disciplines: []
    };

    try {
      // Look through HAR entries for HTML responses containing routerOptions
      harData.log.entries.forEach(entry => {
        if (entry.response && entry.response.content && entry.response.content.text) {
          const responseText = entry.response.content.text;
          
          // Look for routerOptions in HTML responses
          if (responseText.includes('routerOptions') && responseText.includes('treatments:')) {
            console.log('Found routerOptions in HTML response');
            
            // Extract the routerOptions object
            const routerOptionsMatch = responseText.match(/const routerOptions = \{([\s\S]*?)\}\s*function initializeRouter/);
            if (routerOptionsMatch) {
              try {
                // Extract just the treatments array
                const treatmentsMatch = routerOptionsMatch[1].match(/treatments: (\[[\s\S]*?\]),/);
                if (treatmentsMatch) {
                  const treatmentsJson = treatmentsMatch[1];
                  const treatments = JSON.parse(treatmentsJson);
                  
                  console.log(`Parsed ${treatments.length} treatments from routerOptions`);
                  result.treatments = treatments;
                  
                  // Log some sample treatments
                  if (treatments.length > 0) {
                    console.log('Sample treatments:');
                    treatments.slice(0, 3).forEach(treatment => {
                      console.log(`  - ID ${treatment.id}: ${treatment.name} (${treatment.treatment_duration}s)`);
                    });
                  }
                }
                
                // Extract staff members if available
                const staffMatch = routerOptionsMatch[1].match(/staff_members: (\[[\s\S]*?\]),/);
                if (staffMatch) {
                  try {
                    const staffJson = staffMatch[1];
                    const staff = JSON.parse(staffJson);
                    result.staffMembers = staff;
                    console.log(`Found ${staff.length} staff members`);
                  } catch (e) {
                    console.log('Could not parse staff members:', e.message);
                  }
                }
                
                // Extract disciplines if available
                const disciplinesMatch = routerOptionsMatch[1].match(/disciplines: (\[[\s\S]*?\]),/);
                if (disciplinesMatch) {
                  try {
                    const disciplinesJson = disciplinesMatch[1];
                    const disciplines = JSON.parse(disciplinesJson);
                    result.disciplines = disciplines;
                    console.log(`Found ${disciplines.length} disciplines`);
                  } catch (e) {
                    console.log('Could not parse disciplines:', e.message);
                  }
                }
                
              } catch (error) {
                console.error('Error parsing routerOptions:', error.message);
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error extracting routerOptions from HAR:', error.message);
    }

    return result;
  }
}

module.exports = JaneAppExtractor;