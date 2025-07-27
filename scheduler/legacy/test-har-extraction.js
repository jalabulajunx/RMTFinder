const JaneAppExtractor = require('./api-extractor');

async function testHARExtraction() {
  const extractor = new JaneAppExtractor();
  
  console.log('=== Testing HAR Treatment ID Extraction ===\n');
  
  // Test both clinic domains
  const domains = [
    'stouffvillefamilymassageandwellness.janeapp.com',
    'naturesgiftsandorganicspa.janeapp.com'
  ];
  
  // Test with home page HAR for Nature's Gifts
  console.log(`\n🏥 Testing with Home Page HAR for naturesgiftsandorganicspa:`);
  console.log('='.repeat(60));
  
  const homePageResult = await extractor.extractRMTTreatmentIdsFromHAR('naturesgiftsandorganicspa.janeapp.com');
  
  if (homePageResult.treatmentDetails && homePageResult.treatmentDetails.length > 0) {
    console.log(`\n📋 Complete Treatment Details: ${homePageResult.treatmentDetails.length} treatments`);
    console.log('\n🔍 Sample Treatment Details:');
    homePageResult.treatmentDetails.slice(0, 5).forEach(treatment => {
      console.log(`  • ID ${treatment.id}: ${treatment.name}`);
      console.log(`    Duration: ${treatment.treatment_duration}s (${Math.round(treatment.treatment_duration/60)}min)`);
      if (treatment.description) {
        console.log(`    Description: ${treatment.description.substring(0, 100)}...`);
      }
    });
  }
  
  for (const domain of domains) {
    console.log(`\n🏥 Analyzing ${domain}:`);
    console.log('='.repeat(60));
    
    const result = await extractor.extractRMTTreatmentIdsFromHAR(domain);
    
    if (result.allTreatmentIds.length > 0) {
      console.log(`\n📋 All Treatment IDs Found: [${result.allTreatmentIds.join(', ')}]`);
      
      if (Object.keys(result.rmtTreatments).length > 0) {
        console.log('\n👨‍⚕️ RMT-specific Treatment IDs:');
        Object.entries(result.rmtTreatments).forEach(([name, ids]) => {
          console.log(`  • ${name}: [${ids.join(', ')}]`);
        });
      }
      
      // Show treatment mapping
      console.log('\n🔍 Treatment ID Mapping:');
      result.allTreatmentIds.forEach(id => {
        const name = extractor.getTreatmentName(id);
        const price = extractor.getTreatmentPrice(id);
        console.log(`  • ID ${id}: ${name} - $${price}`);
      });
    } else {
      console.log('❌ No treatment IDs found in HAR file');
    }
  }
  
  console.log('\n=== HAR Extraction Complete ===');
}

// Run the test
testHARExtraction().catch(console.error);