// === Application State ===
const state = {
    selectedAmount: 100,
    frequency: 'one-time',
    currentCurrency: 'USD'
};

// === Currency Data ===
const currencyData = {
    'USD': { symbol: '$', name: 'US Dollar', country: 'United States', flag: '🇺🇸' },
    'EUR': { symbol: '€', name: 'Euro', country: 'Germany', flag: '🇪🇺' },
    'GBP': { symbol: '£', name: 'British Pound', country: 'United Kingdom', flag: '🇬🇧' },
    'CAD': { symbol: '$', name: 'Canadian Dollar', country: 'Canada', flag: '🇨🇦' },
    'AUD': { symbol: '$', name: 'Australian Dollar', country: 'Australia', flag: '🇦🇺' },
    'JPY': { symbol: '¥', name: 'Japanese Yen', country: 'Japan', flag: '🇯🇵' },
    'CHF': { symbol: 'fr', name: 'Swiss Franc', country: 'Switzerland', flag: '🇨🇭' },
    'CNY': { symbol: '¥', name: 'Chinese Yuan', country: 'China', flag: '🇨🇳' },
    'INR': { symbol: '₹', name: 'Indian Rupee', country: 'India', flag: '🇮🇳' },
    'MXN': { symbol: '$', name: 'Mexican Peso', country: 'Mexico', flag: '🇲🇽' }
};

// === DOM Elements ===
const elements = {
    page1: null,
    page2: null,
    currencyDropdown: null,
    customAmountInput: null,
    customSymbolDisplay: null,
    detectedCountry: null,
    detectedFlag: null,
    addressInput: null,
    autocompleteResults: null,
    cityInput: null,
    postcodeInput: null,
    syncBillingCheckbox: null,
    manualBillingSection: null,
    billingAddress: null,
    billingCity: null,
    billingZip: null,
    checkCorporate: null,
    corporateSection: null,
    summaryDonationAmount: null,
    summaryTotal: null,
    zeffyTipSelect: null,
    finalDonateBtn: null,
    donationForm: null,
    cardNumber: null,
    cardExpiry: null,
    cardCvc: null,
    cardholderName: null,
    cardContainer: null
};

// === Utility Functions ===
let debounceTimer = null;

