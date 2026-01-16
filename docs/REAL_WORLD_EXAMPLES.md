# Real-World Examples: Premium ELM Variants by Industry

This document provides practical, real-world examples of how each Premium ELM variant can be used across different business verticals.

---

## 1. Adaptive Online ELM

### Finance: Real-Time Fraud Detection
**Use Case**: Continuously adapt to new fraud patterns as they emerge

```javascript
import { AdaptiveOnlineELM } from '@astermind/astermind-community';

const fraudDetector = new AdaptiveOnlineELM({
  categories: ['legitimate', 'fraud', 'suspicious'],
  initialHiddenUnits: 128,
  minHiddenUnits: 64,
  maxHiddenUnits: 512
});

// Initial training on historical data
fraudDetector.fit(historicalTransactions, historicalLabels);

// Real-time updates as new transactions arrive
setInterval(() => {
  const newTransaction = getLatestTransaction();
  const result = fraudDetector.predict(newTransaction, 1);
  
  if (result[0].label === 'fraud') {
    blockTransaction(newTransaction);
  }
  
  // Periodically update with verified fraud cases
  if (isVerifiedFraud(newTransaction)) {
    fraudDetector.update(newTransaction, 1); // Label 1 = fraud
  }
}, 1000); // Check every second
```

### Transportation: Dynamic Route Optimization
**Use Case**: Adapt to changing traffic patterns and road conditions

```javascript
const routeOptimizer = new AdaptiveOnlineELM({
  categories: ['optimal', 'moderate', 'congested'],
  initialHiddenUnits: 96
});

// Train on historical route data
routeOptimizer.fit(routeFeatures, congestionLevels);

// Update in real-time as new traffic data arrives
function optimizeRoute(origin, destination) {
  const currentConditions = getCurrentTrafficData(origin, destination);
  const prediction = routeOptimizer.predict(currentConditions, 1);
  
  if (prediction[0].label === 'congested') {
    return findAlternativeRoute(origin, destination);
  }
  
  // Update model with actual congestion experienced
  routeOptimizer.update(currentConditions, actualCongestionLevel);
}
```

### Healthcare: Patient Monitoring
**Use Case**: Continuously adapt to patient condition changes in ICU

```javascript
const patientMonitor = new AdaptiveOnlineELM({
  categories: ['stable', 'monitoring', 'critical'],
  initialHiddenUnits: 64
});

// Monitor patient vitals every minute
setInterval(() => {
  const vitals = getPatientVitals(patientId);
  const status = patientMonitor.predict(vitals, 1);
  
  if (status[0].label === 'critical') {
    alertMedicalStaff(patientId);
  }
  
  // Update with actual patient outcomes
  patientMonitor.update(vitals, actualPatientStatus);
}, 60000);
```

---

## 2. Forgetting Online ELM

### Logistics: Warehouse Inventory Management
**Use Case**: Prioritize recent demand patterns over outdated data

```javascript
import { ForgettingOnlineELM } from '@astermind/astermind-community';

const inventoryPredictor = new ForgettingOnlineELM({
  categories: ['low_stock', 'adequate', 'overstock'],
  forgettingFactor: 0.92 // Higher = forgets slower
});

// Seasonal products need faster forgetting
const seasonalPredictor = new ForgettingOnlineELM({
  categories: ['low_stock', 'adequate', 'overstock'],
  forgettingFactor: 0.85 // Faster forgetting for seasonal trends
});

// Update daily with new sales data
function updateInventoryModel(dailySales) {
  inventoryPredictor.update(dailySales, calculateStockLevel(dailySales));
  
  // Recent data weighted more heavily than old seasonal patterns
  if (isSeasonalProduct(dailySales.productId)) {
    seasonalPredictor.update(dailySales, calculateStockLevel(dailySales));
  }
}
```

### Finance: Stock Price Movement Prediction
**Use Case**: Focus on recent market trends, forget outdated patterns

```javascript
const stockPredictor = new ForgettingOnlineELM({
  categories: ['buy', 'hold', 'sell'],
  forgettingFactor: 0.90
});

// Update every trading day
function predictStockMovement(symbol) {
  const marketData = getMarketIndicators(symbol);
  const prediction = stockPredictor.predict(marketData, 1);
  
  // Old market conditions automatically weighted less
  return prediction[0].label;
}
```

### Science: Climate Monitoring
**Use Case**: Track recent climate changes while de-emphasizing historical anomalies

```javascript
const climateAnalyzer = new ForgettingOnlineELM({
  categories: ['normal', 'anomaly', 'extreme'],
  forgettingFactor: 0.95 // Slow forgetting for climate data
});

// Update monthly with new climate readings
function analyzeClimateData(monthlyReadings) {
  const analysis = climateAnalyzer.predict(monthlyReadings, 1);
  
  if (analysis[0].label === 'extreme') {
    triggerClimateAlert(monthlyReadings);
  }
  
  climateAnalyzer.update(monthlyReadings, verifiedClimateCategory);
}
```

---

## 3. Hierarchical ELM

### Healthcare: Medical Diagnosis System
**Use Case**: Multi-level diagnosis from symptoms to specific conditions

