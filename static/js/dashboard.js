// Dashboard state
let accounts = [];
let transactions = [];
let bills = [];
let categories = [];
let filteredTransactions = [];
let filteredBills = [];

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
const allTransactionsList = document.getElementById('allTransactionsList');

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboardData();
    setupEventListeners();
});

// Load all dashboard data
async function loadDashboardData() {
    try {
        await Promise.all([
            loadAccounts(),
            loadTransactions(),
            loadBills(),
            loadCategories()
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

// Render accounts
function renderAccounts() {
    if (!accounts.length) {
        accountsList.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center;">No accounts found. Create your first account!</p>';
        return;
    }
    
    accountsList.innerHTML = accounts.map(account => `
        <div class="account-item">
            <div class="account-header">
                <div>
                    <div class="account-name">${account.name}</div>
                    <div class="account-type">${account.account_type}</div>
                </div>
            </div>
            <div class="account-balance">${formatCurrency(account.balance)}</div>
            <div class="account-actions">
                <button class="btn btn-small btn-secondary btn-icon" onclick="editAccount(${account.id})">Edit</button>
                <button class="btn btn-small btn-outline btn-icon" onclick="deleteAccount(${account.id})">Delete</button>
            </div>
        </div>
    `).join('');
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
    
    if (!dataToRender.length) {
        billsList.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center;">No bills found.</p>';
        return;
    }
    
    const currentDate = new Date();
    const sortedBills = dataToRender.sort((a, b) => a.day_of_month - b.day_of_month);
    
    billsList.innerHTML = sortedBills.map(bill => {
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
    // Add account button
    document.getElementById('addAccountBtn')?.addEventListener('click', () => {
        openModal('accountModal');
    });
    
    // Add transaction button
    document.getElementById('addTransactionBtn')?.addEventListener('click', () => {
        openModal('transactionModal');
    });
    
    // Add bill button
    document.getElementById('addBillBtn')?.addEventListener('click', () => {
        openModal('billModal');
    });
    
    // Reset bills button
    document.getElementById('resetBillsBtn')?.addEventListener('click', resetAllBills);
    
    // Category management button
    document.getElementById('manageCategoriesBtn')?.addEventListener('click', showCategoryManagement);
    
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
    
    // Account form
    document.getElementById('accountForm')?.addEventListener('submit', handleAccountSubmit);
    
    // Transaction form
    document.getElementById('transactionForm')?.addEventListener('submit', handleTransactionSubmit);
    
    // Bill form
    document.getElementById('billForm')?.addEventListener('submit', handleBillSubmit);
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
    document.getElementById('accountModalTitle').textContent = 'Edit Account';
    
    // Update form handler
    const form = document.getElementById('accountForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const accountData = {
            name: formData.get('name'),
            account_type: formData.get('account_type'),
            balance: formData.get('balance')
        };
        
        try {
            await apiRequest(`/api/accounts/${accountId}`, {
                method: 'PUT',
                body: JSON.stringify(accountData)
            });
            
            showMessage('Account updated successfully!');
            closeModal('accountModal');
            await loadAccounts();
        } catch (error) {
            showMessage('Failed to update account', 'error');
        }
        
        // Restore original handler
        form.onsubmit = handleAccountSubmit;
        document.getElementById('accountModalTitle').textContent = 'Add Account';
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