    // script.js

window.addEventListener('load', function() {
    // Check authentication first
    if (!isAuthenticated()) {
        if (window.location.pathname.endsWith('login.html')) {
            initRegistrationPage();
        } else {
            window.location.href = 'login.html';
            return;
        }
    } else {
        // If authenticated and on login page, redirect to index
        if (window.location.pathname.endsWith('login.html')) {
            window.location.href = 'index.html';
            return;
        }

        // Initialize different page functionalities based on role
        const userRole = getCurrentUserRole();

        // Protect sensitive pages
        if (window.location.pathname.includes('patients.html') || window.location.pathname.includes('doctors.html')) {
            if (userRole !== 'admin') {
                window.location.href = 'index.html';
                return;
            }
        }

        initAppointmentPage();
        initBillingManagement();
        if (userRole === 'admin') {
            initPatientManagement();
            initDoctorManagement();
        }
        initLogout();
    }
});

// Appointment Management Functions
function initAppointmentPage() {
    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) {
        populateDoctorSelect();
        appointmentForm.addEventListener('submit', handleAppointmentSubmit);
    }
}

function populateDoctorSelect() {
    const doctorTypeSelect = document.getElementById('doctorType');
    if (!doctorTypeSelect) return;

    const doctorTypes = [
        'Cardiologist',
        'Dermatologist',
        'Pediatrician',
        'General Practitioner',
        'Orthopedic Surgeon',
        'Ophthalmologist'
    ];
    doctorTypeSelect.innerHTML = '<option value="">Choose a doctor type</option>';

    doctorTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        doctorTypeSelect.appendChild(option);
    });
}

function handleAppointmentSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const appointmentData = Object.fromEntries(formData.entries());

    if (!validateAppointmentForm(appointmentData)) {
        alert('Please fill in all required fields correctly.');
        return;
    }

    // Store appointment data temporarily for payment processing
    window.tempAppointmentData = appointmentData;

    // Hide appointment form and show payment form
    document.getElementById('appointmentForm').style.display = 'none';
    document.getElementById('paymentForm').style.display = 'block';

    // Initialize payment form
    initPaymentForm();
}

function validateAppointmentForm(data) {
    const requiredFields = ['patientName', 'patientEmail', 'patientPhone', 'doctorType', 'appointmentDate', 'appointmentTime', 'reason'];

    for (const field of requiredFields) {
        if (!data[field] || data[field].trim() === '') {
            return false;
        }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.patientEmail)) {
        return false;
    }

    const appointmentDateTime = new Date(`${data.appointmentDate}T${data.appointmentTime}`);
    const now = new Date();
    if (appointmentDateTime <= now) {
        alert('Please select a future date and time for the appointment.');
        return false;
    }

    return true;
}

function loadAppointments() {
    return JSON.parse(localStorage.getItem('appointments') || '[]');
}

// Payment Form Functions
function initPaymentForm() {
    const paymentFormData = document.getElementById('paymentFormData');
    const paymentMethodSelect = document.getElementById('paymentMethod');

    if (paymentFormData) {
        paymentFormData.addEventListener('submit', handlePaymentSubmit);
    }

    if (paymentMethodSelect) {
        paymentMethodSelect.addEventListener('change', togglePaymentFields);
    }
}

function togglePaymentFields() {
    const paymentMethod = document.getElementById('paymentMethod').value;
    const cardFields = document.getElementById('cardFields');
    const mobileFields = document.getElementById('mobileFields');
    const amountField = document.getElementById('amount');

    if (paymentMethod === 'Credit Card') {
        cardFields.style.display = 'block';
        mobileFields.style.display = 'none';
        amountField.value = '100.00';
        // Make card fields required
        document.getElementById('cardNumber').required = true;
        document.getElementById('expiryDate').required = true;
        document.getElementById('cvv').required = true;
        // Remove required from phone
        document.getElementById('phoneNumber').required = false;
    } else if (paymentMethod === 'MTN' || paymentMethod === 'Orange') {
        cardFields.style.display = 'none';
        mobileFields.style.display = 'block';
        amountField.value = '2000';
        // Make phone field required
        document.getElementById('phoneNumber').required = true;
        // Remove required from card fields
        document.getElementById('cardNumber').required = false;
        document.getElementById('expiryDate').required = false;
        document.getElementById('cvv').required = false;
    } else if (paymentMethod === 'Cash') {
        cardFields.style.display = 'none';
        mobileFields.style.display = 'none';
        amountField.value = '100.00';
        // Remove required from all
        document.getElementById('cardNumber').required = false;
        document.getElementById('expiryDate').required = false;
        document.getElementById('cvv').required = false;
        document.getElementById('phoneNumber').required = false;
    } else {
        cardFields.style.display = 'none';
        mobileFields.style.display = 'none';
        amountField.value = '100.00';
    }
}

function handlePaymentSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const paymentData = Object.fromEntries(formData.entries());

    // Validate payment data
    if (!validatePaymentForm(paymentData)) {
        alert('Please fill in all payment details correctly.');
        return;
    }

    // For mobile payments, show confirmation before proceeding
    if (paymentData.paymentMethod === 'MTN' || paymentData.paymentMethod === 'Orange') {
        const confirmationMessage = `You are about to simulate a payment of ${paymentData.amount} FCFA using ${paymentData.paymentMethod}.\n\nIn this demo, no real money will be withdrawn. The payment will be recorded as successful for demonstration purposes.\n\nDo you want to proceed?`;
        if (!confirm(confirmationMessage)) {
            return; // Cancel payment if not confirmed
        }

        // Simulate payment processing
        alert(`Payment simulation completed. ${paymentData.amount} FCFA would be withdrawn from your phone number ${paymentData.phoneNumber} and sent to the hospital's MoMo account (652628916).\n\nA confirmation message would be sent to your phone.`);
    }

    // Authorize payment before proceeding
    authorizePayment(paymentData).then(isAuthorized => {
        if (isAuthorized) {
            // Save appointment with payment info
            const appointments = loadAppointments();
            const appointmentId = Date.now();
            const appointmentData = {
                ...window.tempAppointmentData,
                id: appointmentId,
                status: 'confirmed',
                payment: {
                    ...paymentData,
                    paymentDate: new Date().toISOString(),
                    amount: paymentData.amount // Use dynamic amount from form
                }
            };
            appointments.push(appointmentData);
            localStorage.setItem('appointments', JSON.stringify(appointments));

            // Hide payment form and show receipt
            document.getElementById('paymentForm').style.display = 'none';
            document.getElementById('receipt').style.display = 'block';

            // Generate receipt
            generateReceipt(appointmentData);
        } else {
            alert('Payment authorization failed. Please try again or contact support.');
        }
    });
}

function validatePaymentForm(data) {
    if (!data.paymentMethod) {
        alert('Please select a payment method.');
        return false;
    }

    // For mobile payments (MTN, Orange), only phone number might be needed
    if (data.paymentMethod === 'MTN' || data.paymentMethod === 'Orange') {
        if (!data.phoneNumber || data.phoneNumber.trim() === '') {
            alert('Please enter your phone number for mobile payment.');
            return false;
        }
        // Basic phone number validation for Cameroon mobile numbers
        const phoneRegex = /^(?:\+237\s?)?6[0-9]{8}$/;
        if (!phoneRegex.test(data.phoneNumber.replace(/\s/g, ''))) {
            alert('Please enter a valid Cameroon mobile phone number (e.g., +237 6XXXXXXXX or 6XXXXXXXX).');
            return false;
        }
        return true;
    }

    // For Credit Card payments
    if (data.paymentMethod === 'Credit Card') {
        const requiredFields = ['cardNumber', 'expiryDate', 'cvv'];

        for (const field of requiredFields) {
            if (!data[field] || data[field].trim() === '') {
                return false;
            }
        }

        // Basic card number validation (16 digits)
        const cardNumberRegex = /^\d{16}$/;
        if (!cardNumberRegex.test(data.cardNumber.replace(/\s/g, ''))) {
            alert('Please enter a valid 16-digit card number.');
            return false;
        }

        // Basic expiry date validation (MM/YY format)
        const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
        if (!expiryRegex.test(data.expiryDate)) {
            alert('Please enter expiry date in MM/YY format.');
            return false;
        }

        // Basic CVV validation (3-4 digits)
        const cvvRegex = /^\d{3,4}$/;
        if (!cvvRegex.test(data.cvv)) {
            alert('Please enter a valid CVV (3-4 digits).');
            return false;
        }
    }

    // For Cash payments, no additional validation needed
    return true;
}

