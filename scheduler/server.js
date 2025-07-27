const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const JaneAppExtractor = require('./legacy/api-extractor');
const AutomatedTreatmentExtractor = require('./legacy/automated-extractor');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const extractor = new JaneAppExtractor();
const automatedExtractor = new AutomatedTreatmentExtractor();

app.use(cors());
app.use(express.json());

// Serve React frontend from dist folder
app.use(express.static(path.join(__dirname, 'public/dist')));

// Serve legacy static files
app.use('/legacy', express.static('public'));

// Load clinic configurations from config file
const CLINICS = automatedExtractor.config.clinics.filter(clinic => clinic.enabled);

// Cache for clinic data
let clinicDataCache = new Map(); const CACHE_DURATION = process.env.CACHE_DURATION || 30 * 60 * 1000; // 30 minutes default

// Helper functions for server-side sorting
function getNextAvailablePrice(rmt, startDate, endDate) {
    const searchStartDate = new Date(startDate);
    const searchEndDate = new Date(endDate);

    if (rmt.availability && rmt.availability.length > 0) {
        for (const daySlot of rmt.availability) {
            const slotDate = new Date(daySlot.date);
            if (slotDate >= searchStartDate && slotDate <= searchEndDate && daySlot.slots && daySlot.slots.length > 0) {
                return daySlot.slots[0].price || 115;
            }
        }
    }
    return null;
}

function getNextAvailableDate(rmt, startDate, endDate) {
    const searchStartDate = new Date(startDate);
    const searchEndDate = new Date(endDate);

    if (rmt.availability && rmt.availability.length > 0) {
        for (const daySlot of rmt.availability) {
            const slotDate = new Date(daySlot.date);
            if (slotDate >= searchStartDate && slotDate <= searchEndDate && daySlot.slots && daySlot.slots.length > 0) {
                return daySlot.date;
            }
        }
    }
    return null;
}

function getRecommendationScore(rmt) {
    let score = 0;

    // Boost for real availability data
    if (rmt.dataSource === 'real') score += 50;
    else if (rmt.dataSource === 'cached') score += 30;
    else if (rmt.dataSource === 'estimated') score += 20;

    // Boost for having availability
    if (rmt.availability && rmt.availability.length > 0) score += 30;

    // Boost for more available slots
    const totalSlots = rmt.availability?.reduce((sum, day) => sum + (day.slots?.length || 0), 0) || 0;
    score += Math.min(totalSlots * 2, 20);

    return score;
}

async function getClinicData(clinic) {
    const cacheKey = clinic.id;
    const cached = clinicDataCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        return cached.data;
    }

    try {
        console.log(`Fetching fresh data for ${clinic.name}...`);
        const data = await extractor.extractClinicData(clinic.url);

        if (data) {
            clinicDataCache.set(cacheKey, {
                data: { ...data, clinicId: clinic.id, url: clinic.url },
                timestamp: Date.now()
            });
            return { ...data, clinicId: clinic.id, url: clinic.url };
        }
    } catch (error) {
        console.error(`Error fetching data for ${clinic.name}:`, error.message);
    }

    return null;
}

// API Routes

// Get organizations for filtering dropdown
app.get('/api/organizations', (req, res) => {
    try {
        // Return the clinic configuration for the frontend dropdown
        const organizations = {
            clinics: CLINICS.map(clinic => ({
                id: clinic.id,
                name: clinic.name,
                enabled: clinic.enabled
            }))
        };
        res.json(organizations);
    } catch (error) {
        console.error('Error fetching organizations:', error);
        res.status(500).json({ error: 'Failed to fetch organizations' });
    }
});

