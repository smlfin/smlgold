// Global object to hold the currently selected scheme's data (Default values match 75% LTV Scheme)
let currentScheme = {
    id: '75',
    name: '75% LTV Scheme',
    totalLTV: 75,
    plPercentage: 0,
    glInterestRate: 17,
    plInterestRate: 0 
};

/**
 * Formats a number as an Indian currency string (₹).
 * @param {number} amount - The amount to format.
 * @returns {string} The formatted currency string.
 */
function formatCurrency(amount) {
    if (isNaN(amount) || amount === null || amount < 0) return '₹ 0.00';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount);
}

/**
 * Handles scheme button selection and updates the currentScheme object.
 * @param {HTMLElement} selectedButton - The button element that was clicked.
 */
function selectScheme(selectedButton) {
    // Deselect all buttons
    document.querySelectorAll('.scheme-button').forEach(button => button.classList.remove('selected'));
    selectedButton.classList.add('selected');

    // Update the global scheme object from the button's data attributes
    currentScheme.id = selectedButton.dataset.scheme;
    currentScheme.name = selectedButton.dataset.name;
    currentScheme.totalLTV = parseInt(selectedButton.dataset.ltv, 10);
    currentScheme.plPercentage = parseInt(selectedButton.dataset.pl, 10);
    currentScheme.glInterestRate = parseFloat(selectedButton.dataset.glRate); 
    currentScheme.plInterestRate = parseFloat(selectedButton.dataset.plRate);
    
    calculateEligibility(); 
}

/**
 * Main function to calculate and display gold loan eligibility.
 */
function calculateEligibility() {
    // 1. Get user inputs
    const weight = parseFloat(document.getElementById('goldWeight').value);
    const marketRate = parseFloat(document.getElementById('marketRate').value);
    
    // 1b. Get reference to the new PL percentage display span
    const plPercentageDisplayElement = document.getElementById('plPercentageDisplay');
    
    // Get element references
    const glAmountElement = document.getElementById('glAmount');
    const plAmountElement = document.getElementById('plAmount');
    const monthlyGlInterestElement = document.getElementById('monthlyGlInterest');
    const monthlyPlInterestElement = document.getElementById('monthlyPlInterest');
    
    const resultElements = {
        selectedScheme: document.getElementById('selectedScheme'),
        glRateDisplay: document.getElementById('glRateDisplay'),
        plRateDisplay: document.getElementById('plRateDisplay'),
        totalLTV: document.getElementById('totalLTV'),
        eligibleAmount: document.getElementById('eligibleAmount'),
        monthlyInterest: document.getElementById('monthlyInterest'),
    };

    // Update display for scheme and rates
    resultElements.selectedScheme.textContent = currentScheme.name;
    resultElements.glRateDisplay.textContent = `${currentScheme.glInterestRate}%`;
    resultElements.plRateDisplay.textContent = `${currentScheme.plInterestRate}%`;

    // --- Update Dynamic PL Percentage Display ---
    if (currentScheme.plPercentage > 0) {
        plPercentageDisplayElement.textContent = `${currentScheme.plPercentage}%`;
    } else {
        // When PL is 0%, default to the original 'PL' label
        plPercentageDisplayElement.textContent = 'PL';
    }
    // -------------------------------------------

    // Check for valid financial inputs
    if (!isFinite(weight) || weight <= 0 || !isFinite(marketRate) || marketRate <= 0) {
        // Reset financial results to zero
        const zero = formatCurrency(0);
        glAmountElement.textContent = zero;
        
        // --- Reset PL Elements to default zero state ---
        plAmountElement.textContent = zero;
        plAmountElement.style.fontSize = ''; // Reset custom style
        plAmountElement.style.color = ''; // Reset custom style
        
        resultElements.totalLTV.textContent = `${currentScheme.totalLTV}%`;
        resultElements.eligibleAmount.textContent = zero;
        resultElements.monthlyInterest.textContent = zero;
        monthlyGlInterestElement.textContent = zero; 
        monthlyPlInterestElement.textContent = zero; 
        return;
    }

    // 2. Calculate Principal Loan Components
    const goldValue = weight * marketRate;
    const glAmount = goldValue * 0.75; 
    const plAmount = goldValue * (currentScheme.plPercentage / 100);
    const eligibleAmount = glAmount + plAmount;

    // 3. Calculate Monthly Interest Split
    const glRateDecimal = currentScheme.glInterestRate / 100;
    const plRateDecimal = currentScheme.plInterestRate / 100;
    
    // Monthly Interest Calculation (Principal * Annual Rate / 12)
    const glMonthlyInterest = glAmount * (glRateDecimal / 12);
    const plMonthlyInterest = plAmount * (plRateDecimal / 12);
    
    const monthlyInterest = glMonthlyInterest + plMonthlyInterest;
    
    // 4. Display Results
    
    // --- CONDITIONAL PL DISPLAY LOGIC ---
    if (plAmount === 0) {
        // PL amount: Display custom text and set style for emphasis
        plAmountElement.textContent = 'NO PL option for this scheme';
        plAmountElement.style.fontSize = '1em'; 
        plAmountElement.style.color = '#d9534f'; 
        
        // Monthly PL Interest: Display N/A
        monthlyPlInterestElement.textContent = 'N/A';
        
    } else {
        // PL amount: Display formatted currency and reset styling
        plAmountElement.textContent = formatCurrency(plAmount);
        plAmountElement.style.fontSize = ''; // Use CSS default/class style
        plAmountElement.style.color = ''; // Use CSS default/class style
        
        // Monthly PL Interest: Display formatted currency
        monthlyPlInterestElement.textContent = formatCurrency(plMonthlyInterest);
    }
    // --- END CONDITIONAL PL DISPLAY LOGIC ---

    glAmountElement.textContent = formatCurrency(glAmount);
    resultElements.totalLTV.textContent = `${currentScheme.totalLTV}%`;
    resultElements.eligibleAmount.textContent = formatCurrency(eligibleAmount);
    
    // Display GL Interest (always a value)
    monthlyGlInterestElement.textContent = formatCurrency(glMonthlyInterest);

    // Display Total Monthly Interest
    resultElements.monthlyInterest.textContent = formatCurrency(monthlyInterest);
}