function generateReceipt(appointmentData) {
    const receiptDetails = document.getElementById('receiptDetails');

    // Determine payment method display
    let paymentMethodDisplay = appointmentData.payment.paymentMethod;
    let paymentIdentifierDisplay = '';

    if (appointmentData.payment.paymentMethod === 'Credit Card') {
        paymentIdentifierDisplay = `<p><strong>Card Number:</strong> **** **** **** ${appointmentData.payment.cardNumber.slice(-4)}</p>`;
    } else if (appointmentData.payment.paymentMethod === 'MTN' || appointmentData.payment.paymentMethod === 'Orange') {
        paymentIdentifierDisplay = `<p><strong>Phone Number:</strong> ${appointmentData.payment.phoneNumber}</p>`;
    } else if (appointmentData.payment.paymentMethod === 'Cash') {
        paymentIdentifierDisplay = `<p><strong>Payment Method:</strong> Cash</p>`;
    }

    const receiptHtml = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h3>🏥 SOLIDARITY Hospital</h3>
            <p>Appointment Receipt</p>
        </div>
        <div style="border: 1px solid #ddd; padding: 20px; margin: 20px 0;">
            <h4>Appointment Details:</h4>
            <p><strong>Appointment ID:</strong> ${appointmentData.id}</p>
            <p><strong>Patient Name:</strong> ${appointmentData.patientName}</p>
            <p><strong>Email:</strong> ${appointmentData.patientEmail}</p>
            <p><strong>Phone:</strong> ${appointmentData.patientPhone}</p>
            <p><strong>Doctor Type:</strong> ${appointmentData.doctorType}</p>
            <p><strong>Appointment Date:</strong> ${appointmentData.appointmentDate}</p>
            <p><strong>Appointment Time:</strong> ${appointmentData.appointmentTime}</p>
            <p><strong>Reason:</strong> ${appointmentData.reason}</p>

            <h4 style="margin-top: 20px;">Payment Details:</h4>
            <p><strong>Amount Paid:</strong> ${appointmentData.payment.paymentMethod === 'MTN' || appointmentData.payment.paymentMethod === 'Orange' ? appointmentData.payment.amount : '$' + appointmentData.payment.amount}</p>
            <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Payment Method:</strong> ${paymentMethodDisplay}</p>
            ${paymentIdentifierDisplay}

            <p style="margin-top: 20px; color: green; font-weight: bold;">Payment Status: SUCCESSFUL</p>
        </div>
        <div style="text-align: center; margin-top: 20px;">
            <p>Thank you for choosing SOLIDARITY Hospital!</p>
            <p>We will contact you soon to confirm your appointment.</p>
        </div>
    `;

    receiptDetails.innerHTML = receiptHtml;
}

function printReceipt() {
    const receiptContent = document.getElementById('receiptDetails').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Appointment Receipt - SOLIDARITY Hospital</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .receipt-header { text-align: center; margin-bottom: 30px; }
                    .receipt-details { border: 1px solid #ddd; padding: 20px; margin: 20px 0; }
                    .success-message { color: green; font-weight: bold; text-align: center; margin: 20px 0; }
                </style>
            </head>
            <body>
                ${receiptContent}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Patient Management Functions
function initPatientManagement() {
    const addPatientBtn = document.getElementById('addPatientBtn');
    const patientForm = document.getElementById('patientForm');
    const patientFormData = document.getElementById('patientFormData');
    const cancelBtn = document.getElementById('cancelBtn');

    if (addPatientBtn) {
        addPatientBtn.addEventListener('click', () => {
            patientForm.style.display = 'block';
            patientFormData.reset();
            document.getElementById('patientId').value = '';
        });
    }

    if (patientFormData) {
        patientFormData.addEventListener('submit', savePatient);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            patientForm.style.display = 'none';
        });
    }

    displayPatients();
}

function savePatient(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const patientData = Object.fromEntries(formData.entries());

    const patients = loadPatients();
    const patientId = patientData.patientId;

    if (patientId) {
        // Update existing patient
        const index = patients.findIndex(p => p.id == patientId);
        if (index !== -1) {
            patients[index] = { ...patientData, id: parseInt(patientId) };
        }
    } else {
        // Add new patient
        patientData.id = Date.now();
        patients.push(patientData);
    }

    localStorage.setItem('patients', JSON.stringify(patients));
    document.getElementById('patientForm').style.display = 'none';
    displayPatients();
}

function displayPatients() {
    const patientsTableBody = document.getElementById('patientsTableBody');
    if (!patientsTableBody) return;

    const patients = loadPatients();
    patientsTableBody.innerHTML = '';

    patients.forEach(patient => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${patient.id}</td>
            <td>${patient.firstName} ${patient.lastName}</td>
            <td>${patient.phone}</td>
            <td>${patient.email}</td>
            <td>
                <button onclick="editPatient(${patient.id})">Edit</button>
                <button onclick="deletePatient(${patient.id})">Delete</button>
            </td>
        `;
        patientsTableBody.appendChild(row);
    });
}

