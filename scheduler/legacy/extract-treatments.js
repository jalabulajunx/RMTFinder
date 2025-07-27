#!/usr/bin/env node

const AutomatedTreatmentExtractor = require('./automated-extractor');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';

  const extractor = new AutomatedTreatmentExtractor();

  try {
    switch (command) {
      case 'all':
        console.log('🚀 Extracting treatments from all enabled clinics...\n');
        await extractor.processAllClinics();
        extractor.generateSummaryReport();
        await extractor.saveResults();
        break;

      case 'clinic':
        const clinicUrl = args[1];
        if (!clinicUrl) {
          console.error('❌ Please provide a clinic URL');
          console.log('Usage: node extract-treatments.js clinic https://example.janeapp.com');
          process.exit(1);
        }
        
        console.log(`🔍 Extracting treatments from: ${clinicUrl}`);
        const result = await extractor.extractTreatmentsFromUrl(clinicUrl);
        
        console.log('\n📋 Results:');
        console.log(`Treatments found: ${result.treatments.length}`);
        console.log(`Staff found: ${result.staffMembers.length}`);
        console.log(`Disciplines found: ${result.disciplines.length}`);
        
        if (result.treatments.length > 0) {
          console.log('\n🔍 Treatment IDs:');
          console.log(result.treatments.map(t => t.id).join(', '));
          
          console.log('\n📋 Sample Treatments:');
          result.treatments.slice(0, 5).forEach(treatment => {
            console.log(`  • ID ${treatment.id}: ${treatment.name}`);
            if (treatment.treatment_duration) {
              console.log(`    Duration: ${Math.round(treatment.treatment_duration/60)} minutes`);
            }
          });
        }
        break;

      case 'topcare':
        console.log('🔍 Extracting treatments from Top Care Wellness...\n');
        const topcareResult = await extractor.extractTreatmentsFromUrl('https://topcarewellness.janeapp.com');
        
        console.log('\n📋 TOP CARE WELLNESS RESULTS:');
        console.log('='.repeat(50));
        console.log(`Treatments found: ${topcareResult.treatments.length}`);
        
        if (topcareResult.treatments.length > 0) {
          console.log('\n🔍 All Treatment IDs:');
          const treatmentIds = topcareResult.treatments.map(t => t.id);
          console.log(`[${treatmentIds.join(', ')}]`);
          
          console.log('\n📋 Treatment Details:');
          topcareResult.treatments.forEach(treatment => {
            const duration = treatment.treatment_duration ? `${Math.round(treatment.treatment_duration/60)}min` : 'N/A';
            console.log(`  • ID ${treatment.id}: ${treatment.name} (${duration})`);
          });
          
          // Filter RMT treatments
          const rmtTreatments = topcareResult.treatments.filter(t => 
            t.name && (t.name.toLowerCase().includes('rmt') || 
                      t.name.toLowerCase().includes('massage') ||
                      t.name.toLowerCase().includes('therapeutic'))
          );
          
          if (rmtTreatments.length > 0) {
            console.log(`\n💆 RMT/Massage Treatments (${rmtTreatments.length}):`);
            rmtTreatments.forEach(treatment => {
              const duration = treatment.treatment_duration ? `${Math.round(treatment.treatment_duration/60)}min` : 'N/A';
              console.log(`  • ID ${treatment.id}: ${treatment.name} (${duration})`);
            });
          }
        } else {
          console.log('❌ No treatments found');
          if (topcareResult.error) {
            console.log(`Error: ${topcareResult.error}`);
          }
        }
        break;

      case 'help':
      default:
        console.log('🔧 Treatment Extractor CLI');
        console.log('\nUsage:');
        console.log('  node extract-treatments.js all              # Extract from all clinics in config');
        console.log('  node extract-treatments.js clinic <url>     # Extract from specific URL');
        console.log('  node extract-treatments.js topcare         # Extract from Top Care Wellness');
        console.log('  node extract-treatments.js help            # Show this help');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { AutomatedTreatmentExtractor };