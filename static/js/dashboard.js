// Dashboard state
let accounts = [];
let transactions = [];
let bills = [];
let categories = [];
let savingsGoals = [];
let filteredTransactions = [];
let filteredBills = [];
let currentUser = null;

// Transaction management state
let allTransactions = [];
let currentPage = 1;
let itemsPerPage = 20;
let searchTerm = '';
let typeFilter = '';
let categoryFilter = '';

// DOM elements
const accountsList = document.getElementById('accountsList');
const transactionsList = document.getElementById('transactionsList');
const billsList = document.getElementById('billsList');
const categoriesList = document.getElementById('categoriesList');
const savingsGoalsList = document.getElementById('savingsGoalsList');
const allTransactionsList = document.getElementById('allTransactionsList');

// Initialize dashboard - will be called by sidebar navigation
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadUserProfile();
    // Don't auto-load data here - let sidebar navigation handle it
});

// Load all dashboard data
async function loadDashboardData() {
    try {
        await Promise.all([
            loadAccounts(),
            loadTransactions(),
            loadBills(),
            loadCategories(),
            loadSavingsGoals()
        ]);
    } catch (error) {
        showMessage('Failed to load dashboard data', 'error');
    }
}

// Load accounts
async function loadAccounts() {
    try {
        accounts = await apiRequest('/api/accounts');
        renderAccounts();
        updateAccountSelectors();
    } catch (error) {
        showMessage('Failed to load accounts', 'error');
    }
}

// Load transactions
async function loadTransactions() {
    try {
        transactions = await apiRequest('/api/transactions');
        allTransactions = transactions;
        filteredTransactions = transactions;
        renderTransactions();
        renderAllTransactions();
        updateTransactionStats();
    } catch (error) {
        showMessage('Failed to load transactions', 'error');
    }
}

// Load bills
async function loadBills() {
    try {
        bills = await apiRequest('/api/bills');
        filteredBills = bills;
        renderBills();
    } catch (error) {
        showMessage('Failed to load bills', 'error');
    }
}

// Load savings goals
async function loadSavingsGoals() {
    try {
        savingsGoals = await apiRequest('/api/savings-goals');
        renderSavingsGoals();
    } catch (error) {
        showMessage('Failed to load savings goals', 'error');
    }
}

// Render accounts
function renderAccounts() {
    if (!accounts.length) {
        accountsList.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center;">No accounts found. Create your first account!</p>';
        return;
    }
    
    // For dashboard, show only top 3 accounts by balance
    const topAccounts = getTopAccountsByBalance(accounts, 3);
    
    accountsList.innerHTML = topAccounts.map(account => {
        if (account.account_type === 'credit') {
            const remainingCredit = account.credit_limit ? (account.credit_limit - account.current_balance) : 0;
            const utilizationPercentage = account.credit_limit && account.credit_limit > 0 ? 
                ((account.current_balance / account.credit_limit) * 100).toFixed(1) : 0;
            
            return `
                <div class="account-item credit-account">
                    <div class="account-header">
                        <div class="account-info">
                            <div class="account-name">${account.name}</div>
                            <div class="account-type">${account.account_type}</div>
                        </div>
                        <div class="account-actions">
                            <button class="btn btn-small btn-secondary btn-icon" onclick="editAccount(${account.id})">Edit</button>
                            <button class="btn btn-small btn-outline btn-icon" onclick="deleteAccount(${account.id})">Delete</button>
                        </div>
                    </div>
                    <div class="credit-info">
                        <div class="credit-balance">
                            <div class="credit-label">Balance Owed</div>
                            <div class="credit-amount owed">${formatCurrency(account.current_balance || 0)}</div>
                        </div>
                        <div class="credit-available">
                            <div class="credit-label">Available</div>
                            <div class="credit-amount available">${formatCurrency(remainingCredit)}</div>
                        </div>
                        <div class="credit-utilization">
                            <div class="credit-label">Limit: ${formatCurrency(account.credit_limit || 0)} | ${utilizationPercentage}% used</div>
                            <div class="utilization-bar">
                                <div class="utilization-fill" style="width: ${Math.min(utilizationPercentage, 100)}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="account-item">
                    <div class="account-header">
                        <div class="account-info">
                            <div class="account-name">${account.name}</div>
                            <div class="account-type">${account.account_type}</div>
                        </div>
                        <div class="account-actions">
                            <button class="btn btn-small btn-secondary btn-icon" onclick="editAccount(${account.id})">Edit</button>
                            <button class="btn btn-small btn-outline btn-icon" onclick="deleteAccount(${account.id})">Delete</button>
                        </div>
                    </div>
                    <div class="account-balance">${formatCurrency(account.balance)}</div>
                </div>
            `;
        }
    }).join('');
}