function editPatient(id) {
    const patients = loadPatients();
    const patient = patients.find(p => p.id == id);
    if (!patient) return;

    document.getElementById('patientId').value = patient.id;
    document.getElementById('firstName').value = patient.firstName;
    document.getElementById('lastName').value = patient.lastName;
    document.getElementById('dateOfBirth').value = patient.dateOfBirth;
    document.getElementById('gender').value = patient.gender;
    document.getElementById('phone').value = patient.phone;
    document.getElementById('email').value = patient.email;
    document.getElementById('address').value = patient.address;
    document.getElementById('emergencyContact').value = patient.emergencyContact;
    document.getElementById('emergencyPhone').value = patient.emergencyPhone;
    document.getElementById('medicalHistory').value = patient.medicalHistory || '';

    document.getElementById('patientForm').style.display = 'block';
}

function deletePatient(id) {
    if (confirm('Are you sure you want to delete this patient?')) {
        const patients = loadPatients().filter(p => p.id != id);
        localStorage.setItem('patients', JSON.stringify(patients));
        displayPatients();
    }
}

function loadPatients() {
    return JSON.parse(localStorage.getItem('patients') || '[]');
}



// Billing Management Functions
function initBillingManagement() {
    const createInvoiceBtn = document.getElementById('createInvoiceBtn');
    const invoiceForm = document.getElementById('invoiceForm');
    const invoiceFormData = document.getElementById('invoiceFormData');
    const cancelInvoiceBtn = document.getElementById('cancelInvoiceBtn');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const exportReportBtn = document.getElementById('exportReportBtn');

    if (createInvoiceBtn) {
        createInvoiceBtn.addEventListener('click', () => {
            invoiceForm.style.display = 'block';
            invoiceFormData.reset();
            populatePatientSelect();
        });
    }

    if (invoiceFormData) {
        invoiceFormData.addEventListener('submit', createInvoice);
    }

    if (cancelInvoiceBtn) {
        cancelInvoiceBtn.addEventListener('click', () => {
            invoiceForm.style.display = 'none';
        });
    }

    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', generateReport);
    }

    if (exportReportBtn) {
        exportReportBtn.addEventListener('click', exportReport);
    }

    displayInvoices();
}

function populatePatientSelect() {
    const patientSelect = document.getElementById('patientSelect');
    if (!patientSelect) return;

    const patients = loadPatients();
    patientSelect.innerHTML = '<option value="">Choose a patient</option>';

    patients.forEach(patient => {
        const option = document.createElement('option');
        option.value = patient.id;
        option.textContent = `${patient.firstName} ${patient.lastName}`;
        patientSelect.appendChild(option);
    });
}

function createInvoice(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const invoiceData = Object.fromEntries(formData.entries());

    const invoices = loadInvoices();
    invoiceData.id = Date.now();
    invoiceData.status = 'unpaid';
    invoices.push(invoiceData);

    localStorage.setItem('invoices', JSON.stringify(invoices));
    document.getElementById('invoiceForm').style.display = 'none';
    displayInvoices();
}