app.get('/api/clinics', async (req, res) => {
    try {
        const clinicsWithData = [];

        for (const clinic of CLINICS) {
            const data = await getClinicData(clinic);
            clinicsWithData.push({
                id: clinic.id,
                name: data?.name || clinic.name,
                url: clinic.url,
                rmtCount: data?.rmts?.length || 0,
                services: data?.services?.length || 0
            });
        }

        res.json(clinicsWithData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch clinics' });
    }
});

app.get('/api/rmts', async (req, res) => {
    try {
        const allRMTs = [];

        for (const clinic of CLINICS) {
            const clinicData = await getClinicData(clinic);

            if (clinicData && clinicData.rmts) {
                const rmtsWithClinic = clinicData.rmts.map(rmt => ({
                    ...rmt,
                    clinic: clinicData.name,
                    clinicId: clinic.id,
                    clinicUrl: clinic.url
                }));
                allRMTs.push(...rmtsWithClinic);
            }
        }

        res.json(allRMTs);
    } catch (error) {
        console.error('Error fetching RMTs:', error);
        res.status(500).json({ error: 'Failed to fetch RMTs' });
    }
});

app.get('/api/availability', async (req, res) => {
    const { clinicId, rmtId, date, num_days } = req.query;

    if (!date || !num_days) {
        return res.status(400).json({ error: 'Date and num_days are required' });
    }

    // Calculate end date from start date + num_days
    const startDate = date;
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + parseInt(num_days) - 1);
    const endDate = end.toISOString().split('T')[0];

    try {
        const clinic = CLINICS.find(c => c.id === clinicId);
        if (!clinic) {
            return res.status(404).json({ error: 'Clinic not found' });
        }

        const clinicData = await getClinicData(clinic);
        if (!clinicData) {
            return res.status(404).json({ error: 'Clinic data not available' });
        }

        const rmt = clinicData.rmts.find(r => r.id === rmtId);
        if (!rmt) {
            return res.status(404).json({ error: 'RMT not found' });
        }

        // Try to get real availability data only
        let availability;
        let dataSource = 'none';

        try {
            availability = await extractor.getRealAvailability(clinic.url, rmtId, startDate, endDate);
            if (availability.length > 0 && availability[0].slots[0]?.startAt) {
                dataSource = 'real';
                console.log(`Got real availability for ${rmt.name}: ${availability.length} days`);
            } else {
                availability = [];
            }
        } catch (error) {
            console.log(`No availability data for ${rmt.name}:`, error.message);
            availability = [];
        }

        res.json({
            rmtId,
            rmtName: rmt.name,
            clinic: clinicData.name,
            availability,
            services: clinicData.services,
            dataSource
        });
    } catch (error) {
        console.error('Error fetching availability:', error);
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
});

app.get('/api/availability/all', async (req, res) => {
    const { date, num_days, clinicIndex = 0, targetRMTs = 10, search, organization, sortBy = 'recommended', sortOrder = 'asc' } = req.query;
    
    if (!date || !num_days) {
        return res.status(400).json({ error: 'Date and num_days are required' });
    }
    
    const requestedClinicIndex = parseInt(clinicIndex);
    
    // Calculate end date
    const startDate = date;
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + parseInt(num_days) - 1);
    const endDate = end.toISOString().split('T')[0];

    try {
        // Get all enabled clinics, filter by organization if specified
        let clinics = CLINICS.filter(clinic => clinic.enabled);
        if (organization) {
            clinics = clinics.filter(clinic => clinic.id === organization);
        }
        
        // Check if requested clinic index is valid
        if (requestedClinicIndex >= clinics.length) {
            return res.json({
                data: [],
                pagination: {
                    nextClinicIndex: null,
                    hasMoreClinics: false,
                    totalClinics: clinics.length,
                    processedClinics: 0,
                    rmtCount: 0
                }
            });
        }
        
        // Get the specific clinic for this request
        const clinic = clinics[requestedClinicIndex];
        const allRMTs = [];
        
        console.log(`📋 Loading RMTs for clinic ${requestedClinicIndex}: ${clinic.name}`);
        
        try {
            const clinicData = await getClinicData(clinic);
            
            if (clinicData && clinicData.rmts) {
                console.log(`🔍 Found ${clinicData.rmts.length} RMTs in ${clinic.name}`);
                
                // Process ALL RMTs from this specific clinic
                for (const rmt of clinicData.rmts) {
                    // Get availability data for each RMT
                    let availability = [];
                    let dataSource = 'none';
                    
                    try {
                        availability = await extractor.getRealAvailability(clinic.url, rmt.id, startDate, endDate);
                        if (availability.length > 0 && availability[0].slots && availability[0].slots.length > 0) {
                            dataSource = 'real';
                            console.log(`✅ Got real availability for ${rmt.name}: ${availability.length} days`);
                        } else {
                            console.log(`⚠️ No availability slots for ${rmt.name}`);
                        }
                    } catch (error) {
                        console.log(`❌ No availability data for ${rmt.name}:`, error.message);
                    }

                    allRMTs.push({
                        ...rmt,
                        clinic: clinicData.name,
                        clinicId: clinic.id,
                        availability,
                        services: clinicData.services,
                        dataSource
                    });
                }
            } else {
                console.log(`⚠️ No RMT data found for ${clinic.name}`);
            }
        } catch (error) {
            console.error(`❌ Error processing clinic ${clinic.name}:`, error.message);
        }
        
        // Apply search filter
        let filteredResults = allRMTs;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredResults = allRMTs.filter(rmt => 
                rmt.name?.toLowerCase().includes(searchLower) ||
                rmt.clinic?.toLowerCase().includes(searchLower) ||
                rmt.services?.some(service => service.name?.toLowerCase().includes(searchLower))
            );
        }
        
        // Apply sorting
        filteredResults.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = (a.name || '').localeCompare(b.name || '');
                    break;
                case 'clinic':
                    comparison = (a.clinic || '').localeCompare(b.clinic || '');
                    break;
                case 'price':
                    const aPrice = getNextAvailablePrice(a, startDate, endDate);
                    const bPrice = getNextAvailablePrice(b, startDate, endDate);
                    if (aPrice === null && bPrice === null) comparison = 0;
                    else if (aPrice === null) comparison = 1;
                    else if (bPrice === null) comparison = -1;
                    else comparison = aPrice - bPrice;
                    break;
                case 'next_available':
                    const aDate = getNextAvailableDate(a, startDate, endDate);
                    const bDate = getNextAvailableDate(b, startDate, endDate);
                    if (aDate === null && bDate === null) comparison = 0;
                    else if (aDate === null) comparison = 1;
                    else if (bDate === null) comparison = -1;
                    else comparison = new Date(aDate).getTime() - new Date(bDate).getTime();
                    break;
                default:
                    // Default to recommended (real data first, then by availability)
                    const aScore = getRecommendationScore(a);
                    const bScore = getRecommendationScore(b);
                    comparison = bScore - aScore;
            }
            return sortOrder === 'desc' ? -comparison : comparison;
        });
        
        console.log(`📊 Returning ${filteredResults.length} RMTs for clinic ${clinic.name}`);
        
        // Response - check if there are more clinics after this one
        const hasMoreClinics = (requestedClinicIndex + 1) < clinics.length;
        res.json({
            data: filteredResults,
            pagination: {
                nextClinicIndex: hasMoreClinics ? requestedClinicIndex + 1 : null,
                hasMoreClinics,
                totalClinics: clinics.length,
                processedClinics: 1,
                rmtCount: filteredResults.length,
                currentClinic: {
                    index: requestedClinicIndex,
                    name: clinic.name,
                    id: clinic.id
                }
            }
        });
        
    } catch (error) {
        console.error('Error fetching availability:', error);
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
});