```javascript
import { HierarchicalELM } from '@astermind/astermind-community';

const diagnosisSystem = new HierarchicalELM({
  hierarchy: {
    'root': ['infectious', 'non_infectious'],
    'infectious': ['bacterial', 'viral', 'fungal'],
    'bacterial': ['strep', 'staph', 'e_coli'],
    'viral': ['influenza', 'covid', 'common_cold'],
    'non_infectious': ['autoimmune', 'genetic', 'environmental']
  },
  rootCategories: ['root']
});

// Patient symptoms
const symptoms = [fever, cough, fatigue, bodyAches];

// Get hierarchical diagnosis
const diagnosis = diagnosisSystem.predict(symptoms, 3);
// Returns: [
//   { path: ['root', 'infectious', 'viral', 'influenza'], prob: 0.85 },
//   { path: ['root', 'infectious', 'viral', 'covid'], prob: 0.12 },
//   ...
// ]

console.log(`Primary diagnosis: ${diagnosis[0].path.join(' → ')}`);
```

### Science: Biological Classification
**Use Case**: Classify organisms from kingdom to species

```javascript
const organismClassifier = new HierarchicalELM({
  hierarchy: {
    'root': ['animalia', 'plantae', 'fungi'],
    'animalia': ['mammalia', 'aves', 'reptilia'],
    'mammalia': ['carnivora', 'herbivora', 'omnivora'],
    'carnivora': ['canidae', 'felidae', 'ursidae']
  },
  rootCategories: ['root']
});

// Classify from DNA sequence features
const organismFeatures = extractDNAFeatures(dnaSequence);
const classification = organismClassifier.predict(organismFeatures, 1);
// Returns: { path: ['root', 'animalia', 'mammalia', 'carnivora', 'canidae'], prob: 0.92 }
```

### Finance: Risk Assessment Hierarchy
**Use Case**: Assess risk from general category to specific risk type

```javascript
const riskAssessor = new HierarchicalELM({
  hierarchy: {
    'root': ['low_risk', 'medium_risk', 'high_risk'],
    'high_risk': ['credit_risk', 'market_risk', 'operational_risk'],
    'credit_risk': ['default_risk', 'counterparty_risk'],
    'market_risk': ['liquidity_risk', 'volatility_risk']
  },
  rootCategories: ['root']
});

// Assess loan application
const loanFeatures = [creditScore, income, debtRatio, employmentHistory];
const riskAssessment = riskAssessor.predict(loanFeatures, 1);
// Returns: { path: ['root', 'high_risk', 'credit_risk', 'default_risk'], prob: 0.78 }
```

---

## 4. Attention-Enhanced ELM

### Healthcare: Medical Image Analysis
**Use Case**: Focus on critical regions in X-rays or MRIs

```javascript
import { AttentionEnhancedELM } from '@astermind/astermind-community';

const medicalImageAnalyzer = new AttentionEnhancedELM({
  categories: ['normal', 'benign', 'malignant'],
  attentionUnits: 256
});

// Analyze chest X-ray
const xrayFeatures = extractImageFeatures(chestXray);
const diagnosis = medicalImageAnalyzer.predict(xrayFeatures, 3);

// Attention mechanism automatically focuses on suspicious regions
if (diagnosis[0].label === 'malignant') {
  highlightAttentionRegions(xrayFeatures); // Show where model focused
}
```

### Finance: Document Analysis
**Use Case**: Focus on key terms in financial documents

```javascript
const documentAnalyzer = new AttentionEnhancedELM({
  categories: ['approved', 'needs_review', 'rejected'],
  attentionUnits: 128
});

// Analyze loan application documents
const documentFeatures = extractTextFeatures(loanDocuments);
const decision = documentAnalyzer.predict(documentFeatures, 1);

// Attention highlights important clauses or red flags
if (decision[0].label === 'needs_review') {
  showAttentionHighlights(documentFeatures); // Highlight key sections
}
```

### Transportation: Traffic Pattern Analysis
**Use Case**: Focus on critical intersections or bottlenecks

```javascript
const trafficAnalyzer = new AttentionEnhancedELM({
  categories: ['flowing', 'moderate', 'congested'],
  attentionUnits: 192
});

// Analyze city-wide traffic data
const trafficFeatures = getTrafficSensorData();
const status = trafficAnalyzer.predict(trafficFeatures, 1);

// Attention mechanism identifies problem areas
if (status[0].label === 'congested') {
  const problemAreas = getAttentionRegions(trafficFeatures);
  dispatchTrafficControl(problemAreas);
}
```

---

## 5. Variational ELM

### Finance: Risk Assessment with Uncertainty
**Use Case**: Quantify uncertainty in investment decisions

```javascript
import { VariationalELM } from '@astermind/astermind-community';

const riskAnalyzer = new VariationalELM({
  categories: ['low_risk', 'medium_risk', 'high_risk']
});

// Assess investment opportunity
const investmentFeatures = [marketVolatility, companyMetrics, economicIndicators];
const assessment = riskAnalyzer.predict(investmentFeatures, 3, true); // Include uncertainty

// Returns: [
//   { 
//     label: 'medium_risk', 
//     prob: 0.75, 
//     uncertainty: 0.15,  // 15% uncertainty
//     confidence: 0.85    // 85% confidence
//   },
//   ...
// ]

if (assessment[0].uncertainty > 0.20) {
  console.log('High uncertainty - gather more data before decision');
} else if (assessment[0].confidence > 0.90) {
  proceedWithInvestment();
}
```

### Healthcare: Diagnostic Confidence
**Use Case**: Provide confidence levels for medical diagnoses