function displayInvoices() {
    const invoicesTableBody = document.getElementById('invoicesTableBody');
    if (!invoicesTableBody) return;

    const invoices = loadInvoices();
    const patients = loadPatients();
    invoicesTableBody.innerHTML = '';

    invoices.forEach(invoice => {
        const patient = patients.find(p => p.id == invoice.patientSelect);
        const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${invoice.id}</td>
            <td>${patientName}</td>
            <td>${invoice.serviceType}</td>
            <td>$${parseFloat(invoice.amount).toFixed(2)}</td>
            <td>${invoice.status}</td>
            <td>${invoice.dueDate}</td>
            <td>
                <button onclick="markAsPaid(${invoice.id})">${invoice.status === 'paid' ? 'Paid' : 'Mark Paid'}</button>
                <button onclick="deleteInvoice(${invoice.id})">Delete</button>
            </td>
        `;
        invoicesTableBody.appendChild(row);
    });
}

function markAsPaid(id) {
    const invoices = loadInvoices();
    const invoice = invoices.find(i => i.id == id);
    if (invoice) {
        const newStatus = invoice.status === 'paid' ? 'unpaid' : 'paid';
        invoice.status = newStatus;

        if (newStatus === 'paid') {
            // Record payment
            const payments = loadPayments();
            payments.push({
                invoiceId: id,
                patientId: invoice.patientSelect,
                amount: invoice.amount,
                paymentDate: new Date().toISOString(),
                paymentMethod: 'Online' // Default method, can be expanded
            });
            localStorage.setItem('payments', JSON.stringify(payments));
            displayPayments();
        }

        localStorage.setItem('invoices', JSON.stringify(invoices));
        displayInvoices();
    }
}

function deleteInvoice(id) {
    if (confirm('Are you sure you want to delete this invoice?')) {
        const invoices = loadInvoices().filter(i => i.id != id);
        localStorage.setItem('invoices', JSON.stringify(invoices));
        displayInvoices();
    }
}

function loadInvoices() {
    return JSON.parse(localStorage.getItem('invoices') || '[]');
}

// Billing Management Functions
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));

    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));

    // Show selected tab content
    document.getElementById(tabName + '-tab').classList.add('active');

    // Add active class to clicked button
    event.target.classList.add('active');
}

function generateReport() {
    const period = document.getElementById('reportPeriod').value;
    const invoices = loadInvoices();
    const payments = loadPayments();

    let totalRevenue = 0;
    let outstandingPayments = 0;
    let paidInvoices = 0;
    let unpaidInvoices = 0;

    const now = new Date();
    const startDate = getStartDateForPeriod(period, now);

    invoices.forEach(invoice => {
        const invoiceDate = new Date(invoice.id); // Assuming ID is timestamp
        if (invoiceDate >= startDate) {
            if (invoice.status === 'paid') {
                totalRevenue += parseFloat(invoice.amount);
                paidInvoices++;
            } else {
                outstandingPayments += parseFloat(invoice.amount);
                unpaidInvoices++;
            }
        }
    });

    document.getElementById('totalRevenue').textContent = '$' + totalRevenue.toFixed(2);
    document.getElementById('outstandingPayments').textContent = '$' + outstandingPayments.toFixed(2);
    document.getElementById('paidInvoices').textContent = paidInvoices;
    document.getElementById('unpaidInvoices').textContent = unpaidInvoices;

    document.getElementById('reportResults').style.display = 'block';
}

function getStartDateForPeriod(period, now) {
    const startDate = new Date(now);
    switch (period) {
        case 'monthly':
            startDate.setMonth(now.getMonth() - 1);
            break;
        case 'quarterly':
            startDate.setMonth(now.getMonth() - 3);
            break;
        case 'yearly':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
    }
    return startDate;
}

function exportReport() {
    const reportData = {
        totalRevenue: document.getElementById('totalRevenue').textContent,
        outstandingPayments: document.getElementById('outstandingPayments').textContent,
        paidInvoices: document.getElementById('paidInvoices').textContent,
        unpaidInvoices: document.getElementById('unpaidInvoices').textContent,
        generatedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = 'financial_report.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function loadPayments() {
    return JSON.parse(localStorage.getItem('payments') || '[]');
}

function displayPayments() {
    const paymentsTableBody = document.getElementById('paymentsTableBody');
    if (!paymentsTableBody) return;

    const payments = loadPayments();
    const patients = loadPatients();
    paymentsTableBody.innerHTML = '';

    payments.forEach(payment => {
        const patient = patients.find(p => p.id == payment.patientId);
        const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${payment.invoiceId}</td>
            <td>${patientName}</td>
            <td>$${parseFloat(payment.amount).toFixed(2)}</td>
            <td>${new Date(payment.paymentDate).toLocaleDateString()}</td>
            <td>${payment.paymentMethod}</td>
        `;
        paymentsTableBody.appendChild(row);
    });
}

