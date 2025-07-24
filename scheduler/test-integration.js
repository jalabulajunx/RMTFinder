const AutomatedTreatmentExtractor = require('./automated-extractor');

async function testIntegration() {
  console.log('🧪 Testing Integrated Treatment Extraction System\n');
  
  const extractor = new AutomatedTreatmentExtractor();
  
  // Test 1: Single clinic extraction
  console.log('📋 Test 1: Single Clinic Extraction');
  console.log('='.repeat(50));
  
  const topCareResult = await extractor.extractTreatmentsFromUrl('https://topcarewellness.janeapp.com');
  
  console.log(`✅ Top Care Wellness: ${topCareResult.treatments.length} treatments`);
  console.log(`   RMT Treatments: ${topCareResult.treatments.filter(t => 
    t.name && t.name.toLowerCase().includes('rmt')).length}`);
  console.log(`   Treatment IDs: [${topCareResult.treatments.map(t => t.id).slice(0, 10).join(', ')}...]`);
  
  // Test 2: All clinics from config
  console.log('\n📋 Test 2: All Configured Clinics');
  console.log('='.repeat(50));
  
  const allResults = await extractor.processAllClinics();
  
  Object.entries(allResults).forEach(([clinicId, data]) => {
    console.log(`✅ ${data.name}: ${data.treatmentCount} treatments`);
    const rmtCount = data.extractedData.treatments.filter(t => 
      t.name && (t.name.toLowerCase().includes('rmt') || t.name.toLowerCase().includes('massage'))
    ).length;
    console.log(`   RMT/Massage: ${rmtCount} treatments`);
  });
  
  // Test 3: Generate summary
  console.log('\n📊 Integration Summary');
  console.log('='.repeat(50));
  
  extractor.generateSummaryReport();
  
  // Test 4: Save results
  const savedPath = await extractor.saveResults('./integration-test-results.json');
  console.log(`💾 Results saved to: ${savedPath}`);
  
  console.log('\n🎉 Integration test completed successfully!');
}

testIntegration().catch(console.error);