```javascript
const diagnosticSystem = new VariationalELM({
  categories: ['healthy', 'monitoring', 'treatment_needed']
});

// Patient test results
const testResults = [bloodPressure, heartRate, labResults];
const diagnosis = diagnosticSystem.predict(testResults, 3, true);

if (diagnosis[0].uncertainty < 0.10 && diagnosis[0].confidence > 0.95) {
  // High confidence - proceed with treatment
  prescribeTreatment(diagnosis[0].label);
} else {
  // Low confidence - order additional tests
  orderAdditionalTests();
}
```

### Science: Experimental Result Analysis
**Use Case**: Quantify uncertainty in scientific measurements

```javascript
const experimentAnalyzer = new VariationalELM({
  categories: ['significant', 'inconclusive', 'insignificant']
});

// Analyze experimental data
const experimentalData = [measurements, controls, replicates];
const result = experimentAnalyzer.predict(experimentalData, 1, true);

if (result[0].label === 'significant' && result[0].uncertainty < 0.05) {
  publishResults(result);
} else {
  runAdditionalExperiments();
}
```

---

## 6. Time-Series ELM

### Finance: Stock Price Forecasting
**Use Case**: Predict future stock prices from historical sequences

```javascript
import { TimeSeriesELM } from '@astermind/astermind-community';

const stockForecaster = new TimeSeriesELM({
  categories: ['bullish', 'neutral', 'bearish'],
  sequenceLength: 30 // 30 days of history
});

// Prepare sequences: each sequence is 30 days of price data
const priceSequences = [];
for (let i = 0; i < historicalData.length - 30; i++) {
  const sequence = historicalData.slice(i, i + 30).map(day => [
    day.open, day.high, day.low, day.close, day.volume
  ]);
  priceSequences.push(sequence);
}

const labels = historicalData.slice(30).map(day => 
  day.close > day.open ? 0 : 2 // 0=bullish, 2=bearish
);

stockForecaster.train(priceSequences, labels);

// Predict next day movement
const recentSequence = getLast30Days();
const prediction = stockForecaster.predict(recentSequence, 1);
```

### Transportation: Predictive Maintenance
**Use Case**: Predict equipment failures from sensor time-series

```javascript
const maintenancePredictor = new TimeSeriesELM({
  categories: ['normal', 'maintenance_needed', 'failure_imminent'],
  sequenceLength: 24 // 24 hours of sensor data
});

// Train on historical sensor sequences
const sensorSequences = getHistoricalSensorData(); // Each sequence is 24 hours
const failureLabels = getHistoricalFailureData();

maintenancePredictor.train(sensorSequences, failureLabels);

// Monitor equipment in real-time
function monitorEquipment(equipmentId) {
  const last24Hours = getSensorData(equipmentId, 24);
  const prediction = maintenancePredictor.predict(last24Hours, 1);
  
  if (prediction[0].label === 'failure_imminent') {
    scheduleEmergencyMaintenance(equipmentId);
  }
}
```

### Healthcare: Patient Vital Monitoring
**Use Case**: Predict patient deterioration from vital sign sequences

```javascript
const vitalMonitor = new TimeSeriesELM({
  categories: ['stable', 'deteriorating', 'critical'],
  sequenceLength: 12 // 12 hours of vital signs
});

// Monitor ICU patient
function monitorPatient(patientId) {
  const vitalSequence = getVitalSigns(patientId, 12); // Last 12 hours
  const prediction = vitalMonitor.predict(vitalSequence, 1);
  
  if (prediction[0].label === 'deteriorating') {
    alertMedicalStaff(patientId);
  }
}
```

---

## 7. Transfer Learning ELM

### Science: Cross-Domain Research
**Use Case**: Apply knowledge from one research domain to another

```javascript
import { TransferLearningELM } from '@astermind/astermind-community';

// Pre-trained on protein folding data
const proteinModel = new TransferLearningELM({
  categories: ['folded', 'unfolded', 'misfolded'],
  transferRate: 0.4 // 40% knowledge transfer
});

// Transfer to drug interaction prediction
const drugInteractionModel = new TransferLearningELM({
  categories: ['safe', 'caution', 'dangerous'],
  transferRate: 0.3 // Less transfer for different domain
});

// Use pre-trained knowledge from protein model
drugInteractionModel.transferFrom(proteinModel);
drugInteractionModel.train(drugData, interactionLabels);
```

### Finance: Cross-Market Analysis
**Use Case**: Transfer knowledge from one market to another

```javascript
// Trained on US stock market
const usMarketModel = new TransferLearningELM({
  categories: ['buy', 'hold', 'sell'],
  transferRate: 0.5
});

// Transfer to European market
const europeanMarketModel = new TransferLearningELM({
  categories: ['buy', 'hold', 'sell'],
  transferRate: 0.5
});

europeanMarketModel.transferFrom(usMarketModel);
europeanMarketModel.train(europeanMarketData, europeanLabels);
```

### Healthcare: Cross-Population Medical Models
**Use Case**: Adapt medical models across different patient populations

```javascript
// Trained on adult patient data
const adultModel = new TransferLearningELM({
  categories: ['healthy', 'at_risk', 'disease'],
  transferRate: 0.3
});

// Transfer to pediatric population
const pediatricModel = new TransferLearningELM({
  categories: ['healthy', 'at_risk', 'disease'],
  transferRate: 0.3
});

pediatricModel.transferFrom(adultModel);
pediatricModel.train(pediatricData, pediatricLabels);
```