// Helper function to get top accounts by balance
function getTopAccountsByBalance(accountList, limit = 3) {
    return accountList
        .slice() // Create a copy to avoid mutating the original array
        .sort((a, b) => {
            // For credit accounts, we want to sort by available credit (higher is better)
            // For other accounts, sort by balance (higher is better)
            let balanceA, balanceB;
            
            if (a.account_type === 'credit') {
                balanceA = a.credit_limit ? (a.credit_limit - a.current_balance) : 0;
            } else {
                balanceA = a.balance || 0;
            }
            
            if (b.account_type === 'credit') {
                balanceB = b.credit_limit ? (b.credit_limit - b.current_balance) : 0;
            } else {
                balanceB = b.balance || 0;
            }
            
            return balanceB - balanceA; // Descending order
        })
        .slice(0, limit);
}

// Render transactions
function renderTransactions() {
    const dataToRender = filteredTransactions.length > 0 ? filteredTransactions : transactions;
    
    if (!dataToRender.length) {
        transactionsList.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center;">No transactions found.</p>';
        return;
    }
    
    const recentTransactions = dataToRender.slice(0, 10);
    transactionsList.innerHTML = recentTransactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-info">
                <h4>${transaction.description}</h4>
                <div class="transaction-meta">${transaction.category} • ${formatDate(transaction.date)} • ${transaction.account_name}</div>
            </div>
            <div class="transaction-amount ${transaction.transaction_type}">
                ${transaction.transaction_type === 'income' ? '+' : '-'}${formatCurrency(Math.abs(transaction.amount))}
            </div>
            <div class="transaction-actions">
                <button class="btn btn-small btn-secondary btn-icon" onclick="editTransaction(${transaction.id})">Edit</button>
                <button class="btn btn-small btn-outline btn-icon" onclick="deleteTransaction(${transaction.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// Render bills
function renderBills() {
    const dataToRender = filteredBills;
    
    const noBillsMessage = '<p style="color: rgba(255,255,255,0.7); text-align: center;">No bills found.</p>';
    
    if (!dataToRender.length) {
        if (billsList) billsList.innerHTML = noBillsMessage;
        const dedicatedBillsList = document.getElementById('dedicatedBillsList');
        if (dedicatedBillsList) dedicatedBillsList.innerHTML = noBillsMessage;
        return;
    }
    
    const currentDate = new Date();
    const sortedBills = dataToRender.sort((a, b) => a.day_of_month - b.day_of_month);
    
    const billsHTML = sortedBills.map(bill => {
        const currentMonthDueDate = new Date(bill.current_month_due_date);
        const isOverdue = bill.is_overdue;
        const isDueSoon = currentMonthDueDate <= new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000) && !bill.is_paid;
        
        // Format the day ordinal (1st, 2nd, 3rd, etc.)
        const dayOrdinal = bill.day_of_month + getOrdinalSuffix(bill.day_of_month);
        
        return `
            <div class="bill-item ${bill.is_paid ? 'paid' : ''} ${isOverdue ? 'overdue' : ''} ${isDueSoon ? 'due-soon' : ''}">
                <div class="bill-checkbox">
                    <input type="checkbox" id="bill-${bill.id}" ${bill.is_paid ? 'checked' : ''} 
                           onchange="toggleBillPaid(${bill.id})">
                    <label for="bill-${bill.id}"></label>
                </div>
                <div class="bill-info">
                    <h4>${bill.name}</h4>
                    <div class="bill-meta">
                        ${bill.category} • Due: ${dayOrdinal} of each month • ${bill.account_name}
                        ${bill.is_paid ? `<span class="paid-indicator">✓ Paid this month</span>` : ''}
                        ${isOverdue ? `<span class="overdue-indicator">⚠ Overdue</span>` : ''}
                    </div>
                </div>
                <div class="bill-amount ${bill.is_paid ? 'paid' : ''}">${formatCurrency(bill.amount)}</div>
                <div class="bill-actions">
                    <button class="btn btn-small btn-secondary btn-icon" onclick="editBill(${bill.id})">Edit</button>
                    <button class="btn btn-small btn-outline btn-icon" onclick="deleteBill(${bill.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Render to both dashboard and dedicated bills page
    if (billsList) billsList.innerHTML = billsHTML;
    const dedicatedBillsList = document.getElementById('dedicatedBillsList');
    if (dedicatedBillsList) dedicatedBillsList.innerHTML = billsHTML;
}

// Render savings goals
function renderSavingsGoals() {
    if (!savingsGoals.length) {
        savingsGoalsList.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center;">No savings goals found. Create your first goal!</p>';
        return;
    }
    
    savingsGoalsList.innerHTML = savingsGoals.map(goal => {
        const percentage = goal.percentage_complete;
        const isComplete = percentage >= 100;
        
        return `
            <div class="savings-goal-item ${isComplete ? 'completed' : ''}">
                <div class="goal-header">
                    <div class="goal-info">
                        <div class="goal-name">${goal.name}</div>
                        <div class="goal-progress-text">
                            ${formatCurrency(goal.current_amount)} of ${formatCurrency(goal.target_amount)} 
                            (${percentage.toFixed(1)}% complete)
                        </div>
                    </div>
                    <div class="goal-actions">
                        <button class="btn btn-small btn-primary btn-icon" onclick="manageFunds(${goal.id})">💰</button>
                        <button class="btn btn-small btn-secondary btn-icon" onclick="editSavingsGoal(${goal.id})">Edit</button>
                        <button class="btn btn-small btn-outline btn-icon" onclick="deleteSavingsGoal(${goal.id})">Delete</button>
                    </div>
                </div>
                <div class="goal-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%"></div>
                    </div>
                    <div class="goal-remaining">
                        ${isComplete ? 
                            '<span class="goal-complete">🎉 Goal Completed!</span>' : 
                            `${formatCurrency(goal.remaining_amount)} remaining`
                        }
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Update account selectors in modals
function updateAccountSelectors() {
    const selectors = ['transactionAccount', 'billAccount'];
    
    selectors.forEach(selectorId => {
        const selector = document.getElementById(selectorId);
        if (selector) {
            selector.innerHTML = accounts.map(account => 
                `<option value="${account.id}">${account.name} (${account.account_type})</option>`
            ).join('');
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Add account buttons (multiple instances)
    document.getElementById('addAccountBtn')?.addEventListener('click', () => {
        openModal('accountModal');
    });
    document.getElementById('addAccountBtn2')?.addEventListener('click', () => {
        openModal('accountModal');
    });
    
    // Add transaction buttons (multiple instances)
    document.getElementById('addTransactionBtn')?.addEventListener('click', () => {
        openModal('transactionModal');
    });
    document.getElementById('addTransactionBtn2')?.addEventListener('click', () => {
        openModal('transactionModal');
    });
    
    // Add bill buttons (multiple instances)
    document.getElementById('addBillBtn')?.addEventListener('click', () => {
        openModal('billModal');
    });
    document.getElementById('addBillBtn2')?.addEventListener('click', () => {
        openModal('billModal');
    });
    
    // Reset bills buttons (multiple instances)
    document.getElementById('resetBillsBtn')?.addEventListener('click', resetAllBills);
    document.getElementById('resetBillsBtn2')?.addEventListener('click', resetAllBills);
    
    // Add savings goal buttons (multiple instances)
    document.getElementById('addSavingsGoalBtn')?.addEventListener('click', () => {
        openModal('savingsGoalModal');
    });
    document.getElementById('addSavingsGoalBtn2')?.addEventListener('click', () => {
        openModal('savingsGoalModal');
    });
    
    // Category management buttons (multiple instances)
    document.getElementById('manageCategoriesBtn')?.addEventListener('click', showCategoryManagement);
    document.getElementById('manageCategoriesBtn2')?.addEventListener('click', showCategoryManagement);
    
    // Category action buttons
    document.getElementById('renameCategoryBtn')?.addEventListener('click', renameCategory);
    document.getElementById('deleteCategoryBtn')?.addEventListener('click', deleteCategory);
    
    // Category filters
    document.getElementById('transactionCategoryFilter')?.addEventListener('change', (e) => {
        filterTransactionsByCategory(e.target.value);
    });
    
    document.getElementById('billCategoryFilter')?.addEventListener('change', (e) => {
        filterBillsByCategory(e.target.value);
    });
    
    document.getElementById('dedicatedBillCategoryFilter')?.addEventListener('change', (e) => {
        filterBillsByCategory(e.target.value);
    });
    
    // Transaction management event listeners
    document.getElementById('transactionSearch')?.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        applyTransactionFilters();
    });
    
    document.getElementById('transactionTypeFilter')?.addEventListener('change', (e) => {
        typeFilter = e.target.value;
        applyTransactionFilters();
    });
    
    document.getElementById('transactionManagementCategoryFilter')?.addEventListener('change', (e) => {
        categoryFilter = e.target.value;
        applyTransactionFilters();
    });
    
    // Pagination event listeners
    document.getElementById('prevPage')?.addEventListener('click', () => {
        goToPage(currentPage - 1);
    });
    
    document.getElementById('nextPage')?.addEventListener('click', () => {
        goToPage(currentPage + 1);
    });
    
    // Account form - use onsubmit instead of addEventListener to avoid conflicts
    const accountForm = document.getElementById('accountForm');
    if (accountForm) {
        accountForm.onsubmit = handleAccountSubmit;
    }
    
    // Account type change handler
    document.getElementById('accountType')?.addEventListener('change', (e) => {
        if (e.target.value === 'credit') {
            showCreditFields();
        } else {
            hideCreditFields();
        }
    });
    
    // Transaction form
    document.getElementById('transactionForm')?.addEventListener('submit', handleTransactionSubmit);
    
    // Bill form
    document.getElementById('billForm')?.addEventListener('submit', handleBillSubmit);
    
    // Savings goal form
    document.getElementById('savingsGoalForm')?.addEventListener('submit', handleSavingsGoalSubmit);
    
    // Goal funds form
    document.getElementById('goalFundsForm')?.addEventListener('submit', handleGoalFundsSubmit);
    
    // Handle "View All" navigation links
    document.querySelectorAll('.nav-item-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            if (section && window.sidebarNav) {
                window.sidebarNav.navigateToSection(section);
            }
        });
    });
}

