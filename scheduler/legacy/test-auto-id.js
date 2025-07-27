const AutomatedTreatmentExtractor = require('./automated-extractor');

async function testAutomaticIdGeneration() {
  console.log('🤖 Testing Automatic Clinic ID Generation System\n');
  
  const extractor = new AutomatedTreatmentExtractor();
  
  // Test cases with real Jane App clinics
  const testClinics = [
    {
      name: 'Top Care Wellness',
      url: 'https://topcarewellness.janeapp.com'
    },
    {
      name: 'Physio Plus Clinic',
      url: 'https://physioplusclinic.janeapp.com'
    },
    {
      name: 'Wellness Center & Spa',
      url: 'https://wellness-center-spa.janeapp.com'
    },
    {
      name: 'Downtown Massage Therapy',
      url: 'https://downtown-massage-therapy.janeapp.com'
    },
    {
      name: 'Health & Healing Center',
      url: 'https://healthhealingcenter.janeapp.com'
    }
  ];
  
  console.log('📋 Testing ID Generation Methods:');
  console.log('='.repeat(80));
  
  testClinics.forEach((clinic, index) => {
    console.log(`\n${index + 1}. ${clinic.name}`);
    console.log(`   URL: ${clinic.url}`);
    
    // Method 1: URL-based ID (preferred)
    const urlId = extractor.generateClinicId(clinic.url);
    console.log(`   🔗 URL-based ID: "${urlId}"`);
    
    // Method 2: Name-based ID (fallback)
    const nameId = extractor.generateClinicId(null, clinic.name);
    console.log(`   📝 Name-based ID: "${nameId}"`);
    
    // Method 3: Unique ID (handles conflicts)
    const uniqueId = extractor.generateUniqueClinicId(clinic.url, clinic.name);
    console.log(`   ✅ Final unique ID: "${uniqueId}"`);
    
    // Show what the system chooses
    const chosen = urlId || nameId;
    console.log(`   🎯 System chooses: "${chosen}" (${urlId ? 'URL method' : 'Name method'})`);
  });
  
  // Test conflict resolution
  console.log('\n\n🔄 Testing Conflict Resolution:');
  console.log('='.repeat(50));
  
  // Simulate adding the same clinic multiple times
  const duplicateClinic = {
    name: 'Test Clinic',
    url: 'https://testclinic.janeapp.com'
  };
  
  console.log('Adding same clinic multiple times:');
  for (let i = 1; i <= 3; i++) {
    const uniqueId = extractor.generateUniqueClinicId(duplicateClinic.url, duplicateClinic.name);
    console.log(`  Attempt ${i}: "${uniqueId}"`);
    
    // Simulate adding to config
    extractor.config.clinics.push({
      id: uniqueId,
      name: duplicateClinic.name,
      url: duplicateClinic.url,
      enabled: true
    });
  }
  
  // Test with real clinic extraction
  console.log('\n\n🧪 Testing with Real Clinic Extraction:');
  console.log('='.repeat(50));
  
  try {
    const realClinic = {
      name: 'Top Care Wellness',
      url: 'https://topcarewellness.janeapp.com'
    };
    
    console.log(`Testing: ${realClinic.name}`);
    console.log(`URL: ${realClinic.url}`);
    
    const autoId = extractor.generateUniqueClinicId(realClinic.url, realClinic.name);
    console.log(`Generated ID: "${autoId}"`);
    
    // Test actual extraction
    console.log('\nTesting extraction...');
    const result = await extractor.extractTreatmentsFromUrl(realClinic.url);
    
    if (result.treatments.length > 0) {
      console.log(`✅ SUCCESS: Found ${result.treatments.length} treatments`);
      console.log(`   Sample treatment IDs: [${result.treatments.slice(0, 5).map(t => t.id).join(', ')}]`);
      
      // Show what the complete clinic object would look like
      const completeClinic = {
        id: autoId,
        name: realClinic.name,
        url: realClinic.url,
        enabled: true,
        addedAt: new Date().toISOString(),
        idGenerated: true,
        treatmentCount: result.treatments.length,
        rmtTreatmentCount: result.treatments.filter(t => 
          t.name && (t.name.toLowerCase().includes('rmt') || t.name.toLowerCase().includes('massage'))
        ).length
      };
      
      console.log('\n📋 Complete clinic object:');
      console.log(JSON.stringify(completeClinic, null, 2));
      
    } else {
      console.log('❌ No treatments found');
    }
    
  } catch (error) {
    console.error('❌ Error testing real extraction:', error.message);
  }
  
  console.log('\n🎉 Automatic ID Generation Test Complete!');
  console.log('\n💡 Key Benefits:');
  console.log('   ✅ No manual ID assignment needed');
  console.log('   ✅ Automatic conflict resolution');
  console.log('   ✅ URL-based IDs are unique by design');
  console.log('   ✅ Fallback to name-based IDs');
  console.log('   ✅ Fully automated clinic addition');
}

testAutomaticIdGeneration().catch(console.error);