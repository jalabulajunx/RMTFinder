const express = require('express');
const cors = require('cors');
const JaneAppExtractor = require('./api-extractor');
const AutomatedTreatmentExtractor = require('./automated-extractor');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const extractor = new JaneAppExtractor();
const automatedExtractor = new AutomatedTreatmentExtractor();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Load clinic configurations from config file
const CLINICS = automatedExtractor.config.clinics.filter(clinic => clinic.enabled);

// Cache for clinic data
let clinicDataCache = new Map();const CACHE_DURATION = process.env.CACHE_DURATION || 30 * 60 * 1000; // 30 minutes default

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
    const { clinicId, rmtId, startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
    }

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
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
    }

    try {
        const allAvailability = [];

        for (const clinic of CLINICS) {
            const clinicData = await getClinicData(clinic);

            if (clinicData && clinicData.rmts) {
                for (const rmt of clinicData.rmts) {
                    // Try to get real availability first, fallback to mock data
                    let availability;
                    let dataSource = 'mock';

                    try {
                        availability = await extractor.getRealAvailability(clinic.url, rmt.id, startDate, endDate);
                        if (availability.length > 0 && availability[0].slots[0]?.startAt) {
                            dataSource = 'real';
                            console.log(`Got real availability for ${rmt.name}: ${availability.length} days`);
                        } else {
                            throw new Error('No real data available');
                        }
                    } catch (error) {
                        console.log(`No availability data for ${rmt.name}:`, error.message);
                        availability = [];
                        dataSource = 'none';
                    }

                    allAvailability.push({
                        ...rmt,
                        clinic: clinicData.name,
                        clinicId: clinic.id,
                        availability,
                        services: clinicData.services,
                        dataSource
                    });
                }
            }
        }

        res.json(allAvailability);
    } catch (error) {
        console.error('Error fetching all availability:', error);
        res.status(500).json({ error: 'Failed to fetch all availability' });
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
                    duration: t.treatment_duration ? Math.round(t.treatment_duration/60) + 'min' : 'N/A'
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

app.listen(PORT, () => {
    console.log(`RMT Availability Checker running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to view the app`);
});