// Handle account form submission
async function handleAccountSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const accountData = {
        name: formData.get('name'),
        account_type: formData.get('account_type'),
        balance: formData.get('balance') || 0
    };
    
    // Add credit account specific fields
    if (formData.get('account_type') === 'credit') {
        accountData.credit_limit = formData.get('credit_limit') || null;
        accountData.current_balance = formData.get('current_balance') || 0;
    }
    
    try {
        await apiRequest('/api/accounts', {
            method: 'POST',
            body: JSON.stringify(accountData)
        });
        
        showMessage('Account created successfully!');
        closeModal('accountModal');
        await loadAccounts();
    } catch (error) {
        showMessage('Failed to create account', 'error');
    }
}

// Handle transaction form submission
async function handleTransactionSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const transactionData = {
        description: formData.get('description'),
        amount: formData.get('amount'),
        transaction_type: formData.get('transaction_type'),
        category: formData.get('category'),
        account_id: formData.get('account_id')
    };
    
    // Add date if provided
    if (formData.get('date')) {
        transactionData.date = formData.get('date');
    }
    
    try {
        await apiRequest('/api/transactions', {
            method: 'POST',
            body: JSON.stringify(transactionData)
        });
        
        showMessage('Transaction added successfully!');
        closeModal('transactionModal');
        await Promise.all([loadTransactions(), loadAccounts(), loadCategories()]);
    } catch (error) {
        showMessage('Failed to add transaction', 'error');
    }
}