---

## 8. Graph ELM

### Science: Molecular Structure Analysis
**Use Case**: Analyze chemical compounds represented as graphs

```javascript
import { GraphELM } from '@astermind/astermind-community';

const molecularAnalyzer = new GraphELM({
  categories: ['active', 'inactive', 'toxic']
});

// Represent molecule as graph
const molecule = {
  nodes: [
    { id: 'C1', features: [6, 1, 0] }, // Carbon atom features
    { id: 'O1', features: [8, 2, 0] }, // Oxygen atom features
    { id: 'N1', features: [7, 3, 0] }  // Nitrogen atom features
  ],
  edges: [
    { source: 'C1', target: 'O1' }, // Chemical bond
    { source: 'C1', target: 'N1' }
  ]
};

const activity = molecularAnalyzer.predict(molecule, 1);
// Predicts if molecule is biologically active
```

### Transportation: Network Route Analysis
**Use Case**: Analyze transportation networks as graphs

```javascript
const routeAnalyzer = new GraphELM({
  categories: ['efficient', 'moderate', 'inefficient']
});

// Represent city as graph
const cityNetwork = {
  nodes: [
    { id: 'intersection1', features: [trafficVolume, signalTiming] },
    { id: 'intersection2', features: [trafficVolume, signalTiming] }
  ],
  edges: [
    { source: 'intersection1', target: 'intersection2' } // Road connection
  ]
};

const efficiency = routeAnalyzer.predict(cityNetwork, 1);
```

### Logistics: Supply Chain Network
**Use Case**: Analyze supply chain relationships

```javascript
const supplyChainAnalyzer = new GraphELM({
  categories: ['resilient', 'vulnerable', 'critical']
});

// Represent supply chain as graph
const supplyChain = {
  nodes: [
    { id: 'supplier1', features: [capacity, reliability, cost] },
    { id: 'warehouse1', features: [inventory, throughput] },
    { id: 'retailer1', features: [demand, location] }
  ],
  edges: [
    { source: 'supplier1', target: 'warehouse1' },
    { source: 'warehouse1', target: 'retailer1' }
  ]
};

const resilience = supplyChainAnalyzer.predict(supplyChain, 1);
```

---

## 9. Adaptive Kernel ELM

### Finance: Dynamic Market Analysis
**Use Case**: Automatically adapt kernel parameters for different market conditions

```javascript
import { AdaptiveKernelELM } from '@astermind/astermind-community';

const marketAnalyzer = new AdaptiveKernelELM({
  categories: ['bull', 'bear', 'volatile'],
  kernelType: 'rbf' // Automatically optimizes RBF parameters
});

// Adapts kernel parameters based on market volatility
marketAnalyzer.train(marketData, marketLabels);

// Automatically selects optimal kernel parameters for current conditions
const prediction = marketAnalyzer.predict(currentMarketData, 1);
```

### Science: Experimental Data Analysis
**Use Case**: Adapt to different experimental conditions

```javascript
const experimentAnalyzer = new AdaptiveKernelELM({
  categories: ['success', 'partial', 'failure'],
  kernelType: 'polynomial'
});

// Automatically adapts to different experimental setups
experimentAnalyzer.train(experimentalData, experimentalResults);
```

### Healthcare: Patient Population Adaptation
**Use Case**: Adapt to different patient demographics

```javascript
const patientAnalyzer = new AdaptiveKernelELM({
  categories: ['low_risk', 'medium_risk', 'high_risk'],
  kernelType: 'rbf'
});

// Automatically adapts kernel for different age groups, conditions
patientAnalyzer.train(patientData, riskLabels);
```

---

## 10. Sparse Kernel ELM

### Finance: Large-Scale Portfolio Analysis
**Use Case**: Efficiently analyze thousands of assets using landmark points

```javascript
import { SparseKernelELM } from '@astermind/astermind-community';

const portfolioAnalyzer = new SparseKernelELM({
  categories: ['diversified', 'concentrated', 'risky'],
  numLandmarks: 100 // Use 100 landmark points instead of all assets
});

// Analyze portfolio of 10,000 assets efficiently
const portfolioFeatures = getPortfolioData(10000);
portfolioAnalyzer.train(portfolioFeatures, portfolioLabels);

// Fast prediction using only landmark points
const risk = portfolioAnalyzer.predict(newPortfolio, 1);
```

### Logistics: Large Warehouse Optimization
**Use Case**: Optimize inventory across thousands of SKUs

```javascript
const inventoryOptimizer = new SparseKernelELM({
  categories: ['optimal', 'overstock', 'understock'],
  numLandmarks: 200
});

// Efficiently analyze 50,000 SKUs
const skuData = getInventoryData(50000);
inventoryOptimizer.train(skuData, stockLevels);
```

### Science: Large Dataset Analysis
**Use Case**: Analyze massive experimental datasets

```javascript
const dataAnalyzer = new SparseKernelELM({
  categories: ['significant', 'insignificant'],
  numLandmarks: 500
});

// Analyze millions of data points efficiently
const experimentalData = getLargeDataset(1000000);
dataAnalyzer.train(experimentalData, significanceLabels);
```

---

## 11. Ensemble Kernel ELM

### Finance: Robust Investment Decisions
**Use Case**: Combine multiple models for reliable predictions

