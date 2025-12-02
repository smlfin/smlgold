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
    
    // Elements to display results
    const resultElements = {
        selectedScheme: document.getElementById('selectedScheme'),
        glRateDisplay: document.getElementById('glRateDisplay'),
        plRateDisplay: document.getElementById('plRateDisplay'),
        glAmount: document.getElementById('glAmount'),
        plAmount: document.getElementById('plAmount'),
        totalLTV: document.getElementById('totalLTV'),
        eligibleAmount: document.getElementById('eligibleAmount'),
        monthlyInterest: document.getElementById('monthlyInterest'),
        // NEW: Separate monthly interest display elements
        monthlyGlInterest: document.getElementById('monthlyGlInterest'), 
        monthlyPlInterest: document.getElementById('monthlyPlInterest')
    };

    // Update display for scheme and rates
    resultElements.selectedScheme.textContent = currentScheme.name;
    resultElements.glRateDisplay.textContent = `${currentScheme.glInterestRate}%`;
    resultElements.plRateDisplay.textContent = `${currentScheme.plInterestRate}%`;

    // Check for valid financial inputs
    if (!isFinite(weight) || weight <= 0 || !isFinite(marketRate) || marketRate <= 0) {
        // Reset financial results to zero
        const zero = formatCurrency(0);
        resultElements.glAmount.textContent = zero;
        resultElements.plAmount.textContent = zero;
        resultElements.totalLTV.textContent = `${currentScheme.totalLTV}%`;
        resultElements.eligibleAmount.textContent = zero;
        resultElements.monthlyInterest.textContent = zero;
        resultElements.monthlyGlInterest.textContent = zero; // Reset
        resultElements.monthlyPlInterest.textContent = zero; // Reset
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
    resultElements.glAmount.textContent = formatCurrency(glAmount);
    resultElements.plAmount.textContent = formatCurrency(plAmount);
    resultElements.totalLTV.textContent = `${currentScheme.totalLTV}%`;
    resultElements.eligibleAmount.textContent = formatCurrency(eligibleAmount);
    
    // Display Monthly Interest Split-up
    resultElements.monthlyGlInterest.textContent = formatCurrency(glMonthlyInterest);
    resultElements.monthlyPlInterest.textContent = formatCurrency(plMonthlyInterest);

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