// Handle bill form submission
async function handleBillSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const billData = {
        name: formData.get('name'),
        amount: formData.get('amount'),
        category: formData.get('category'),
        account_id: formData.get('account_id'),
        day_of_month: formData.get('day_of_month')
    };
    
    try {
        await apiRequest('/api/bills', {
            method: 'POST',
            body: JSON.stringify(billData)
        });
        
        showMessage('Bill added successfully!');
        closeModal('billModal');
        await Promise.all([loadBills(), loadCategories()]);
    } catch (error) {
        showMessage('Failed to add bill', 'error');
    }
}

// Handle savings goal form submission
async function handleSavingsGoalSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const goalData = {
        name: formData.get('name'),
        target_amount: formData.get('target_amount'),
        current_amount: formData.get('current_amount') || 0
    };
    
    try {
        await apiRequest('/api/savings-goals', {
            method: 'POST',
            body: JSON.stringify(goalData)
        });
        
        showMessage('Savings goal created successfully!');
        closeModal('savingsGoalModal');
        await loadSavingsGoals();
    } catch (error) {
        showMessage('Failed to create savings goal', 'error');
    }
}

// Handle goal funds form submission
async function handleGoalFundsSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const action = formData.get('action');
    const amount = formData.get('amount');
    const goalId = e.target.dataset.goalId;
    
    try {
        const endpoint = action === 'add' ? 
            `/api/savings-goals/${goalId}/add-funds` : 
            `/api/savings-goals/${goalId}/withdraw-funds`;
            
        const result = await apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify({ amount: parseFloat(amount) })
        });
        
        showMessage(result.message);
        closeModal('goalFundsModal');
        await loadSavingsGoals();
    } catch (error) {
        showMessage('Failed to update funds', 'error');
    }
}

// Toggle bill paid status
async function toggleBillPaid(billId) {
    try {
        const result = await apiRequest(`/api/bills/${billId}/toggle-paid`, {
            method: 'POST'
        });
        
        if (result.success) {
            showMessage(result.message || (result.is_paid ? 'Bill marked as paid for this month!' : 'Bill marked as unpaid for this month!'));
            await Promise.all([loadBills(), loadTransactions(), loadAccounts(), loadCategories()]);
        }
    } catch (error) {
        showMessage('Failed to update bill status', 'error');
        // Reload to ensure UI is in sync
        await loadBills();
    }
}

// Reset all bills
async function resetAllBills() {
    if (!confirm('Are you sure you want to reset all bills to unpaid? This action cannot be undone.')) {
        return;
    }
    
    try {
        const result = await apiRequest('/api/bills/reset-all', {
            method: 'POST'
        });
        
        if (result.success) {
            showMessage('All bills have been reset to unpaid!');
            await Promise.all([loadBills(), loadCategories()]);
        }
    } catch (error) {
        showMessage('Failed to reset bills', 'error');
    }
}