// Doctor Management Functions
function initDoctorManagement() {
    const addDoctorBtn = document.getElementById('addDoctorBtn');
    const doctorForm = document.getElementById('doctorForm');
    const doctorFormData = document.getElementById('doctorFormData');
    const cancelDoctorBtn = document.getElementById('cancelDoctorBtn');

    if (addDoctorBtn) {
        addDoctorBtn.addEventListener('click', () => {
            doctorForm.style.display = 'block';
            doctorFormData.reset();
            document.getElementById('doctorId').value = '';
        });
    }

    if (doctorFormData) {
        doctorFormData.addEventListener('submit', saveDoctor);
    }

    if (cancelDoctorBtn) {
        cancelDoctorBtn.addEventListener('click', () => {
            doctorForm.style.display = 'none';
        });
    }

    displayDoctors();
}

function saveDoctor(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const doctorData = Object.fromEntries(formData.entries());

    const doctors = loadDoctors();
    const doctorId = doctorData.doctorId;

    if (doctorId) {
        // Update existing doctor
        const index = doctors.findIndex(d => d.id == doctorId);
        if (index !== -1) {
            doctors[index] = { ...doctorData, id: parseInt(doctorId) };
        }
    } else {
        // Add new doctor
        doctorData.id = Date.now();
        doctors.push(doctorData);
    }

    localStorage.setItem('doctors', JSON.stringify(doctors));
    document.getElementById('doctorForm').style.display = 'none';
    displayDoctors();
}