```javascript
import { EnsembleKernelELM } from '@astermind/astermind-community';

const investmentAdvisor = new EnsembleKernelELM({
  categories: ['buy', 'hold', 'sell'],
  numModels: 5 // 5 ensemble members
});

investmentAdvisor.train(marketData, investmentLabels);

const recommendation = investmentAdvisor.predict(currentMarket, 1);
// Returns: { label: 'buy', prob: 0.85, votes: 4 } // 4 out of 5 models agree

if (recommendation.votes >= 4) {
  // High agreement - proceed with confidence
  executeTrade(recommendation.label);
} else {
  // Low agreement - wait for more consensus
  waitForMoreData();
}
```

### Healthcare: Diagnostic Consensus
**Use Case**: Multiple models agree on diagnosis

```javascript
const diagnosticEnsemble = new EnsembleKernelELM({
  categories: ['healthy', 'disease_a', 'disease_b'],
  numModels: 7
});

const diagnosis = diagnosticEnsemble.predict(patientData, 1);

if (diagnosis.votes >= 6) {
  // Strong consensus - high confidence diagnosis
  proceedWithTreatment(diagnosis.label);
} else {
  // Weak consensus - order additional tests
  orderSecondOpinion();
}
```

### Transportation: Route Reliability
**Use Case**: Multiple models predict route efficiency

```javascript
const routeEnsemble = new EnsembleKernelELM({
  categories: ['fast', 'moderate', 'slow'],
  numModels: 3
});

const routePrediction = routeEnsemble.predict(routeData, 1);

if (routePrediction.votes === 3) {
  // All models agree - high confidence
  recommendRoute(routePrediction.label);
}
```

---

## 12. Deep Kernel ELM

### Science: Complex Pattern Recognition
**Use Case**: Multi-layer transformations for complex scientific data

```javascript
import { DeepKernelELM } from '@astermind/astermind-community';

const patternRecognizer = new DeepKernelELM({
  categories: ['pattern_a', 'pattern_b', 'pattern_c'],
  numLayers: 4 // 4-layer deep kernel transformation
});

// Analyze complex scientific patterns
patternRecognizer.train(complexData, patternLabels);

// Deep layers extract hierarchical features
const pattern = patternRecognizer.predict(newData, 1);
```

### Finance: Multi-Level Market Analysis
**Use Case**: Deep analysis of market structures

```javascript
const marketAnalyzer = new DeepKernelELM({
  categories: ['trending_up', 'trending_down', 'sideways'],
  numLayers: 3
});

// Deep layers capture market microstructure
marketAnalyzer.train(marketData, trendLabels);
```

### Healthcare: Multi-Scale Medical Analysis
**Use Case**: Analyze medical data at multiple scales

```javascript
const medicalAnalyzer = new DeepKernelELM({
  categories: ['normal', 'abnormal', 'critical'],
  numLayers: 5
});

// Deep layers capture features from cellular to organ level
medicalAnalyzer.train(medicalData, diagnosisLabels);
```

---

## 13. Robust Kernel ELM

### Finance: Fraud Detection with Outlier Handling
**Use Case**: Detect fraud while handling noisy transaction data

```javascript
import { RobustKernelELM } from '@astermind/astermind-community';

const fraudDetector = new RobustKernelELM({
  categories: ['legitimate', 'fraud'],
  outlierThreshold: 0.1
});

fraudDetector.train(transactionData, fraudLabels);

const analysis = fraudDetector.predict(transaction, 1);
// Returns: { label: 'fraud', prob: 0.92, isOutlier: false }

if (analysis.isOutlier) {
  // Transaction is statistical outlier - investigate
  flagForManualReview(transaction);
} else if (analysis.label === 'fraud') {
  // Confident fraud detection
  blockTransaction(transaction);
}
```

### Science: Experimental Data with Noise
**Use Case**: Handle noisy experimental measurements

```javascript
const experimentAnalyzer = new RobustKernelELM({
  categories: ['significant', 'insignificant'],
  outlierThreshold: 0.15
});

const result = experimentAnalyzer.predict(measurement, 1);

if (result.isOutlier) {
  // Measurement may be contaminated - repeat experiment
  repeatMeasurement();
}
```

### Healthcare: Patient Monitoring with Sensor Noise
**Use Case**: Handle noisy medical sensor data

```javascript
const vitalMonitor = new RobustKernelELM({
  categories: ['normal', 'abnormal'],
  outlierThreshold: 0.12
});

const reading = vitalMonitor.predict(sensorData, 1);

if (reading.isOutlier) {
  // Sensor may be malfunctioning - check equipment
  checkSensorCalibration();
}
```

---

## 14. ELM-KELM Cascade

### Finance: Multi-Stage Risk Assessment
**Use Case**: First ELM stage, then Kernel ELM refinement

```javascript
import { ELMKELMCascade } from '@astermind/astermind-community';

const riskAssessor = new ELMKELMCascade({
  categories: ['low_risk', 'medium_risk', 'high_risk']
});

// ELM stage: Quick initial assessment
// KELM stage: Refined analysis for complex cases
riskAssessor.train(loanApplications, riskLabels);

const assessment = riskAssessor.predict(application, 1);
```

### Healthcare: Two-Stage Diagnosis
**Use Case**: Quick screening, then detailed analysis

```javascript
const diagnosticCascade = new ELMKELMCascade({
  categories: ['healthy', 'monitoring', 'treatment']
});

// ELM: Fast initial screening
// KELM: Detailed analysis for flagged cases
diagnosticCascade.train(patientData, diagnosisLabels);
```