// Edit account
async function editAccount(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    // Populate form
    document.getElementById('accountName').value = account.name;
    document.getElementById('accountType').value = account.account_type;
    document.getElementById('accountBalance').value = account.balance;
    
    // Handle credit account fields
    if (account.account_type === 'credit') {
        document.getElementById('creditLimit').value = account.credit_limit || '';
        document.getElementById('currentBalance').value = account.current_balance || 0;
        showCreditFields();
    } else {
        hideCreditFields();
    }
    
    document.getElementById('accountModalTitle').textContent = 'Edit Account';
    
    // Store the original handler and replace it temporarily
    const form = document.getElementById('accountForm');
    const originalHandler = form.onsubmit;
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const accountData = {
            name: formData.get('name'),
            account_type: formData.get('account_type'),
            balance: formData.get('balance')
        };
        
        // Add credit account specific fields
        if (formData.get('account_type') === 'credit') {
            accountData.credit_limit = formData.get('credit_limit') || null;
            accountData.current_balance = formData.get('current_balance') || 0;
        }
        
        try {
            await apiRequest(`/api/accounts/${accountId}`, {
                method: 'PUT',
                body: JSON.stringify(accountData)
            });
            
            showMessage('Account updated successfully!');
            closeModal('accountModal');
            await loadAccounts();
            
            // Restore original handler after successful update
            form.onsubmit = originalHandler;
            document.getElementById('accountModalTitle').textContent = 'Add Account';
            // Clear form
            form.reset();
            hideCreditFields();
        } catch (error) {
            showMessage('Failed to update account', 'error');
        }
    };
    
    openModal('accountModal');
}

// Delete account
async function deleteAccount(accountId) {
    if (!confirm('Are you sure you want to delete this account? This will also delete all associated transactions.')) {
        return;
    }
    
    try {
        await apiRequest(`/api/accounts/${accountId}`, {
            method: 'DELETE'
        });
        
        showMessage('Account deleted successfully!');
        await Promise.all([loadAccounts(), loadTransactions()]);
    } catch (error) {
        showMessage('Failed to delete account', 'error');
    }
}

// Edit bill
async function editBill(billId) {
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;
    
    // Populate form
    document.getElementById('billName').value = bill.name;
    document.getElementById('billAmount').value = bill.amount;
    document.getElementById('billCategory').value = bill.category;
    document.getElementById('billAccount').value = bill.account_id;
    document.getElementById('billDayOfMonth').value = bill.day_of_month;
    document.getElementById('billModalTitle').textContent = 'Edit Bill';
    
    // Update form handler
    const form = document.getElementById('billForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const billData = {
            name: formData.get('name'),
            amount: formData.get('amount'),
            category: formData.get('category'),
            account_id: formData.get('account_id'),
            day_of_month: formData.get('day_of_month')
        };
        
        try {
            await apiRequest(`/api/bills/${billId}`, {
                method: 'PUT',
                body: JSON.stringify(billData)
            });
            
            showMessage('Bill updated successfully!');
            closeModal('billModal');
            await Promise.all([loadBills(), loadCategories()]);
        } catch (error) {
            showMessage('Failed to update bill', 'error');
        }
        
        // Restore original handler
        form.onsubmit = handleBillSubmit;
        document.getElementById('billModalTitle').textContent = 'Add Bill';
    };
    
    openModal('billModal');
}

// Delete bill
async function deleteBill(billId) {
    if (!confirm('Are you sure you want to delete this bill?')) {
        return;
    }
    
    try {
        await apiRequest(`/api/bills/${billId}`, {
            method: 'DELETE'
        });
        
        showMessage('Bill deleted successfully!');
        await Promise.all([loadBills(), loadCategories()]);
    } catch (error) {
        showMessage('Failed to delete bill', 'error');
    }
}

// Edit transaction
async function editTransaction(transactionId) {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    // Populate form
    document.getElementById('transactionDescription').value = transaction.description;
    document.getElementById('transactionAmount').value = Math.abs(transaction.amount);
    document.getElementById('transactionType').value = transaction.transaction_type;
    document.getElementById('transactionCategory').value = transaction.category;
    document.getElementById('transactionAccount').value = transaction.account_id;
    document.getElementById('transactionDate').value = transaction.date.split('T')[0];
    document.getElementById('transactionModalTitle').textContent = 'Edit Transaction';
    
    // Update form handler
    const form = document.getElementById('transactionForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const transactionData = {
            description: formData.get('description'),
            amount: formData.get('amount'),
            transaction_type: formData.get('transaction_type'),
            category: formData.get('category'),
            account_id: formData.get('account_id')
        };
        
        // Add date if provided
        if (formData.get('date')) {
            transactionData.date = formData.get('date');
        }
        
        try {
            await apiRequest(`/api/transactions/${transactionId}`, {
                method: 'PUT',
                body: JSON.stringify(transactionData)
            });
            
            showMessage('Transaction updated successfully!');
            closeModal('transactionModal');
            await Promise.all([loadTransactions(), loadAccounts(), loadCategories()]);
        } catch (error) {
            showMessage('Failed to update transaction', 'error');
        }
        
        // Restore original handler
        form.onsubmit = handleTransactionSubmit;
        document.getElementById('transactionModalTitle').textContent = 'Add Transaction';
    };
    
    openModal('transactionModal');
}

