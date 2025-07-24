const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 Testing RMT Availability Checker API...\n');

  try {
    // Test 1: Get clinics
    console.log('1️⃣ Testing /api/clinics...');
    const clinicsResponse = await axios.get(`${BASE_URL}/api/clinics`);
    console.log(`✅ Found ${clinicsResponse.data.length} clinics`);
    clinicsResponse.data.forEach(clinic => {
      console.log(`   - ${clinic.name} (${clinic.rmtCount} RMTs)`);
    });
    console.log();

    // Test 2: Get RMTs
    console.log('2️⃣ Testing /api/rmts...');
    const rmtsResponse = await axios.get(`${BASE_URL}/api/rmts`);
    console.log(`✅ Found ${rmtsResponse.data.length} RMTs total`);
    rmtsResponse.data.forEach(rmt => {
      console.log(`   - ${rmt.name} at ${rmt.clinic}`);
    });
    console.log();

    // Test 3: Get availability for all RMTs
    console.log('3️⃣ Testing /api/availability/all...');
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const endDate = nextWeek.toISOString().split('T')[0];

    const availabilityResponse = await axios.get(
      `${BASE_URL}/api/availability/all?startDate=${today}&endDate=${endDate}`
    );
    
    console.log(`✅ Got availability for ${availabilityResponse.data.length} RMTs`);
    
    let totalSlots = 0;
    let availableSlots = 0;
    
    availabilityResponse.data.forEach(rmt => {
      if (rmt.availability && rmt.availability.length > 0) {
        rmt.availability.forEach(day => {
          totalSlots += day.slots.length;
          availableSlots += day.slots.filter(slot => slot.available).length;
        });
      }
    });
    
    console.log(`   - Total slots: ${totalSlots}`);
    console.log(`   - Available slots: ${availableSlots}`);
    console.log(`   - Availability rate: ${((availableSlots/totalSlots)*100).toFixed(1)}%`);
    console.log();

    // Test 4: Get specific clinic details
    console.log('4️⃣ Testing /api/clinic/natures-gifts...');
    const clinicResponse = await axios.get(`${BASE_URL}/api/clinic/natures-gifts`);
    console.log(`✅ Clinic: ${clinicResponse.data.name}`);
    console.log(`   - RMTs: ${clinicResponse.data.rmts.length}`);
    console.log(`   - Services: ${clinicResponse.data.services.length}`);
    console.log();

    console.log('🎉 All API tests passed!');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testAPI();
}

module.exports = testAPI;