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
});