// Delete transaction
async function deleteTransaction(transactionId) {
    if (!confirm('Are you sure you want to delete this transaction? This will also update your account balance.')) {
        return;
    }
    
    try {
        await apiRequest(`/api/transactions/${transactionId}`, {
            method: 'DELETE'
        });
        
        showMessage('Transaction deleted successfully!');
        await Promise.all([loadTransactions(), loadAccounts(), loadCategories()]);
    } catch (error) {
        showMessage('Failed to delete transaction', 'error');
    }
}

// Load categories
async function loadCategories() {
    try {
        categories = await apiRequest('/api/categories');
        renderCategories();
        updateCategoryFilters();
    } catch (error) {
        showMessage('Failed to load categories', 'error');
    }
}

// Load bill categories (called by sidebar for bills page)
async function loadBillCategories() {
    await loadCategories();
}

// Render categories
function renderCategories() {
    if (!categories.length) {
        categoriesList.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center;">No categories found. Add transactions or bills to create categories!</p>';
        return;
    }
    
    categoriesList.innerHTML = categories.map(category => `
        <div class="category-item" onclick="filterByCategory('${category.name}')">
            <div class="category-name">${category.name}</div>
            <div class="category-stats">
                <div class="category-stat">
                    <span class="icon">💳</span>
                    <span>${category.transaction_count} transactions</span>
                </div>
                <div class="category-stat">
                    <span class="icon">📋</span>
                    <span>${category.bill_count} bills</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Update category filter dropdowns
function updateCategoryFilters() {
    const transactionFilter = document.getElementById('transactionCategoryFilter');
    const billFilter = document.getElementById('billCategoryFilter');
    const dedicatedBillFilter = document.getElementById('dedicatedBillCategoryFilter');
    const categorySelect = document.getElementById('categorySelect');
    const transactionManagementFilter = document.getElementById('transactionManagementCategoryFilter');
    
    const categoryOptions = categories.map(cat => 
        `<option value="${cat.name}">${cat.name} (${cat.total_count})</option>`
    ).join('');
    
    if (transactionFilter) {
        transactionFilter.innerHTML = '<option value="">All Categories</option>' + categoryOptions;
    }
    
    if (billFilter) {
        billFilter.innerHTML = '<option value="">All Categories</option>' + categoryOptions;
    }
    
    if (dedicatedBillFilter) {
        dedicatedBillFilter.innerHTML = '<option value="">All Categories</option>' + categoryOptions;
    }
    
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">Select a category...</option>' + categoryOptions;
    }
    
    if (transactionManagementFilter) {
        transactionManagementFilter.innerHTML = '<option value="">All Categories</option>' + categoryOptions;
    }
}

// Filter transactions by category
function filterTransactionsByCategory(categoryName) {
    if (!categoryName) {
        filteredTransactions = [];
    } else {
        filteredTransactions = transactions.filter(t => t.category === categoryName);
    }
    renderTransactions();
}

// Filter bills by category
function filterBillsByCategory(categoryName) {
    if (!categoryName) {
        filteredBills = bills;
    } else {
        filteredBills = bills.filter(b => b.category === categoryName);
    }
    renderBills();
}

// Filter by category (from category card click)
function filterByCategory(categoryName) {
    // Update both filters
    document.getElementById('transactionCategoryFilter').value = categoryName;
    document.getElementById('billCategoryFilter').value = categoryName;
    
    // Apply filters
    filterTransactionsByCategory(categoryName);
    filterBillsByCategory(categoryName);
    
    showMessage(`Filtered by category: ${categoryName}`, 'success');
}

// Show category management modal
function showCategoryManagement() {
    // Load category stats
    const statsContainer = document.getElementById('categoryStatsContainer');
    statsContainer.innerHTML = categories.map(category => `
        <div class="category-stat-item">
            <div class="category-stat-name">${category.name}</div>
            <div class="category-stat-counts">
                ${category.transaction_count} transactions, ${category.bill_count} bills
            </div>
        </div>
    `).join('');
    
    openModal('categoryModal');
}

// Rename category
async function renameCategory() {
    const selectedCategory = document.getElementById('categorySelect').value;
    if (!selectedCategory) {
        showMessage('Please select a category first', 'error');
        return;
    }
    
    document.getElementById('categoryActionTitle').textContent = 'Rename Category';
    document.getElementById('categoryActionContent').innerHTML = `
        <div class="form-group">
            <label>Current Name: <strong>${selectedCategory}</strong></label>
        </div>
        <div class="form-group">
            <label for="newCategoryName">New Name</label>
            <input type="text" id="newCategoryName" class="form-control" required>
        </div>
    `;
    
    document.getElementById('categoryActionForm').onsubmit = async (e) => {
        e.preventDefault();
        const newName = document.getElementById('newCategoryName').value.trim();
        
        if (!newName) {
            showMessage('Please enter a new category name', 'error');
            return;
        }
        
        try {
            await apiRequest(`/api/categories/${encodeURIComponent(selectedCategory)}/rename`, {
                method: 'POST',
                body: JSON.stringify({ new_name: newName })
            });
            
            showMessage(`Category renamed to "${newName}"!`);
            closeModal('categoryActionModal');
            closeModal('categoryModal');
            await Promise.all([loadTransactions(), loadBills(), loadCategories()]);
        } catch (error) {
            showMessage('Failed to rename category', 'error');
        }
    };
    
    openModal('categoryActionModal');
}

// Delete/merge category
async function deleteCategory() {
    const selectedCategory = document.getElementById('categorySelect').value;
    if (!selectedCategory) {
        showMessage('Please select a category first', 'error');
        return;
    }
    
    const otherCategories = categories.filter(c => c.name !== selectedCategory);
    const categoryOptions = otherCategories.map(cat => 
        `<option value="${cat.name}">${cat.name}</option>`
    ).join('');
    
    document.getElementById('categoryActionTitle').textContent = 'Delete/Merge Category';
    document.getElementById('categoryActionContent').innerHTML = `
        <div class="form-group">
            <label>Category to Delete: <strong>${selectedCategory}</strong></label>
        </div>
        <div class="form-group">
            <label for="mergeInto">Merge into (optional)</label>
            <select id="mergeInto" class="form-control">
                <option value="">Move to "Uncategorized"</option>
                ${categoryOptions}
            </select>
        </div>
        <p style="color: rgba(255,255,255,0.7); font-size: 0.9rem;">
            If you select a category to merge into, all transactions and bills will be moved there. 
            Otherwise, they will be moved to "Uncategorized".
        </p>
    `;
    
    document.getElementById('categoryActionForm').onsubmit = async (e) => {
        e.preventDefault();
        const mergeInto = document.getElementById('mergeInto').value;
        
        if (!confirm(`Are you sure you want to delete the category "${selectedCategory}"? This action cannot be undone.`)) {
            return;
        }
        
        try {
            await apiRequest(`/api/categories/${encodeURIComponent(selectedCategory)}`, {
                method: 'DELETE',
                body: JSON.stringify({ merge_into: mergeInto })
            });
            
            showMessage(mergeInto ? 
                `Category "${selectedCategory}" merged into "${mergeInto}"!` : 
                `Category "${selectedCategory}" deleted, items moved to "Uncategorized"!`
            );
            closeModal('categoryActionModal');
            closeModal('categoryModal');
            await Promise.all([loadTransactions(), loadBills(), loadCategories()]);
        } catch (error) {
            showMessage('Failed to delete category', 'error');
        }
    };
    
    openModal('categoryActionModal');
}

// Transaction Management Functions
function renderAllTransactions() {
    if (!allTransactionsList) return;
    
    const filteredData = getFilteredTransactions();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    if (!paginatedData.length) {
        allTransactionsList.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center;">No transactions found.</p>';
        updatePaginationInfo(0);
        return;
    }
    
    allTransactionsList.innerHTML = paginatedData.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-info">
                <h4>${transaction.description}</h4>
                <div class="transaction-meta">${transaction.category} • ${formatDate(transaction.date)} • ${transaction.account_name}</div>
            </div>
            <div class="transaction-amount ${transaction.transaction_type}">
                ${transaction.transaction_type === 'income' ? '+' : '-'}${formatCurrency(Math.abs(transaction.amount))}
            </div>
            <div class="transaction-actions">
                <button class="btn btn-small btn-secondary btn-icon" onclick="editTransaction(${transaction.id})">Edit</button>
                <button class="btn btn-small btn-outline btn-icon" onclick="deleteTransaction(${transaction.id})">Delete</button>
            </div>
        </div>
    `).join('');
    
    updatePaginationInfo(filteredData.length);
}