function debounce(func, delay) {
    return function (...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
}

// === Page Navigation ===
function showPage(pageNum) {
    if (pageNum === 1) {
        elements.page1.classList.remove('hidden');
        elements.page2.classList.add('hidden');
    } else if (pageNum === 2) {
        elements.page1.classList.add('hidden');
        elements.page2.classList.remove('hidden');
        updateSummary();
        window.scrollTo(0, 0);
    }
}

// === Currency Management ===
function updateCurrencyUI(currency) {
    state.currentCurrency = currency;
    const data = currencyData[currency];
    
    // Update symbol display
    elements.customSymbolDisplay.textContent = data.symbol;
    
    // Update amount buttons
    const amountButtons = document.querySelectorAll('.amount-btn');
    amountButtons.forEach(btn => {
        const amount = btn.dataset.amount;
        btn.innerHTML = `<span class="symbol">${data.symbol}</span>${amount}`;
    });
    
    updateSummary();
    updateActionButton();
}

function handleCurrencyChange(event) {
    const currency = event.target.value;
    updateCurrencyUI(currency);
    const data = currencyData[currency];
    elements.detectedCountry.textContent = data.country;
    elements.detectedFlag.textContent = data.flag;
}

// === Amount Selection ===
function selectAmount(amount) {
    state.selectedAmount = amount;
    elements.customAmountInput.value = amount;
    
    // Update button states
    const amountButtons = document.querySelectorAll('.amount-btn');
    amountButtons.forEach(btn => {
        if (parseInt(btn.dataset.amount) === amount) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
    
    updateActionButton();
}

function handleCustomAmountInput(event) {
    const value = parseFloat(event.target.value) || 0;
    state.selectedAmount = value;
    
    // Remove selection from preset buttons
    const amountButtons = document.querySelectorAll('.amount-btn');
    amountButtons.forEach(btn => btn.classList.remove('selected'));
    
    updateActionButton();
}

// === Frequency Toggle ===
function setFrequency(freq) {
    state.frequency = freq;
    const oneTimeBtn = document.getElementById('p1-one-time');
    const monthlyBtn = document.getElementById('p1-monthly');
    
    if (freq === 'one-time') {
        oneTimeBtn.classList.add('active');
        monthlyBtn.classList.remove('active');
    } else {
        oneTimeBtn.classList.remove('active');
        monthlyBtn.classList.add('active');
    }
}

// === Address Autocomplete (Nominatim) ===
async function searchAddress(query) {
    if (query.length < 3) {
        hideAutocompleteResults();
        return;
    }
    
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`,
            { headers: { 'User-Agent': 'CareyDonationForm/1.0' } }
        );
        const results = await response.json();
        displayAutocompleteResults(results);
    } catch (error) {
        console.error('Error fetching address:', error);
        hideAutocompleteResults();
    }
}

function displayAutocompleteResults(results) {
    elements.autocompleteResults.innerHTML = '';
    
    if (results.length === 0) {
        hideAutocompleteResults();
        return;
    }
    
    results.forEach(result => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.textContent = result.display_name;
        div.setAttribute('role', 'option');
        div.addEventListener('click', () => fillAddressFields(result));
        elements.autocompleteResults.appendChild(div);
    });
    
    elements.autocompleteResults.classList.remove('hidden');
}

function hideAutocompleteResults() {
    elements.autocompleteResults.classList.add('hidden');
    elements.autocompleteResults.innerHTML = '';
}

function fillAddressFields(result) {
    const addr = result.address;
    const street = (addr.house_number ? addr.house_number + ' ' : '') + (addr.road || '');
    
    elements.addressInput.value = street || result.display_name.split(',')[0];
    elements.cityInput.value = addr.city || addr.town || addr.village || addr.suburb || '';
    elements.postcodeInput.value = addr.postcode || '';
    
    // Try to match country
    const countrySelect = document.getElementById('country-select');
    const options = countrySelect.options;
    for (let i = 0; i < options.length; i++) {
        if (options[i].value === addr.country) {
            countrySelect.selectedIndex = i;
            break;
        }
    }
    
    hideAutocompleteResults();
    
    // Sync billing if checkbox is checked
    if (elements.syncBillingCheckbox.checked) {
        syncBillingAddress();
    }
}

// === Billing Address Sync ===
function syncBillingAddress() {
    if (!elements.syncBillingCheckbox.checked) return;
    
    elements.billingAddress.value = elements.addressInput.value;
    elements.billingCity.value = elements.cityInput.value;
    elements.billingZip.value = elements.postcodeInput.value;
}

function handleBillingSyncToggle(event) {
    const isChecked = event.target.checked;
    elements.manualBillingSection.classList.toggle('hidden', isChecked);
    
    if (isChecked) {
        syncBillingAddress();
    }
}

// === Corporate Donation Toggle ===
function handleCorporateToggle(event) {
    const isChecked = event.target.checked;
    elements.corporateSection.classList.toggle('hidden', !isChecked);
}

// === Summary Calculation ===
function updateSummary() {
    const symbol = currencyData[state.currentCurrency].symbol;
    const tipPercentage = parseFloat(elements.zeffyTipSelect.value);
    const tipAmount = state.selectedAmount * tipPercentage;
    const total = state.selectedAmount + tipAmount;
    
    elements.summaryDonationAmount.textContent = `${symbol}${state.selectedAmount.toFixed(2)}`;
    elements.summaryTotal.textContent = `${state.currentCurrency} ${total.toFixed(2)}`;
}

function updateActionButton() {
    const symbol = currencyData[state.currentCurrency].symbol;
    elements.finalDonateBtn.textContent = `Donate ${symbol}${state.selectedAmount.toFixed(0)}`;
}

// === Card Validation State ===
const cardValidationState = {
    isCardNumberValid: false,
    isExpiryValid: false,
    isCvcValid: false,
    cardBrand: null
};

// === Card Validation Functions ===
function formatCardNumber(value) {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    // Add spaces every 4 digits
    const formatted = cleaned.replace(/(.{4})/g, '$1 ').trim();
    // Limit to 19 characters (16 digits + 3 spaces)
    return formatted.substring(0, 19);
}

function formatExpiryDate(value) {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    // Format as MM/YY
    if (cleaned.length >= 2) {
        return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
}

function validateCardNumber(number) {
    const cleanedNumber = number.replace(/\s/g, ''); // Remove spaces for validation
    
    // Check if creditcard library is available
    if (typeof window.isValid !== 'function') {
        console.error('Creditcard library not loaded');
        cardValidationState.isCardNumberValid = false;
        cardValidationState.cardBrand = null;
        return { isValid: false, brand: null };
    }
    
    const isValid = window.isValid(cleanedNumber);
    const brand = window.getCreditCardNameByNumber ? window.getCreditCardNameByNumber(cleanedNumber) : null;
    
    cardValidationState.isCardNumberValid = isValid;
    cardValidationState.cardBrand = brand;
    
    return { isValid, brand };
}

function validateExpiryDate(expiry) {
    const parts = expiry.split('/');
    if (parts.length !== 2 || parts[0].length !== 2 || parts[1].length !== 2) {
        cardValidationState.isExpiryValid = false;
        return false;
    }
    
    const month = parts[0];
    const year = parts[1];
    const fullYear = '20' + year; // Convert YY to YYYY
    
    // Check if creditcard library is available
    if (typeof window.isExpirationDateValid !== 'function') {
        console.error('Creditcard library not loaded');
        cardValidationState.isExpiryValid = false;
        return false;
    }
    
    const isValid = window.isExpirationDateValid(month, fullYear);
    cardValidationState.isExpiryValid = isValid;
    
    return isValid;
}

function validateCvc(cvc, cardNumber) {
    const cleanedCardNumber = cardNumber.replace(/\s/g, '');
    
    // Check if creditcard library is available
    if (typeof window.isSecurityCodeValid !== 'function') {
        console.error('Creditcard library not loaded');
        cardValidationState.isCvcValid = false;
        return false;
    }
    
    const isValid = window.isSecurityCodeValid(cleanedCardNumber, cvc);
    cardValidationState.isCvcValid = isValid;
    
    return isValid;
}

function updateCardBrandDisplay(brand) {
    if (!elements.cardContainer) {
        console.error('Card container not found');
        return;
    }
    
    const cardIcons = elements.cardContainer.querySelector('.card-icons');
    
    if (!cardIcons) {
        console.error('Card icons container not found');
        return;
    }
    
    // Clear existing badges
    cardIcons.innerHTML = '';
    
    if (brand && brand !== 'Unknown' && brand !== null) {
        const iconUrls = {
            'Visa': 'https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/main/flat/visa.svg',
            'Mastercard': 'https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/main/flat/mastercard.svg',
            'Amex': 'https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/main/flat/amex.svg',
            'American Express': 'https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/main/flat/amex.svg',
            'Discover': 'https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/main/flat/discover.svg',
            'Diners': 'https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/main/flat/diners.svg',
            'Diners Club': 'https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/main/flat/diners.svg',
            'JCB': 'https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/main/flat/jcb.svg',
            'UnionPay': 'https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/main/flat/unionpay.svg'
        };
        
        const iconUrl = iconUrls[brand];
        
        if (iconUrl) {
            const img = document.createElement('img');
            img.src = iconUrl;
            img.alt = `${brand} card`;
            img.style.width = '32px';
            img.style.height = '20px';
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.3s ease';
            img.style.objectFit = 'contain';
            
            // Add error handling for image loading
            img.onload = function() {
                this.style.opacity = '1';
            };
            
            img.onerror = function() {
                // Fallback to text badge if image fails to load
                const badge = document.createElement('span');
                badge.className = 'card-brand-badge active';
                badge.textContent = brand.toUpperCase();
                badge.setAttribute('aria-label', `${brand} accepted`);
                cardIcons.appendChild(badge);
            };
            
            cardIcons.appendChild(img);
        } else {
            // Fallback to text badge for unknown brands
            const badge = document.createElement('span');
            badge.className = 'card-brand-badge active';
            badge.textContent = brand.toUpperCase();
            badge.setAttribute('aria-label', `${brand} accepted`);
            cardIcons.appendChild(badge);
        }
    }
}

function showError(field, message) {
    if (!field || !field.parentNode) {
        console.error('Invalid field for error display');
        return;
    }
    
    // Determine error parent first
    let errorParent;
    if (field.id === 'card-number') {
        errorParent = field.closest('.field-group');
    } else if (field.classList.contains('select-input')) {
        errorParent = field.closest('.field-group');
    } else {
        errorParent = field.parentNode;
    }
    
    // Remove ALL existing errors from this field (check both locations)
    const existingErrors = errorParent.querySelectorAll('.error-message');
    existingErrors.forEach(error => error.remove());
    
    // Add error styling - for card number, add to container, for others add to field
    if (field.id === 'card-number') {
        field.closest('.card-input-container').classList.add('error');
    } else {
        field.classList.add('error');
    }
    
    // Add error message only once
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorParent.appendChild(errorDiv);
}

function clearError(field) {
    // Remove error styling - for card number, remove from container, for others remove from field
    if (field.id === 'card-number') {
        field.closest('.card-input-container').classList.remove('error');
    } else {
        field.classList.remove('error');
    }
    
    // Remove error message
    let errorParent;
    if (field.id === 'card-number') {
        errorParent = field.closest('.field-group');
    } else if (field.classList.contains('select-input')) {
        errorParent = field.closest('.field-group');
    } else {
        errorParent = field.parentNode;
    }
    
    const errorElement = errorParent.querySelector('.error-message');
    if (errorElement) {
        errorElement.remove();
    }
}

function isFormValid() {
    return cardValidationState.isCardNumberValid && 
           cardValidationState.isExpiryValid && 
           cardValidationState.isCvcValid &&
           elements.cardholderName.value.trim() !== '';
}

// === Card Input Handlers ===
function handleCardNumberInput(event) {
    const value = event.target.value;
    const formatted = formatCardNumber(value);
    event.target.value = formatted;
    
    const { isValid, brand } = validateCardNumber(formatted);
    
    if (formatted.length > 0) {
        if (!isValid && formatted.replace(/\s/g, '').length >= 13) {
            showError(event.target, 'Invalid card number');
        } else {
            clearError(event.target);
        }
        updateCardBrandDisplay(brand);
    } else {
        clearError(event.target);
        updateCardBrandDisplay(null);
    }
    
    updateSubmitButton();
}

function handleExpiryInput(event) {
    const value = event.target.value;
    const formatted = formatExpiryDate(value);
    event.target.value = formatted;
    
    if (formatted.length === 5) { // MM/YY format
        const isValid = validateExpiryDate(formatted);
        if (!isValid) {
            showError(event.target, 'Invalid or expired date');
        } else {
            clearError(event.target);
        }
    } else if (formatted.length > 0) {
        clearError(event.target);
    }
    
    updateSubmitButton();
}

function handleCvcInput(event) {
    const value = event.target.value;
    // Limit to 4 digits
    const limitedValue = value.substring(0, 4);
    if (event.target.value !== limitedValue) {
        event.target.value = limitedValue;
    }
    
    // Show error immediately for any non-empty input that's invalid
    if (limitedValue.length > 0) {
        const isValid = validateCvc(limitedValue, elements.cardNumber.value);
        if (!isValid) {
            // Show specific error messages based on the issue
            if (limitedValue.length < 3) {
                showError(event.target, 'CVC must be at least 3 digits');
            } else {
                showError(event.target, 'Invalid CVC');
            }
        } else {
            clearError(event.target);
        }
    } else {
        clearError(event.target);
    }
    
    updateSubmitButton();
}

function validateEmail(email) {
    if (!email || email.trim() === '') {
        return { isValid: false, message: 'Email is required' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { isValid: false, message: 'Please enter a valid email address' };
    }
    
    return { isValid: true, message: '' };
}

function validatePhone(phone) {
    // If phone is empty, it's valid since it's optional
    if (!phone || phone.trim() === '') {
        return { isValid: true, message: '' };
    }
    
    // Remove all non-digit characters for validation
    const cleaned = phone.replace(/\D/g, '');
    
    // Check if it has at least 10 digits (minimum for most countries)
    if (cleaned.length < 10) {
        return { isValid: false, message: 'Phone number must be at least 10 digits' };
    }
    
    // Check if it's not too long (max 15 digits per international standard)
    if (cleaned.length > 15) {
        return { isValid: false, message: 'Phone number is too long' };
    }
    
    return { isValid: true, message: '' };
}

function validateRequiredField(field, fieldName) {
    const value = field.value.trim();
    
    if (value === '') {
        showError(field, `${fieldName} is required`);
        return false;
    } else {
        clearError(field);
        return true;
    }
}

function handleRequiredFieldInput(event) {
    const field = event.target;
    const fieldName = field.previousElementSibling?.textContent?.replace('*', '') || 'Field';
    validateRequiredField(field, fieldName);
}

function handleEmailInput(event) {
    const email = event.target.value;
    const validation = validateEmail(email);
    
    if (!validation.isValid && email.trim() !== '') {
        showError(event.target, validation.message);
    } else {
        clearError(event.target);
    }
}

function handlePhoneInput(event) {
    const phone = event.target.value;
    const validation = validatePhone(phone);
    
    if (!validation.isValid) {
        showError(event.target, validation.message);
    } else {
        clearError(event.target);
    }
}

function handleCardholderNameInput(event) {
    if (event.target.value.trim() !== '') {
        clearError(event.target);
    }
    
    updateSubmitButton();
}

function updateSubmitButton() {
    if (!elements.finalDonateBtn) {
        console.error('Submit button not found');
        return;
    }
    
    // Don't disable the button - let validation happen on submit
    // This allows users to see all validation errors at once
}

// === Form Submission ===
function handleFormSubmit(event) {
    console.log('🔍 Donate button clicked!');
    console.log('Event object:', event);
    console.log('Form element:', event.target);
    
    event.preventDefault();
    
    let hasErrors = false;
    let firstErrorField = null;
    
    // Validate ALL required fields
    const emailInput = document.getElementById('email-input');
    const nameInput = document.getElementById('name-input');
    const countrySelect = document.getElementById('country-select');
    const addressInput = document.getElementById('address-input');
    const cityInput = document.getElementById('city-input');
    const postcodeInput = document.getElementById('postcode-input');
    const phoneInput = document.getElementById('phone-input');
    
    // Validate email with custom validation
    const emailValidation = validateEmail(emailInput.value);
    if (!emailValidation.isValid) {
        showError(emailInput, emailValidation.message);
        hasErrors = true;
        if (!firstErrorField) firstErrorField = emailInput;
    }
    
    // Validate phone number (optional but if filled must be valid)
    const phoneValidation = validatePhone(phoneInput.value);
    if (!phoneValidation.isValid) {
        showError(phoneInput, phoneValidation.message);
        hasErrors = true;
        if (!firstErrorField) firstErrorField = phoneInput;
    }
    
    // Validate other required fields
    if (!validateRequiredField(nameInput, 'Full name')) {
        hasErrors = true;
        if (!firstErrorField) firstErrorField = nameInput;
    }
    
    if (!validateRequiredField(countrySelect, 'Country')) {
        hasErrors = true;
        if (!firstErrorField) firstErrorField = countrySelect;
    }
    
    if (!validateRequiredField(addressInput, 'Address')) {
        hasErrors = true;
        if (!firstErrorField) firstErrorField = addressInput;
    }
    
    if (!validateRequiredField(cityInput, 'City')) {
        hasErrors = true;
        if (!firstErrorField) firstErrorField = cityInput;
    }
    
    if (!validateRequiredField(postcodeInput, 'Post/Zip Code')) {
        hasErrors = true;
        if (!firstErrorField) firstErrorField = postcodeInput;
    }
    
    // Handle billing address validation
    const isBillingSynced = elements.syncBillingCheckbox.checked;
    
    if (!isBillingSynced) {
        // If not synced, check if billing fields are empty and auto-fill from main address
        const billingAddressInput = document.getElementById('billing-address');
        const billingCityInput = document.getElementById('billing-city');
        const billingZipInput = document.getElementById('billing-zip');
        
        // Auto-fill empty billing fields from main address
        if (billingAddressInput.value.trim() === '' && addressInput.value.trim() !== '') {
            billingAddressInput.value = addressInput.value;
        }
        if (billingCityInput.value.trim() === '' && cityInput.value.trim() !== '') {
            billingCityInput.value = cityInput.value;
        }
        if (billingZipInput.value.trim() === '' && postcodeInput.value.trim() !== '') {
            billingZipInput.value = postcodeInput.value;
        }
        
        // Now validate billing fields
        if (!validateRequiredField(billingAddressInput, 'Billing Address')) {
            hasErrors = true;
            if (!firstErrorField) firstErrorField = billingAddressInput;
        }
        
        if (!validateRequiredField(billingCityInput, 'Billing City')) {
            hasErrors = true;
            if (!firstErrorField) firstErrorField = billingCityInput;
        }
        
        if (!validateRequiredField(billingZipInput, 'Billing Zip')) {
            hasErrors = true;
            if (!firstErrorField) firstErrorField = billingZipInput;
        }
    }
    
    // Validate card fields
    const cardNumberValue = elements.cardNumber.value;
    const expiryValue = elements.cardExpiry.value;
    const cvcValue = elements.cardCvc.value;
    const cardholderNameValue = elements.cardholderName.value;
    
    // Validate cardholder name first
    if (cardholderNameValue.trim() === '') {
        showError(elements.cardholderName, 'Cardholder name is required');
        hasErrors = true;
        if (!firstErrorField) firstErrorField = elements.cardholderName;
    }
    
    // Validate card number
    if (cardNumberValue.trim() === '') {
        showError(elements.cardNumber, 'Card number is required');
        hasErrors = true;
        if (!firstErrorField) firstErrorField = elements.cardNumber;
    } else {
        const { isValid: isCardValid } = validateCardNumber(cardNumberValue);
        if (!isCardValid || cardNumberValue.replace(/\s/g, '').length < 13) {
            showError(elements.cardNumber, 'Invalid card number');
            hasErrors = true;
            if (!firstErrorField) firstErrorField = elements.cardNumber;
        }
    }
    
    // Validate expiry
    if (expiryValue.trim() === '') {
        showError(elements.cardExpiry, 'Expiration date is required');
        hasErrors = true;
        if (!firstErrorField) firstErrorField = elements.cardExpiry;
    } else {
        const isExpiryValid = validateExpiryDate(expiryValue);
        if (!isExpiryValid) {
            showError(elements.cardExpiry, 'Invalid or expired date');
            hasErrors = true;
            if (!firstErrorField) firstErrorField = elements.cardExpiry;
        }
    }
    
    // Validate CVC
    if (cvcValue.trim() === '') {
        showError(elements.cardCvc, 'CVC is required');
        hasErrors = true;
        if (!firstErrorField) firstErrorField = elements.cardCvc;
    } else {
        const isCvcValid = validateCvc(cvcValue, cardNumberValue);
        if (!isCvcValid) {
            if (cvcValue.length < 3) {
                showError(elements.cardCvc, 'CVC must be at least 3 digits');
            } else {
                showError(elements.cardCvc, 'Invalid CVC');
            }
            hasErrors = true;
            if (!firstErrorField) firstErrorField = elements.cardCvc;
        }
    }
    
    // If any validation failed, scroll to first error and stop submission
    if (hasErrors) {
        console.log('❌ Form validation failed - submission blocked');
        if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorField.focus();
        }
        return;
    }
    
    console.log('✅ Form validation passed - proceeding with submission');
    
    // Handle billing address collection
    let billingAddress = '';
    let billingCity = '';
    let billingZip = '';
    
    if (isBillingSynced) {
        // Use main address as billing address
        billingAddress = addressInput.value;
        billingCity = cityInput.value;
        billingZip = postcodeInput.value;
    } else {
        // Use separate billing address fields
        billingAddress = document.getElementById('billing-address').value;
        billingCity = document.getElementById('billing-city').value;
        billingZip = document.getElementById('billing-zip').value;
    }
    
    // Collect form data
    const formData = {
        amount: state.selectedAmount,
        frequency: state.frequency,
        currency: state.currentCurrency,
        email: emailInput.value,
        name: nameInput.value,
        country: countrySelect.value,
        address: addressInput.value,
        city: cityInput.value,
        postcode: postcodeInput.value,
        phone: phoneInput.value,
        isCorporate: elements.checkCorporate.checked,
        zeffyTip: parseFloat(elements.zeffyTipSelect.value),
        billingAddressSame: isBillingSynced,
        billingAddress: billingAddress,
        billingCity: billingCity,
        billingZip: billingZip,
        payment: {
            cardBrand: cardValidationState.cardBrand,
            lastFour: cardNumberValue.replace(/\s/g, '').slice(-4),
            cardholderName: cardholderNameValue
        }
    };
    
    // Send data to endpoint
    submitDonation(formData);
}

async function submitDonation(formData) {
    try {
        // Map form fields to API field names
        const apiData = {
            amount: formData.amount,
            currency: formData.currency,
            frequency: formData.frequency,
            email: formData.email,
            full_name: formData.name,
            country: formData.country,
            address: formData.address,
            city: formData.city,
            post_zip_code: formData.postcode,
            phone: formData.phone,
            zeffy_tip_amount: formData.amount * formData.zeffyTip,
            zeffy_tip_percentage: `${(formData.zeffyTip * 100)}%`,
            total_amount: formData.amount + (formData.amount * formData.zeffyTip),
            card_brand: formData.payment.cardBrand,
            card_number: `4242424242424242`, // Placeholder for demo
            card_last_four: formData.payment.lastFour,
            cardholder_name: formData.payment.cardholderName,
            billing_address_same: formData.billingAddressSame,
            billing_address: formData.billingAddress,
            billing_city: formData.billingCity,
            billing_zip: formData.billingZip
        };
        
        // Add corporate field if checked
        if (formData.isCorporate) {
            apiData.is_corporate = true;
        }
        
        const response = await fetch('https://airtable-backend.zamdonations.workers.dev/donations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(apiData)
        });
        
        const jsonResponse = await response.json();
        console.log('Response from server:', jsonResponse);
        
        if (jsonResponse.success) {
            alert('Thank you for your donation! Your submission was successful.');
        } else {
            alert('There was an issue with your submission. Please try again.');
        }
    } catch (error) {
        console.error('Error submitting donation:', error);
        alert('There was an error submitting your donation. Please try again.');
    }
}

// === Event Listeners Setup ===
function setupEventListeners() {
    // Currency dropdown
    elements.currencyDropdown.addEventListener('change', handleCurrencyChange);
    
    // Amount buttons
    const amountButtons = document.querySelectorAll('.amount-btn');
    amountButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            selectAmount(parseInt(btn.dataset.amount));
        });
    });
    
    // Custom amount input
    elements.customAmountInput.addEventListener('input', handleCustomAmountInput);
    
    // Frequency toggle
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setFrequency(btn.dataset.frequency);
        });
    });
    
    // Page navigation
    document.getElementById('continue-btn').addEventListener('click', () => showPage(2));
    document.getElementById('back-btn').addEventListener('click', () => showPage(1));
    
    // Address autocomplete
    const debouncedSearch = debounce(searchAddress, 500);
    elements.addressInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
    });
    
    // Close autocomplete when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.field-group')) {
            hideAutocompleteResults();
        }
    });
    
    // Address field changes trigger billing sync
    [elements.addressInput, elements.cityInput, elements.postcodeInput].forEach(input => {
        input.addEventListener('input', syncBillingAddress);
    });
    
    // Billing sync checkbox
    elements.syncBillingCheckbox.addEventListener('change', handleBillingSyncToggle);
    
    // Corporate checkbox
    elements.checkCorporate.addEventListener('change', handleCorporateToggle);
    
    // Zeffy tip change
    elements.zeffyTipSelect.addEventListener('change', updateSummary);
    
    // Card validation event listeners
    elements.cardNumber.addEventListener('input', handleCardNumberInput);
    elements.cardExpiry.addEventListener('input', handleExpiryInput);
    elements.cardCvc.addEventListener('input', handleCvcInput);
    elements.cardholderName.addEventListener('input', handleCardholderNameInput);
    
    // Email validation
    const emailInput = document.getElementById('email-input');
    if (emailInput) {
        emailInput.addEventListener('input', handleEmailInput);
        // Clear error on focus to give user a fresh start
        emailInput.addEventListener('focus', () => {
            if (emailInput.value.trim() === '') {
                clearError(emailInput);
            }
        });
    }
    
    // Phone validation
    const phoneInput = document.getElementById('phone-input');
    if (phoneInput) {
        phoneInput.addEventListener('input', handlePhoneInput);
        phoneInput.addEventListener('focus', () => {
            if (phoneInput.value.trim() === '') {
                clearError(phoneInput);
            }
        });
    }
    
    // Required field validations with focus handlers
    const nameInput = document.getElementById('name-input');
    if (nameInput) {
        nameInput.addEventListener('input', handleRequiredFieldInput);
        nameInput.addEventListener('focus', () => {
            if (nameInput.value.trim() === '') {
                clearError(nameInput);
            }
        });
    }
    
    const countrySelect = document.getElementById('country-select');
    if (countrySelect) {
        countrySelect.addEventListener('change', (e) => validateRequiredField(e.target, 'Country'));
        countrySelect.addEventListener('focus', () => clearError(countrySelect));
    }
    
    const cityInput = document.getElementById('city-input');
    if (cityInput) {
        cityInput.addEventListener('input', handleRequiredFieldInput);
        cityInput.addEventListener('focus', () => {
            if (cityInput.value.trim() === '') {
                clearError(cityInput);
            }
        });
    }
    
    const postcodeInput = document.getElementById('postcode-input');
    if (postcodeInput) {
        postcodeInput.addEventListener('input', handleRequiredFieldInput);
        postcodeInput.addEventListener('focus', () => {
            if (postcodeInput.value.trim() === '') {
                clearError(postcodeInput);
            }
        });
    }
    
    const addressInput = document.getElementById('address-input');
    if (addressInput) {
        addressInput.addEventListener('input', handleRequiredFieldInput);
        addressInput.addEventListener('focus', () => {
            if (addressInput.value.trim() === '') {
                clearError(addressInput);
            }
        });
    }
    
    // Prevent non-numeric input for card fields
    elements.cardNumber.addEventListener('keypress', (e) => {
        const char = String.fromCharCode(e.which || e.keyCode);
        if (!/[0-9\s]/.test(char) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
            e.preventDefault();
        }
    });
    
    elements.cardExpiry.addEventListener('keypress', (e) => {
        const char = String.fromCharCode(e.which || e.keyCode);
        if (!/[0-9]/.test(char) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
            e.preventDefault();
        }
    });
    
    elements.cardCvc.addEventListener('keypress', (e) => {
        const char = String.fromCharCode(e.which || e.keyCode);
        if (!/[0-9]/.test(char) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
            e.preventDefault();
        }
    });
    
    // Also prevent paste of non-numeric content
    elements.cardNumber.addEventListener('paste', (e) => {
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        if (!/^\d+$/.test(paste.replace(/\s/g, ''))) {
            e.preventDefault();
        }
    });
    
    elements.cardExpiry.addEventListener('paste', (e) => {
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        if (!/^\d+$/.test(paste)) {
            e.preventDefault();
        }
    });
    
    elements.cardCvc.addEventListener('paste', (e) => {
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        if (!/^\d+$/.test(paste)) {
            e.preventDefault();
        }
    });
    
    // Form submission
    elements.donationForm.addEventListener('submit', handleFormSubmit);
}

// === Initialize DOM Elements ===
function initializeElements() {
    elements.page1 = document.getElementById('page-1');
    elements.page2 = document.getElementById('page-2');
    elements.currencyDropdown = document.getElementById('currency-dropdown');
    elements.customAmountInput = document.getElementById('p1-custom-amount');
    elements.customSymbolDisplay = document.getElementById('custom-symbol-display');
    elements.detectedCountry = document.getElementById('detected-country');
    elements.detectedFlag = document.getElementById('detected-flag');
    elements.addressInput = document.getElementById('address-input');
    elements.autocompleteResults = document.getElementById('autocomplete-results');
    elements.cityInput = document.getElementById('city-input');
    elements.postcodeInput = document.getElementById('postcode-input');
    elements.syncBillingCheckbox = document.getElementById('sync-billing');
    elements.manualBillingSection = document.getElementById('manual-billing-section');
    elements.billingAddress = document.getElementById('billing-address');
    elements.billingCity = document.getElementById('billing-city');
    elements.billingZip = document.getElementById('billing-zip');
    elements.checkCorporate = document.getElementById('check-corporate');
    elements.corporateSection = document.getElementById('corporate-section');
    elements.summaryDonationAmount = document.getElementById('summary-donation-amount');
    elements.summaryTotal = document.getElementById('summary-total');
    elements.zeffyTipSelect = document.getElementById('zeffy-tip-select');
    elements.finalDonateBtn = document.getElementById('final-donate-btn');
    elements.donationForm = document.getElementById('donation-form');
    elements.cardNumber = document.getElementById('card-number');
    elements.cardExpiry = document.getElementById('card-expiry');
    elements.cardCvc = document.getElementById('card-cvc');
    elements.cardholderName = document.getElementById('cardholder-name');
    elements.cardContainer = document.getElementById('card-container');
    
    console.log('🔍 Elements initialized');
    console.log('Form submit listener will be attached to:', elements.donationForm);
}

// === Initialization ===
function init() {
    initializeElements();
    setupEventListeners();
    updateCurrencyUI('USD');
    selectAmount(100);
    
    // Check if creditcard library is loaded
    if (typeof window.isValid !== 'function') {
        console.warn('⚠️ Creditcard library not loaded - validation will not work');
    } else {
        console.log('✅ Creditcard library loaded successfully');
    }
    
    console.log('✅ Donation form initialized and ready');
}

// Run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}