### Transportation: Route Optimization Cascade
**Use Case**: Quick route selection, then detailed optimization

```javascript
const routeOptimizer = new ELMKELMCascade({
  categories: ['optimal', 'suboptimal', 'poor']
});

// ELM: Quick route filtering
// KELM: Detailed optimization
routeOptimizer.train(routeData, efficiencyLabels);
```

---

## 15. String Kernel ELM

### Finance: Document Classification
**Use Case**: Classify financial documents by content

```javascript
import { StringKernelELM } from '@astermind/astermind-community';

const documentClassifier = new StringKernelELM({
  categories: ['approved', 'needs_review', 'rejected']
});

// Train on financial documents
const documents = [
  'Loan application for $500,000...',
  'Credit report shows excellent history...',
  'Bankruptcy filing from 2020...'
];
const labels = [1, 0, 2]; // needs_review, approved, rejected

documentClassifier.train(documents, labels);

// Classify new document
const newDocument = 'Mortgage application with 750 credit score...';
const classification = documentClassifier.predict([newDocument], 1);
```

### Healthcare: Medical Record Analysis
**Use Case**: Analyze patient notes and medical records

```javascript
const medicalRecordAnalyzer = new StringKernelELM({
  categories: ['routine', 'urgent', 'critical']
});

const records = [
  'Patient presents with mild symptoms...',
  'Patient reports severe chest pain...',
  'Routine checkup, all vitals normal...'
];
const labels = [0, 2, 0]; // routine, critical, routine

medicalRecordAnalyzer.train(records, labels);

// Analyze new patient note
const newNote = 'Patient reports difficulty breathing...';
const priority = medicalRecordAnalyzer.predict([newNote], 1);
```

### Logistics: Shipping Label Classification
**Use Case**: Classify shipping labels and addresses

```javascript
const shippingClassifier = new StringKernelELM({
  categories: ['domestic', 'international', 'express']
});

const labels = [
  '123 Main St, New York, NY 10001',
  '45 High Street, London, UK',
  '789 Oak Ave, Los Angeles, CA 90001 - EXPRESS'
];
const categories = [0, 1, 2]; // domestic, international, express

shippingClassifier.train(labels, categories);
```

---

## 16. Convolutional ELM

### Healthcare: Medical Image Analysis
**Use Case**: Analyze X-rays, MRIs, CT scans

```javascript
import { ConvolutionalELM } from '@astermind/astermind-community';

const medicalImageAnalyzer = new ConvolutionalELM({
  categories: ['normal', 'benign', 'malignant'],
  filterSize: 3,
  numFilters: 32
});

// Images: 2D arrays representing medical images
const images = [
  [[pixel values...], [pixel values...]], // X-ray 1
  [[pixel values...], [pixel values...]]  // X-ray 2
];
const labels = [0, 1]; // normal, benign

medicalImageAnalyzer.train(images, labels);

// Analyze new X-ray
const newXray = [[pixel values...]];
const diagnosis = medicalImageAnalyzer.predict(newXray, 1);
```

### Transportation: Traffic Sign Recognition
**Use Case**: Recognize traffic signs from images

```javascript
const signRecognizer = new ConvolutionalELM({
  categories: ['stop', 'yield', 'speed_limit', 'no_entry'],
  filterSize: 5,
  numFilters: 16
});

// Train on traffic sign images
signRecognizer.train(signImages, signLabels);

// Recognize sign from camera
const cameraImage = getCameraImage();
const sign = signRecognizer.predict(cameraImage, 1);
```

### Science: Satellite Image Analysis
**Use Case**: Analyze satellite imagery for environmental monitoring

```javascript
const satelliteAnalyzer = new ConvolutionalELM({
  categories: ['forest', 'urban', 'water', 'agriculture'],
  filterSize: 7,
  numFilters: 64
});

// Analyze land use from satellite images
satelliteAnalyzer.train(satelliteImages, landUseLabels);
```

---

## 17. Recurrent ELM

### Finance: Sequential Trading Patterns
**Use Case**: Analyze sequential trading data with memory

```javascript
import { RecurrentELM } from '@astermind/astermind-community';

const tradingAnalyzer = new RecurrentELM({
  categories: ['buy_signal', 'sell_signal', 'hold'],
  hiddenSize: 128
});

// Sequences: Each sequence is a series of trading periods
const tradingSequences = [
  [[price1, volume1], [price2, volume2], [price3, volume3]], // Sequence 1
  [[price4, volume4], [price5, volume5], [price6, volume6]]  // Sequence 2
];
const labels = [0, 1]; // buy_signal, sell_signal

tradingAnalyzer.train(tradingSequences, labels);

// Predict next action from recent sequence
const recentSequence = getLastTradingPeriods(10);
const action = tradingAnalyzer.predict(recentSequence, 1);
// Returns: { label: 'buy_signal', prob: 0.88, hiddenState: [...] }
```

### Healthcare: Patient Monitoring Sequences
**Use Case**: Track patient condition over time with memory

```javascript
const patientMonitor = new RecurrentELM({
  categories: ['stable', 'improving', 'deteriorating'],
  hiddenSize: 64
});

// Sequences: Hourly vital sign readings
const vitalSequences = [
  [[bp1, hr1, temp1], [bp2, hr2, temp2], ...], // Patient 1
  [[bp3, hr3, temp3], [bp4, hr4, temp4], ...]  // Patient 2
];

patientMonitor.train(vitalSequences, patientOutcomes);

// Monitor current patient
const currentSequence = getLastHours(12);
const status = patientMonitor.predict(currentSequence, 1);
```