// Get all treatments using automated extraction (live from websites)
app.get('/api/treatments', async (req, res) => {
    try {
        console.log('🚀 Starting automated treatment extraction...');

        // Process all clinics using automated extractor
        const results = await automatedExtractor.processAllClinics();

        // Transform results for API response
        const allTreatments = {};

        Object.entries(results).forEach(([clinicId, clinicData]) => {
            allTreatments[clinicData.name] = {
                clinicId: clinicId,
                domain: clinicData.url.replace('https://', '').replace('http://', ''),
                url: clinicData.url,
                extractedAt: clinicData.extractedAt,
                treatmentCount: clinicData.treatmentCount,
                allTreatmentIds: clinicData.extractedData.treatments.map(t => t.id),
                treatmentDetails: clinicData.extractedData.treatments,
                rmtTreatments: clinicData.extractedData.treatments.filter(t =>
                    t.name && (
                        t.name.toLowerCase().includes('rmt') ||
                        t.name.toLowerCase().includes('massage') ||
                        t.name.toLowerCase().includes('therapeutic')
                    )
                ),
                disciplines: clinicData.extractedData.disciplines,
                error: clinicData.extractedData.error
            };
        });

        res.json({
            success: true,
            extractedAt: new Date().toISOString(),
            totalClinics: Object.keys(allTreatments).length,
            totalTreatments: Object.values(allTreatments).reduce((sum, clinic) => sum + clinic.treatmentCount, 0),
            treatments: allTreatments
        });
    } catch (error) {
        console.error('Error in automated treatment extraction:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get treatments for specific clinic (live extraction)
app.get('/api/treatments/:clinicId', async (req, res) => {
    try {
        const clinicId = req.params.clinicId;
        const clinic = CLINICS.find(c => c.id === clinicId);

        if (!clinic) {
            return res.status(404).json({ error: 'Clinic not found' });
        }

        console.log(`🔍 Extracting treatments for: ${clinic.name}`);
        const extractedData = await automatedExtractor.extractTreatmentsFromUrl(clinic.url);

        const rmtTreatments = extractedData.treatments.filter(t =>
            t.name && (
                t.name.toLowerCase().includes('rmt') ||
                t.name.toLowerCase().includes('massage') ||
                t.name.toLowerCase().includes('therapeutic')
            )
        );

        res.json({
            success: true,
            clinic: {
                id: clinic.id,
                name: clinic.name,
                url: clinic.url
            },
            extractedAt: new Date().toISOString(),
            treatmentCount: extractedData.treatments.length,
            rmtTreatmentCount: rmtTreatments.length,
            allTreatmentIds: extractedData.treatments.map(t => t.id),
            treatments: extractedData.treatments,
            rmtTreatments: rmtTreatments,
            disciplines: extractedData.disciplines,
            error: extractedData.error
        });
    } catch (error) {
        console.error(`Error extracting treatments for clinic ${req.params.clinicId}:`, error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Add new clinic to config and extract treatments
app.post('/api/clinics', async (req, res) => {
    try {
        const { name, url, id } = req.body;

        if (!name || !url) {
            return res.status(400).json({ error: 'Name and URL are required' });
        }

        // Validate URL format
        if (!url.includes('.janeapp.com')) {
            return res.status(400).json({ error: 'URL must be a Jane App clinic URL' });
        }

        // Generate automatic ID (use provided ID as override if given)
        const autoGeneratedId = automatedExtractor.generateUniqueClinicId(url, name);
        const finalId = id || autoGeneratedId;

        console.log(`🔧 Generated clinic ID: "${finalId}" from URL: ${url}`);

        // Test extraction first
        console.log(`🧪 Testing extraction for new clinic: ${name}`);
        const testResult = await automatedExtractor.extractTreatmentsFromUrl(url);

        if (testResult.error) {
            return res.status(400).json({
                error: 'Failed to extract treatments from this URL',
                details: testResult.error
            });
        }

        // Create new clinic object
        const newClinic = {
            id: finalId,
            name: name,
            url: url,
            enabled: true,
            addedAt: new Date().toISOString(),
            idGenerated: !id // Flag to show if ID was auto-generated
        };

        // Add to in-memory array
        CLINICS.push(newClinic);

        // Persist to config file
        try {
            const configPath = './clinic-config.json';
            const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

            // Add new clinic to config
            currentConfig.clinics.push(newClinic);

            // Write back to file with pretty formatting
            fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));

            console.log(`💾 Clinic "${name}" saved to ${configPath}`);
        } catch (saveError) {
            console.error('❌ Failed to save clinic to config file:', saveError.message);
            // Continue anyway - clinic is still available in memory for this session
        }

        res.json({
            success: true,
            clinic: newClinic,
            idInfo: {
                provided: !!id,
                generated: autoGeneratedId,
                final: finalId
            },
            testResults: {
                treatmentCount: testResult.treatments.length,
                disciplineCount: testResult.disciplines.length,
                sampleTreatments: testResult.treatments.slice(0, 5).map(t => ({
                    id: t.id,
                    name: t.name,
                    duration: t.treatment_duration ? Math.round(t.treatment_duration / 60) + 'min' : 'N/A'
                }))
            }
        });
    } catch (error) {
        console.error('Error adding new clinic:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Additional endpoint to get clinic details
app.get('/api/clinic/:id', async (req, res) => {
    try {
        const clinic = CLINICS.find(c => c.id === req.params.id);
        if (!clinic) {
            return res.status(404).json({ error: 'Clinic not found' });
        }

        const clinicData = await getClinicData(clinic);
        if (!clinicData) {
            return res.status(404).json({ error: 'Clinic data not available' });
        }

        res.json(clinicData);
    } catch (error) {
        console.error('Error fetching clinic details:', error);
        res.status(500).json({ error: 'Failed to fetch clinic details' });
    }
});

// Catch all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`RMT Availability Checker running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to view the modern React app`);
    console.log(`Visit http://localhost:${PORT}/legacy to view the legacy app`);
});