function displayDoctors() {
    const doctorsTableBody = document.getElementById('doctorsTableBody');
    if (!doctorsTableBody) return;

    const doctors = loadDoctors();
    doctorsTableBody.innerHTML = '';

    doctors.forEach(doctor => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${doctor.id}</td>
            <td>${doctor.firstName} ${doctor.lastName}</td>
            <td>${doctor.specialization}</td>
            <td>${doctor.phone}</td>
            <td>${doctor.email}</td>
            <td>${doctor.licenseNumber}</td>
            <td>${doctor.experience} years</td>
            <td>
                <button onclick="editDoctor(${doctor.id})">Edit</button>
                <button onclick="deleteDoctor(${doctor.id})">Delete</button>
            </td>
        `;
        doctorsTableBody.appendChild(row);
    });
}

function editDoctor(id) {
    const doctors = loadDoctors();
    const doctor = doctors.find(d => d.id == id);
    if (!doctor) return;

    document.getElementById('doctorId').value = doctor.id;
    document.getElementById('firstName').value = doctor.firstName;
    document.getElementById('lastName').value = doctor.lastName;
    document.getElementById('specialization').value = doctor.specialization;
    document.getElementById('phone').value = doctor.phone;
    document.getElementById('email').value = doctor.email;
    document.getElementById('licenseNumber').value = doctor.licenseNumber;
    document.getElementById('experience').value = doctor.experience;

    document.getElementById('doctorForm').style.display = 'block';
}

function deleteDoctor(id) {
    if (confirm('Are you sure you want to delete this doctor?')) {
        const doctors = loadDoctors().filter(d => d.id != id);
        localStorage.setItem('doctors', JSON.stringify(doctors));
        displayDoctors();
    }
}

function loadDoctors() {
    return JSON.parse(localStorage.getItem('doctors') || '[]');
}

// Authentication Functions
function initRegistrationPage() {
    // Initialize tab switching
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');

    if (loginTab) {
        loginTab.addEventListener('click', () => switchToLogin());
    }

    if (registerTab) {
        registerTab.addEventListener('click', () => switchToRegister());
    }

    // Initialize forms
    const loginForm = document.getElementById('loginForm');
    const registrationForm = document.getElementById('registrationForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (registrationForm) {
        registrationForm.addEventListener('submit', handleRegistration);
    }

    // Initialize doctor fields toggle
    const roleSelect = document.getElementById('regRole');
    if (roleSelect) {
        roleSelect.addEventListener('change', toggleDoctorFields);
    }

    // Initialize forgot password link
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', handleForgotPassword);
    }
}

function toggleDoctorFields() {
    const roleSelect = document.getElementById('regRole');
    const doctorFields = document.getElementById('doctorFields');

    if (roleSelect && doctorFields) {
        if (roleSelect.value === 'doctor') {
            doctorFields.style.display = 'block';
        } else {
            doctorFields.style.display = 'none';
        }
    }
}

function switchToLogin() {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registrationForm = document.getElementById('registrationForm');

    if (loginTab) loginTab.classList.add('active');
    if (registerTab) registerTab.classList.remove('active');
    if (loginForm) loginForm.classList.add('active');
    if (registrationForm) registrationForm.classList.remove('active');
}

function switchToRegister() {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registrationForm = document.getElementById('registrationForm');

    if (loginTab) loginTab.classList.remove('active');
    if (registerTab) registerTab.classList.add('active');
    if (loginForm) loginForm.classList.remove('active');
    if (registrationForm) registrationForm.classList.add('active');
}

function handleLogin(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const loginData = Object.fromEntries(formData.entries());

    // Validate login credentials
    if (authenticateUser(loginData.username, loginData.password, loginData.role)) {
        // Login successful
        localStorage.setItem('currentUser', JSON.stringify({
            username: loginData.username,
            role: loginData.role,
            loginTime: new Date().toISOString()
        }));

        showLoginMessage('Login successful! Redirecting...', 'success');

        // Redirect based on role
        if (loginData.role === 'doctor') {
            window.location.href = 'doctor-dashboard.html';
        } else {
            window.location.href = 'index.html';
        }
    } else {
        showLoginMessage('Invalid username, password, or role. Please try again.', 'error');
    }
}

function handleRegistration(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const registrationData = Object.fromEntries(formData.entries());

    // Validate password confirmation
    if (registrationData.password !== registrationData.confirmPassword) {
        showLoginMessage('Passwords do not match. Please try again.', 'error');
        return;
    }

    // Check if username already exists
    const users = loadUsers();
    if (users[registrationData.username]) {
        showLoginMessage('Username already exists. Please choose a different username.', 'error');
        return;
    }

    // Additional validation for doctor role
    if (registrationData.role === 'doctor') {
        if (!registrationData.firstName || !registrationData.lastName || !registrationData.specialization ||
            !registrationData.phone || !registrationData.licenseNumber || registrationData.experience === '') {
            showLoginMessage('Please fill in all doctor information fields.', 'error');
            return;
        }
    }

    // Create new user
    users[registrationData.username] = {
        password: registrationData.password,
        role: registrationData.role,
        createdAt: new Date().toISOString()
    };

    // Save users to localStorage
    localStorage.setItem('users', JSON.stringify(users));

    // If registering as doctor, also add to doctors list
    if (registrationData.role === 'doctor') {
        const doctors = loadDoctors();
        const newDoctor = {
            id: Date.now(),
            firstName: registrationData.firstName,
            lastName: registrationData.lastName,
            specialization: registrationData.specialization,
            phone: registrationData.phone,
            email: registrationData.username,
            licenseNumber: registrationData.licenseNumber,
            experience: parseInt(registrationData.experience)
        };
        doctors.push(newDoctor);
        localStorage.setItem('doctors', JSON.stringify(doctors));
    }

    // Auto-login the new user
    localStorage.setItem('currentUser', JSON.stringify({
        username: registrationData.username,
        role: registrationData.role,
        loginTime: new Date().toISOString()
    }));

    showLoginMessage('Account created successfully! Redirecting...', 'success');

    // Redirect based on role
    setTimeout(() => {
        if (registrationData.role === 'doctor') {
            window.location.href = 'doctor-dashboard.html';
        } else if (registrationData.role === 'admin') {
            window.location.href = 'patients.html';
        } else {
            window.location.href = 'index.html';
        }
    }, 1500);
}

function authenticateUser(username, password, role) {
    // Load users from localStorage
    const users = loadUsers();

    // Check if user exists and credentials match
    return users[username] && users[username].password === password && users[username].role === role;
}

function loadUsers() {
    let users = JSON.parse(localStorage.getItem('users') || '{}');

    // Initialize default users if none exist
    if (Object.keys(users).length === 0) {
        users = {
            'admin@solidarityhospital.com': {
                password: 'admin123',
                role: 'admin',
                createdAt: new Date().toISOString()
            },
            'user@solidarityhospital.com': {
                password: 'user123',
                role: 'user',
                createdAt: new Date().toISOString()
            }
        };
        localStorage.setItem('users', JSON.stringify(users));
    }

    return users;
}

function isAuthenticated() {
    const currentUser = localStorage.getItem('currentUser');
    return currentUser !== null;
}

function getCurrentUserRole() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    return currentUser.role;
}

function initLogout() {
    // Add logout button to navigation
    const nav = document.querySelector('nav ul');
    if (nav) {
        const logoutLi = document.createElement('li');
        logoutLi.innerHTML = '<a href="#" id="logoutBtn">Logout</a>';
        nav.appendChild(logoutLi);

        document.getElementById('logoutBtn').addEventListener('click', logout);
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

function handleForgotPassword(e) {
    e.preventDefault();
    const email = prompt('Please enter your email address:');
    if (email) {
        // In a real application, this would send a password reset email
        alert('Password reset instructions have been sent to your email address. Please check your inbox.');
    }
}

function showLoginMessage(message, type) {
    const messageDiv = document.getElementById('loginMessage');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = type;
        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

// Payment Authorization Function
function authorizePayment(paymentData) {
    return new Promise((resolve) => {
        // Simulate payment processing delay
        setTimeout(() => {
            // For demo purposes, authorize all valid payments
            // In a real application, this would integrate with payment gateways
            if (paymentData.paymentMethod === 'MTN' || paymentData.paymentMethod === 'Orange') {
                // For mobile payments, check if phone number is valid
                const phoneRegex = /^(?:\+237\s?)?6[0-9]{8}$/;
                const isValidPhone = phoneRegex.test(paymentData.phoneNumber.replace(/\s/g, ''));
                resolve(isValidPhone);
            } else if (paymentData.paymentMethod === 'Credit Card') {
                // For credit cards, check basic validation
                const cardRegex = /^\d{16}$/;
                const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
                const cvvRegex = /^\d{3,4}$/;
                const isValidCard = cardRegex.test(paymentData.cardNumber.replace(/\s/g, '')) &&
                                   expiryRegex.test(paymentData.expiryDate) &&
                                   cvvRegex.test(paymentData.cvv);
                resolve(isValidCard);
            } else if (paymentData.paymentMethod === 'Cash') {
                // Cash payments are always authorized
                resolve(true);
            } else {
                resolve(false);
            }
        }, 2000); // 2 second delay to simulate processing
    });
}

// Doctor Dashboard Functions
function getLoggedInDoctor() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.role === 'doctor') {
        const doctors = loadDoctors();
        return doctors.find(doctor => doctor.email === currentUser.username) || null;
    }
    return null;
}

function getDoctorAppointments(doctorId) {
    const appointments = loadAppointments();
    return appointments.filter(apt => apt.doctorId == doctorId);
}

function updateAppointmentStatus(appointmentId, status, reason = '') {
    const appointments = loadAppointments();
    const appointment = appointments.find(apt => apt.id == appointmentId);
    if (appointment) {
        appointment.status = status;
        if (reason) appointment.declineReason = reason;
        appointment.updatedAt = new Date().toISOString();
        localStorage.setItem('appointments', JSON.stringify(appointments));
    }
}

function updateAppointmentTime(appointmentId, newDate, newTime) {
    const appointments = loadAppointments();
    const appointment = appointments.find(apt => apt.id == appointmentId);
    if (appointment) {
        appointment.date = newDate;
        appointment.time = newTime;
        appointment.status = 'rescheduled';
        appointment.updatedAt = new Date().toISOString();
        localStorage.setItem('appointments', JSON.stringify(appointments));
    }
}

function logoutDoctor() {
    localStorage.removeItem('currentUser');
}

// Modified appointment submission to assign to doctor
function handleAppointmentSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const appointmentData = Object.fromEntries(formData.entries());

    if (!validateAppointmentForm(appointmentData)) {
        alert('Please fill in all required fields correctly.');
        return;
    }

    // Assign appointment to a doctor based on specialization
    const assignedDoctor = assignAppointmentToDoctor(appointmentData.doctorType);
    if (!assignedDoctor) {
        alert('No doctors available for the selected specialization. Please try again later.');
        return;
    }

    appointmentData.doctorId = assignedDoctor.id;
    appointmentData.doctorName = `${assignedDoctor.firstName} ${assignedDoctor.lastName}`;
    appointmentData.status = 'pending'; // Changed from 'confirmed' to 'pending'

    // Store appointment data temporarily for payment processing
    window.tempAppointmentData = appointmentData;

    // Hide appointment form and show payment form
    document.getElementById('appointmentForm').style.display = 'none';
    document.getElementById('paymentForm').style.display = 'block';

    // Initialize payment form
    initPaymentForm();
}

function assignAppointmentToDoctor(specialization) {
    const doctors = loadDoctors();
    const availableDoctors = doctors.filter(doctor => doctor.specialization === specialization);

    if (availableDoctors.length === 0) return null;

    // Simple round-robin assignment - in a real app, you'd consider availability, workload, etc.
    const randomIndex = Math.floor(Math.random() * availableDoctors.length);
    return availableDoctors[randomIndex];
}