### Transportation: Route Sequence Analysis
**Use Case**: Analyze route efficiency over time

```javascript
const routeAnalyzer = new RecurrentELM({
  categories: ['efficient', 'moderate', 'inefficient'],
  hiddenSize: 96
});

// Sequences: Hourly route performance
const routeSequences = [
  [[traffic1, time1], [traffic2, time2], ...], // Route A
  [[traffic3, time3], [traffic4, time4], ...]  // Route B
];

routeAnalyzer.train(routeSequences, efficiencyLabels);
```

---

## 18. Fuzzy ELM

### Finance: Credit Scoring with Membership
**Use Case**: Flexible credit assessment with membership degrees

```javascript
import { FuzzyELM } from '@astermind/astermind-community';

const creditScorer = new FuzzyELM({
  categories: ['excellent', 'good', 'fair', 'poor']
});

creditScorer.train(creditData, creditScores);

const assessment = creditScorer.predict(applicantData, 1);
// Returns: {
//   label: 'good',
//   prob: 0.75,
//   membership: 0.82,  // 82% membership in 'good' category
//   confidence: 0.88
// }

if (assessment.membership > 0.80) {
  // High membership - clear category
  approveLoan(assessment.label);
} else {
  // Low membership - borderline case, manual review
  manualReview(applicantData);
}
```

### Healthcare: Symptom Severity Assessment
**Use Case**: Assess symptom severity with fuzzy boundaries

```javascript
const symptomAnalyzer = new FuzzyELM({
  categories: ['mild', 'moderate', 'severe']
});

const assessment = symptomAnalyzer.predict(symptomData, 1);

if (assessment.membership < 0.60) {
  // Symptoms don't clearly fit one category - investigate further
  orderAdditionalTests();
}
```

### Logistics: Delivery Time Estimation
**Use Case**: Estimate delivery times with uncertainty

```javascript
const deliveryEstimator = new FuzzyELM({
  categories: ['on_time', 'delayed', 'severely_delayed']
});

const estimate = deliveryEstimator.predict(deliveryData, 1);

if (estimate.membership > 0.85) {
  // High confidence in estimate
  notifyCustomer(estimate.label);
}
```

---

## 19. Quantum-Inspired ELM

### Science: Quantum Chemistry Simulations
**Use Case**: Model quantum states in molecular systems

```javascript
import { QuantumInspiredELM } from '@astermind/astermind-community';

const quantumAnalyzer = new QuantumInspiredELM({
  categories: ['stable', 'unstable', 'transition'],
  numQubits: 16
});

quantumAnalyzer.train(molecularData, stabilityLabels);

const prediction = quantumAnalyzer.predict(molecule, 1);
// Returns: {
//   label: 'stable',
//   prob: 0.92,
//   quantumState: [complex amplitudes...],
//   amplitude: 0.96
// }

// Use quantum state for further quantum computations
const quantumState = prediction.quantumState;
```

### Finance: Portfolio Optimization
**Use Case**: Use quantum principles for portfolio selection

```javascript
const portfolioOptimizer = new QuantumInspiredELM({
  categories: ['optimal', 'suboptimal'],
  numQubits: 32
});

// Quantum superposition explores multiple portfolio combinations
const portfolio = portfolioOptimizer.predict(assetData, 1);
```

### Science: Protein Folding Prediction
**Use Case**: Model quantum effects in protein structures

```javascript
const proteinFolding = new QuantumInspiredELM({
  categories: ['folded', 'unfolded', 'misfolded'],
  numQubits: 24
});

// Quantum effects important at molecular scale
proteinFolding.train(proteinData, foldingStates);
```

---

## 20. Graph Kernel ELM

### Science: Molecular Interaction Networks
**Use Case**: Analyze complex molecular interaction graphs

```javascript
import { GraphKernelELM } from '@astermind/astermind-community';

const interactionAnalyzer = new GraphKernelELM({
  categories: ['strong_interaction', 'weak_interaction', 'no_interaction']
});

// Represent molecular interaction network
const interactionGraph = {
  nodes: [
    { id: 'protein1', features: [molecularWeight, charge] },
    { id: 'protein2', features: [molecularWeight, charge] },
    { id: 'ligand1', features: [bindingAffinity] }
  ],
  edges: [
    { source: 'protein1', target: 'protein2' },
    { source: 'ligand1', target: 'protein1' }
  ]
};

const interaction = interactionAnalyzer.predict(interactionGraph, 1);
```

### Transportation: Transportation Network Analysis
**Use Case**: Analyze complex transportation networks

```javascript
const networkAnalyzer = new GraphKernelELM({
  categories: ['efficient', 'moderate', 'inefficient']
});

// City transportation network
const cityNetwork = {
  nodes: [
    { id: 'station1', features: [passengerVolume, connections] },
    { id: 'station2', features: [passengerVolume, connections] }
  ],
  edges: [
    { source: 'station1', target: 'station2' }
  ]
};

const efficiency = networkAnalyzer.predict(cityNetwork, 1);
```

### Logistics: Supply Chain Network Resilience
**Use Case**: Analyze supply chain resilience