function getFilteredTransactions() {
    let filtered = allTransactions;
    
    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(t => 
            t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.account_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    // Apply type filter
    if (typeFilter) {
        filtered = filtered.filter(t => t.transaction_type === typeFilter);
    }
    
    // Apply category filter
    if (categoryFilter) {
        filtered = filtered.filter(t => t.category === categoryFilter);
    }
    
    return filtered;
}

function updateTransactionStats() {
    const filteredData = getFilteredTransactions();
    
    const totalCount = filteredData.length;
    const totalIncome = filteredData.filter(t => t.transaction_type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = filteredData.filter(t => t.transaction_type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const netAmount = totalIncome - totalExpense;
    
    document.getElementById('totalTransactions').textContent = totalCount;
    document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
    document.getElementById('totalExpense').textContent = formatCurrency(totalExpense);
    document.getElementById('netAmount').textContent = formatCurrency(netAmount);
    
    // Update net amount color
    const netElement = document.getElementById('netAmount').parentElement;
    netElement.className = `stat-card ${netAmount >= 0 ? 'income' : 'expense'}`;
}

function updatePaginationInfo(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages || 1}`;
    
    // Update button states
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

function goToPage(page) {
    const totalItems = getFilteredTransactions().length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderAllTransactions();
    }
}

function applyTransactionFilters() {
    currentPage = 1; // Reset to first page when applying filters
    renderAllTransactions();
    updateTransactionStats();
}

// Show credit account fields
function showCreditFields() {
    document.getElementById('creditLimitGroup').style.display = 'block';
    document.getElementById('currentBalanceGroup').style.display = 'block';
}

// Hide credit account fields
function hideCreditFields() {
    document.getElementById('creditLimitGroup').style.display = 'none';
    document.getElementById('currentBalanceGroup').style.display = 'none';
    // Clear the values when hiding
    document.getElementById('creditLimit').value = '';
    document.getElementById('currentBalance').value = '0';
}

// Edit savings goal
async function editSavingsGoal(goalId) {
    const goal = savingsGoals.find(g => g.id === goalId);
    if (!goal) return;
    
    // Populate form
    document.getElementById('goalName').value = goal.name;
    document.getElementById('targetAmount').value = goal.target_amount;
    document.getElementById('currentAmount').value = goal.current_amount;
    document.getElementById('savingsGoalModalTitle').textContent = 'Edit Savings Goal';
    
    // Update form handler
    const form = document.getElementById('savingsGoalForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const goalData = {
            name: formData.get('name'),
            target_amount: formData.get('target_amount'),
            current_amount: formData.get('current_amount')
        };
        
        try {
            await apiRequest(`/api/savings-goals/${goalId}`, {
                method: 'PUT',
                body: JSON.stringify(goalData)
            });
            
            showMessage('Savings goal updated successfully!');
            closeModal('savingsGoalModal');
            await loadSavingsGoals();
        } catch (error) {
            showMessage('Failed to update savings goal', 'error');
        }
        
        // Restore original handler
        form.onsubmit = handleSavingsGoalSubmit;
        document.getElementById('savingsGoalModalTitle').textContent = 'Add Savings Goal';
        form.reset();
    };
    
    openModal('savingsGoalModal');
}

// Delete savings goal
async function deleteSavingsGoal(goalId) {
    if (!confirm('Are you sure you want to delete this savings goal?')) {
        return;
    }
    
    try {
        await apiRequest(`/api/savings-goals/${goalId}`, {
            method: 'DELETE'
        });
        
        showMessage('Savings goal deleted successfully!');
        await loadSavingsGoals();
    } catch (error) {
        showMessage('Failed to delete savings goal', 'error');
    }
}

// Manage funds for a savings goal
function manageFunds(goalId) {
    const goal = savingsGoals.find(g => g.id === goalId);
    if (!goal) return;
    
    document.getElementById('goalFundsModalTitle').textContent = `Manage Funds - ${goal.name}`;
    document.getElementById('goalFundsForm').dataset.goalId = goalId;
    document.getElementById('fundsAmount').value = '';
    document.getElementById('fundsAction').value = 'add';
    
    openModal('goalFundsModal');
}

// Load user profile data
async function loadUserProfile() {
    try {
        currentUser = await apiRequest('/api/user/profile');
        updateUserInterface();
    } catch (error) {
        console.error('Failed to load user profile:', error);
    }
}

// Update UI elements with real user data
function updateUserInterface() {
    if (!currentUser) return;
    
    // Update sidebar user info
    const sidebarUsername = document.getElementById('sidebarUsername');
    const userAvatar = document.getElementById('userAvatar');
    
    if (sidebarUsername) {
        sidebarUsername.textContent = currentUser.username;
    }
    
    if (userAvatar) {
        // Set avatar to first letter of username
        userAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
    }
    
    // Update account settings
    const settingsUsername = document.getElementById('settingsUsername');
    const settingsEmail = document.getElementById('settingsEmail');
    
    if (settingsUsername) {
        settingsUsername.value = currentUser.username;
    }
    
    if (settingsEmail) {
        settingsEmail.value = currentUser.email;
    }
}