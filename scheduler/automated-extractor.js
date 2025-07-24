const axios = require('axios');
const fs = require('fs');
const path = require('path');

class AutomatedTreatmentExtractor {
  constructor(configPath = './clinic-config.json') {
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.results = {};
  }

  // Generate clinic ID automatically from URL or name
  generateClinicId(url, name = null) {
    // Method 1: Extract from Jane App subdomain (preferred)
    if (url) {
      const urlMatch = url.match(/https?:\/\/([^.]+)\.janeapp\.com/);
      if (urlMatch) {
        const subdomain = urlMatch[1];
        // Clean up subdomain if needed
        return subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      }
    }
    
    // Method 2: Fallback to name slugification
    if (name) {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-')         // Replace spaces with hyphens
        .replace(/-+/g, '-')          // Remove duplicate hyphens
        .replace(/^-|-$/g, '');       // Remove leading/trailing hyphens
    }
    
    // Method 3: Generate from timestamp as last resort
    return 'clinic-' + Date.now();
  }

  // Validate if clinic ID already exists
  isClinicIdUnique(id) {
    return !this.config.clinics.some(clinic => clinic.id === id);
  }

  // Generate unique clinic ID
  generateUniqueClinicId(url, name = null) {
    let baseId = this.generateClinicId(url, name);
    let finalId = baseId;
    let counter = 1;
    
    // If ID exists, append number
    while (!this.isClinicIdUnique(finalId)) {
      finalId = `${baseId}-${counter}`;
      counter++;
    }
    
    return finalId;
  }