```javascript
const resilienceAnalyzer = new GraphKernelELM({
  categories: ['resilient', 'vulnerable', 'critical']
});

// Supply chain as graph
const supplyChain = {
  nodes: [
    { id: 'factory1', features: [capacity, reliability] },
    { id: 'warehouse1', features: [inventory, location] }
  ],
  edges: [
    { source: 'factory1', target: 'warehouse1' }
  ]
};

const resilience = resilienceAnalyzer.predict(supplyChain, 1);
```

---

## 21. Tensor Kernel ELM

### Science: Multi-Channel Experimental Data
**Use Case**: Analyze 3D tensor data from multi-channel experiments

```javascript
import { TensorKernelELM } from '@astermind/astermind-community';

const experimentAnalyzer = new TensorKernelELM({
  categories: ['significant', 'insignificant']
});

// Tensors: 3D data from multi-channel experiments
// Each tensor has multiple channels (e.g., different sensors)
const experimentalTensors = [
  [
    [[sensor1_ch1], [sensor1_ch2]], // Channel 1 data
    [[sensor2_ch1], [sensor2_ch2]]  // Channel 2 data
  ]
];

experimentAnalyzer.train(experimentalTensors, significanceLabels);

// Analyze new experiment
const newTensor = [
  [[new_sensor1_ch1], [new_sensor1_ch2]],
  [[new_sensor2_ch1], [new_sensor2_ch2]]
];
const result = experimentAnalyzer.predict(newTensor, 1);
```

### Healthcare: Multi-Modal Medical Imaging
**Use Case**: Analyze 3D medical imaging data (CT, MRI with multiple slices)

```javascript
const medicalImagingAnalyzer = new TensorKernelELM({
  categories: ['normal', 'abnormal', 'tumor']
});

// 3D tensor: Multiple imaging slices/channels
const imagingTensor = [
  [
    [[slice1_pixels...], [slice1_pixels...]], // Slice 1
    [[slice2_pixels...], [slice2_pixels...]]  // Slice 2
  ]
];

medicalImagingAnalyzer.train(imagingTensors, diagnosisLabels);

// Analyze new patient scan
const patientScan = getCTScan();
const diagnosis = medicalImagingAnalyzer.predict(patientScan, 1);
```

### Transportation: Multi-Sensor Vehicle Data
**Use Case**: Analyze data from multiple vehicle sensors simultaneously

```javascript
const vehicleAnalyzer = new TensorKernelELM({
  categories: ['normal', 'maintenance_needed', 'failure']
});

// 3D tensor: Multiple sensors over time
const vehicleTensor = [
  [
    [[sensor1_time1], [sensor1_time2]], // Sensor 1 over time
    [[sensor2_time1], [sensor2_time2]], // Sensor 2 over time
    [[sensor3_time1], [sensor3_time2]]  // Sensor 3 over time
  ]
];

vehicleAnalyzer.train(vehicleTensors, maintenanceLabels);

// Monitor vehicle in real-time
const currentTensor = getCurrentSensorData();
const status = vehicleAnalyzer.predict(currentTensor, 1);
```

---

## Industry-Specific Use Case Matrix

| Industry | Variant | Primary Use Case |
|----------|---------|------------------|
| **Finance** | Adaptive Online ELM | Real-time fraud detection |
| **Finance** | Variational ELM | Risk assessment with uncertainty |
| **Finance** | Ensemble Kernel ELM | Investment decision consensus |
| **Finance** | Robust Kernel ELM | Fraud detection with noisy data |
| **Finance** | String Kernel ELM | Document classification |
| **Healthcare** | Hierarchical ELM | Multi-level diagnosis |
| **Healthcare** | Attention-Enhanced ELM | Medical image analysis |
| **Healthcare** | Time-Series ELM | Patient vital monitoring |
| **Healthcare** | Recurrent ELM | Sequential patient data |
| **Healthcare** | Convolutional ELM | Medical imaging (X-ray, MRI) |
| **Healthcare** | Tensor Kernel ELM | Multi-modal medical imaging |
| **Transportation** | Adaptive Online ELM | Dynamic route optimization |
| **Transportation** | Time-Series ELM | Predictive maintenance |
| **Transportation** | Graph ELM | Network route analysis |
| **Transportation** | Convolutional ELM | Traffic sign recognition |
| **Transportation** | Recurrent ELM | Route sequence analysis |
| **Logistics** | Forgetting Online ELM | Warehouse inventory management |
| **Logistics** | Sparse Kernel ELM | Large warehouse optimization |
| **Logistics** | Graph ELM | Supply chain network analysis |
| **Logistics** | String Kernel ELM | Shipping label classification |
| **Science** | Hierarchical ELM | Biological classification |
| **Science** | Transfer Learning ELM | Cross-domain research |
| **Science** | Graph Kernel ELM | Molecular interaction networks |
| **Science** | Quantum-Inspired ELM | Quantum chemistry simulations |
| **Science** | Tensor Kernel ELM | Multi-channel experimental data |

---

## Getting Started with Examples

1. **Choose your variant** based on your use case
2. **Install Community**: `npm install @astermind/astermind-community`
3. **Set up license**: `export ASTERMIND_LICENSE_TOKEN="your-token"`
4. **Import the variant** you need
5. **Prepare your data** in the required format
6. **Train the model** on your data
7. **Make predictions** on new data

For more detailed examples, see the [main documentation](./README.md).

---

**Last Updated**: November 24, 2025