// 5. Initialization and Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Get all input elements
    const inputs = ['goldWeight', 'marketRate'].map(id => document.getElementById(id));
    const schemeButtons = document.querySelectorAll('.scheme-button');

    // Bind inputs to the calculation function for dynamic updates
    inputs.forEach(input => input.addEventListener('input', calculateEligibility));
    
    // Bind all scheme buttons to the selectScheme function
    schemeButtons.forEach(button => {
        button.addEventListener('click', () => selectScheme(button));
    });

    // Initial state cleanup (clearing inputs)
    document.getElementById('goldWeight').value = '';
    document.getElementById('marketRate').value = '';

    // Run the initial calculation 
    calculateEligibility();
});<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SML Group Loan Calculator</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="calculator-container">
        <h2>SML Group Gold Loan Calculator</h2>
        
        <label for="goldWeight">Gold Weight (Grams):</label>
        <input type="number" id="goldWeight" placeholder="e.g., 50" min="1">

        <label for="marketRate">Current Market Rate (per Gram):</label>
        <input type="number" id="marketRate" placeholder="e.g., 6000" min="100">

        <div class="scheme-group">
            <button class="scheme-button selected" data-scheme="75" data-name="75% LTV Scheme" data-ltv="75" data-pl="0" data-gl-rate="17" data-pl-rate="0">75% LTV Scheme</button>
            <button class="scheme-button" data-scheme="3Month" data-name="3 Month (90% LTV)" data-ltv="90" data-pl="15" data-gl-rate="22" data-pl-rate="24">3 Month (90% LTV)</button>
            <button class="scheme-button" data-scheme="4Month" data-name="4 Month (85% LTV)" data-ltv="85" data-pl="10" data-gl-rate="20" data-pl-rate="24">4 Month (85% LTV)</button>
        </div>
        
        <div class="result-box">
            <h3>✅ Loan Summary</h3>
            <p>Scheme: <strong id="selectedScheme">75% LTV Scheme</strong></p>
            <hr>
            
            <p>Gold Loan (75%): <strong id="glAmount" class="gl-portion">₹ 0.00</strong></p>
            <p>Personal Loan (<span id="plPercentageDisplay">PL</span>): <strong id="plAmount" class="pl-portion">₹ 0.00</strong></p>
            <hr>
            
            <p>Total Loan Amount (Principal):</p>
            <p class="eligibility-amount"><span id="eligibleAmount">₹ 0.00</span> (<span id="totalLTV">0%</span>)</p>
            <hr>
            
            <h4>💰 Monthly Interest Breakdown</h4>
            <div class="interest-line">
                GL Interest Rate (Annual): 
                <strong style="color: #0056b3;"><span id="glRateDisplay">17%</span></strong> 
                (<span id="monthlyGlInterest" style="color: #0056b3; font-weight: bold;">₹ 0.00</span>)
            </div>
            <div class="interest-line">
                PL Interest Rate (Annual): 
                <strong style="color: #d9534f;"><span id="plRateDisplay">0%</span></strong>
                (<span id="monthlyPlInterest" style="color: #d9534f; font-weight: bold;">₹ 0.00</span>)
            </div>
            <hr>
            
            <p>Total Monthly Interest Payable:</p>
            <p style="font-size: 1.5em; font-weight: bold; color: #0056b3;">
                <span id="monthlyInterest">₹ 0.00</span>
            </p>
        </div>
        
    </div>
    <script src="script.js"></script>
</body>
</html>