  // Extract treatment data directly from clinic URL
  async extractTreatmentsFromUrl(clinicUrl) {
    console.log(`🔍 Fetching treatment data from: ${clinicUrl}`);
    
    try {
      const response = await axios.get(clinicUrl, {
        headers: {
          'User-Agent': this.config.settings.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: this.config.settings.requestTimeout
      });

      const html = response.data;
      return this.parseRouterOptionsFromHtml(html);
      
    } catch (error) {
      console.error(`❌ Error fetching ${clinicUrl}:`, error.message);
      return {
        treatments: [],
        staffMembers: [],
        disciplines: [],
        error: error.message
      };
    }
  }

  // Parse routerOptions from HTML content
  parseRouterOptionsFromHtml(html) {
    console.log('📋 Parsing routerOptions from HTML...');
    
    const result = {
      treatments: [],
      staffMembers: [],
      disciplines: [],
      rawData: null
    };

    try {
      // Look for routerOptions in the HTML
      const routerOptionsMatch = html.match(/const routerOptions = \{([\s\S]*?)\}\s*function initializeRouter/);
      
      if (!routerOptionsMatch) {
        console.log('⚠️  routerOptions not found in HTML');
        return result;
      }

      console.log('✅ Found routerOptions in HTML');
      
      // Extract treatments array with improved parsing
      const treatmentsMatch = routerOptionsMatch[1].match(/treatments:\s*(\[[\s\S]*?\]),?\s*(?:staff_members|disciplines|\})/);
      
      if (treatmentsMatch) {
        try {
          // Clean up the JSON string for parsing
          let treatmentsJson = treatmentsMatch[1];
          
          // Handle common JSON issues in the extracted string
          treatmentsJson = this.cleanJsonString(treatmentsJson);
          
          const treatments = JSON.parse(treatmentsJson);
          result.treatments = treatments;
          
          console.log(`✅ Parsed ${treatments.length} treatments successfully`);
          
          // Log sample treatments
          if (treatments.length > 0) {
            console.log('📋 Sample treatments:');
            treatments.slice(0, 3).forEach(treatment => {
              console.log(`  • ID ${treatment.id}: ${treatment.name} (${Math.round(treatment.treatment_duration/60)}min)`);
            });
          }
          
        } catch (parseError) {
          console.error('❌ Error parsing treatments JSON:', parseError.message);
          
          // Fallback: extract treatment IDs using regex
          const treatmentIds = this.extractTreatmentIdsWithRegex(treatmentsMatch[1]);
          if (treatmentIds.length > 0) {
            result.treatments = treatmentIds.map(id => ({ id, name: `Treatment ${id}`, extracted_via: 'regex' }));
            console.log(`⚠️  Fallback: extracted ${treatmentIds.length} treatment IDs via regex`);
          }
        }
      }

      // Extract staff members
      const staffMatch = routerOptionsMatch[1].match(/staff_members:\s*(\[[\s\S]*?\]),?\s*(?:treatments|disciplines|\})/);
      if (staffMatch) {
        try {
          const staffJson = this.cleanJsonString(staffMatch[1]);
          result.staffMembers = JSON.parse(staffJson);
          console.log(`✅ Parsed ${result.staffMembers.length} staff members`);
        } catch (e) {
          console.log('⚠️  Could not parse staff members');
        }
      }

      // Extract disciplines
      const disciplinesMatch = routerOptionsMatch[1].match(/disciplines:\s*(\[[\s\S]*?\]),?\s*(?:treatments|staff_members|\})/);
      if (disciplinesMatch) {
        try {
          const disciplinesJson = this.cleanJsonString(disciplinesMatch[1]);
          result.disciplines = JSON.parse(disciplinesJson);
          console.log(`✅ Parsed ${result.disciplines.length} disciplines`);
        } catch (e) {
          console.log('⚠️  Could not parse disciplines');
        }
      }

    } catch (error) {
      console.error('❌ Error parsing routerOptions:', error.message);
    }

    return result;
  }

  // Clean JSON string for parsing
  cleanJsonString(jsonStr) {
    // Remove trailing commas before closing brackets/braces
    jsonStr = jsonStr.replace(/,(\s*[\]}])/g, '$1');
    
    // Handle escaped quotes in descriptions
    jsonStr = jsonStr.replace(/\\"/g, '"');
    
    // Remove any trailing comma at the end
    jsonStr = jsonStr.replace(/,\s*$/, '');
    
    return jsonStr;
  }

  // Fallback: extract treatment IDs using regex when JSON parsing fails
  extractTreatmentIdsWithRegex(treatmentsStr) {
    const idMatches = treatmentsStr.match(/"id":\s*(\d+)/g);
    if (idMatches) {
      return idMatches.map(match => parseInt(match.match(/(\d+)/)[1]));
    }
    return [];
  }

  // Process all clinics from config
  async processAllClinics() {
    console.log('🚀 Starting automated treatment extraction...\n');
    
    const enabledClinics = this.config.clinics.filter(clinic => clinic.enabled);
    console.log(`📋 Processing ${enabledClinics.length} enabled clinics\n`);

    for (const clinic of enabledClinics) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🏥 Processing: ${clinic.name}`);
      console.log(`🔗 URL: ${clinic.url}`);
      console.log(`${'='.repeat(60)}`);

      const extractedData = await this.extractTreatmentsFromUrl(clinic.url);
      
      this.results[clinic.id] = {
        ...clinic,
        extractedData,
        extractedAt: new Date().toISOString(),
        treatmentCount: extractedData.treatments.length,
        staffCount: extractedData.staffMembers.length,
        disciplineCount: extractedData.disciplines.length
      };

      // Add delay between requests to be respectful
      if (enabledClinics.indexOf(clinic) < enabledClinics.length - 1) {
        console.log(`⏳ Waiting ${this.config.settings.retryDelay}ms before next clinic...`);
        await this.delay(this.config.settings.retryDelay);
      }
    }

    return this.results;
  }

  // Generate summary report
  generateSummaryReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 EXTRACTION SUMMARY REPORT');
    console.log('='.repeat(80));

    let totalTreatments = 0;
    let totalStaff = 0;
    let successfulExtractions = 0;

    Object.entries(this.results).forEach(([clinicId, data]) => {
      const status = data.extractedData.error ? '❌ FAILED' : '✅ SUCCESS';
      console.log(`\n🏥 ${data.name}`);
      console.log(`   Status: ${status}`);
      console.log(`   Treatments: ${data.treatmentCount}`);
      console.log(`   Staff: ${data.staffCount}`);
      console.log(`   Disciplines: ${data.disciplineCount}`);
      
      if (data.extractedData.error) {
        console.log(`   Error: ${data.extractedData.error}`);
      } else {
        totalTreatments += data.treatmentCount;
        totalStaff += data.staffCount;
        successfulExtractions++;
      }
    });

    console.log(`\n${'='.repeat(40)}`);
    console.log(`📈 TOTALS:`);
    console.log(`   Successful extractions: ${successfulExtractions}/${Object.keys(this.results).length}`);
    console.log(`   Total treatments found: ${totalTreatments}`);
    console.log(`   Total staff found: ${totalStaff}`);
    console.log(`${'='.repeat(40)}\n`);
  }

  // Save results to file
  async saveResults(outputPath = './extraction-results.json') {
    const output = {
      extractedAt: new Date().toISOString(),
      config: this.config,
      results: this.results,
      summary: {
        totalClinics: Object.keys(this.results).length,
        successfulExtractions: Object.values(this.results).filter(r => !r.extractedData.error).length,
        totalTreatments: Object.values(this.results).reduce((sum, r) => sum + r.treatmentCount, 0),
        totalStaff: Object.values(this.results).reduce((sum, r) => sum + r.staffCount, 0)
      }
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`💾 Results saved to: ${outputPath}`);
    return outputPath;
  }

  // Get treatment IDs for specific clinic
  getTreatmentIds(clinicId) {
    const clinic = this.results[clinicId];
    if (!clinic || clinic.extractedData.error) {
      return [];
    }
    return clinic.extractedData.treatments.map(t => t.id);
  }

  // Get RMT treatments for specific clinic
  getRMTTreatments(clinicId) {
    const clinic = this.results[clinicId];
    if (!clinic || clinic.extractedData.error) {
      return [];
    }
    
    return clinic.extractedData.treatments.filter(treatment => 
      treatment.name && (
        treatment.name.toLowerCase().includes('rmt') ||
        treatment.name.toLowerCase().includes('massage') ||
        treatment.name.toLowerCase().includes('therapeutic')
      )
    );
  }

  // Utility: delay function
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AutomatedTreatmentExtractor;